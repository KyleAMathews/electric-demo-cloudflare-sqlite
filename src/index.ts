import { DurableObject } from "cloudflare:workers"
const { match } = require(`path-to-regexp`)
import {
  ShapeStream,
  Shape,
  isChangeMessage,
  ControlMessage,
  Message,
  Offset,
} from "@electric-sql/client"

/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

/** A Durable Object's behavior is defined in an exported Javascript class */
export class ElectricSqliteDemo extends DurableObject {
  sql: SqlStorage
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    console.log(`new durable object`, ctx, env)
    this.sql = ctx.storage.sql

    this.sql.exec(`CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  description TEXT,
  plan TEXT NOT NULL
);`)

    this.sql.exec(`CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations (id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL
);`)

    this.sql.exec(`CREATE TABLE IF NOT EXISTS shape_sync_metadata (
  shape_name TEXT UNIQUE,
  offset TEXT,
  shape_id TEXT
);`)
  }

  /**
   * The Durable Object exposes an RPC method sayHello which will be invoked when when a Durable
   *  Object instance receives a request from a Worker via the same method invocation on the stub
   *
   * @param name - The name provided to a Durable Object instance from a Worker
   * @returns The greeting to be sent back to the Worker
   */
  async getOrgInfo(id: string): Promise<string> {
    const ORG_SHAPE = `org_shape`
    const USER_SHAPE = `user_shape`
    // Get shape info
    const shapeMetadata = this.sql
      .exec(`SELECT * FROM shape_sync_metadata where shape_id IS NOT NULL;`)
      .toArray()
    console.log({ shapeMetadata })

    const userStreamMetadata =
      shapeMetadata.find((s) => s.shape_name === USER_SHAPE) || {}
    const orgStreamMetadata =
      shapeMetadata.find((s) => s.shape_name === ORG_SHAPE) || {}

    let orgLastOffset = orgStreamMetadata?.offset as Offset | undefined
    let userLastOffset = userStreamMetadata?.offset as Offset | undefined
    let orgShapeId = orgStreamMetadata?.shape_id as string | undefined
    let userShapeId = userStreamMetadata?.shape_id as string | undefined

    const orgStream = new ShapeStream({
      url: `http://localhost:3000/v1/shape/organizations`,
      where: `id = '${id}'`,
      subscribe: false,
      shapeId: orgShapeId,
      offset: orgLastOffset,
    })

    orgStream.subscribe(async (messages: Message[]) => {
      // console.log(`org messages`, messages)
      for (const message of messages) {
        if (isChangeMessage(message)) {
          orgLastOffset = message.offset
          if (message.headers.operation === `insert`) {
            console.log({ message })
            console.log([
              message.value.id,
              message.value.name,
              message.value.domain,
              message.value.description,
              message.value.plan,
            ])
            this.sql.exec(
              `
  INSERT INTO organizations (id, name, domain, description, plan)
  VALUES ('${message.value.id}', '${message.value.name}', '${message.value.domain}', '${message.value.description}', '${message.value.plan}')
`
            )
          }
        }
      }
      orgShapeId = orgStream.shapeId
    })

    const userStream = new ShapeStream({
      url: `http://localhost:3000/v1/shape/users`,
      where: `organization_id = '${id}'`,
      subscribe: false,
      shapeId: userShapeId,
      offset: userLastOffset,
    })

    userStream.subscribe(async (messages) => {
      // console.log(`users messages`, messages)
      for (const message of messages) {
        if (isChangeMessage(message)) {
          userLastOffset = message.offset
          if (message.headers.operation === `insert`) {
            console.log({ message })
            console.log([
              message.value.id,
              message.value.organization_id,
              message.value.name,
              message.value.email,
              message.value.role,
            ])
            this.sql.exec(
              `
  INSERT INTO users (id, organization_id, name, email, role)
  VALUES ('${message.value.id}', '${message.value.organization_id}', '${message.value.name}', '${message.value.email}', '${message.value.role}')
`
            )
          }
        }
      }
      userShapeId = userStream.shapeId
    })

    const userShape = new Shape(userStream)
    const orgShape = new Shape(orgStream)

    const startTime = Date.now()
    await Promise.all([userShape.value, orgShape.value])
    console.timeEnd(`sync`)
    const endTime = Date.now()
    const elapsedTime = endTime - startTime
    console.log(`Syncing time: ${elapsedTime} ms`)

    this.sql.exec(`
INSERT INTO shape_sync_metadata (shape_name, offset, shape_id)
VALUES ('${ORG_SHAPE}', '${orgLastOffset}', '${orgShapeId}')
ON CONFLICT(shape_name) DO UPDATE SET
    shape_id = excluded.shape_id,
    offset = excluded.offset;
`)

    // Upsert for the second row
    this.sql.exec(`
INSERT INTO shape_sync_metadata (shape_name, offset, shape_id)
VALUES ('${USER_SHAPE}', '${userLastOffset}', '${userShapeId}')
ON CONFLICT(shape_name) DO UPDATE SET
    shape_id = excluded.shape_id,
    offset = excluded.offset;
`)

    console.log(`shapeids`, userStream.shapeId, orgStream.shapeId)

    // Get org and users.
    const org = this.sql.exec(`SELECT * from organizations;`).toArray()
    const users = this.sql.exec(`SELECT * from users;`).toArray()

    return JSON.stringify({ org, users }, null, 4)
    // const firstRow = this.sql
    //   .exec(`SELECT * FROM artist ORDER BY artistname DESC;`)
    //   .toArray()[0]
    //
    // return JSON.stringify(firstRow, null, 4)
  }
}

export default {
  /**
   * This is the standard fetch handler for a Cloudflare Worker
   *
   * @param request - The request submitted to the Worker from the client
   * @param env - The interface to reference bindings declared in wrangler.toml
   * @param ctx - The execution context of the Worker
   * @returns The response to be sent back to the client
   */
  async fetch(request, env): Promise<Response> {
    const fn = match(`/org/:id`)

    const pathname = new URL(request.url).pathname
    const matches = fn(pathname)

    if (!matches) {
      return new Response(`no org`, { status: 400 })
    }

    console.log({ pathname, matches })

    // // We will create a `DurableObjectId` using the pathname from the Worker request
    // // This id refers to a unique instance of our 'ElectricSqliteDemo' class above
    const id: DurableObjectId = env.ELECTRIC_SQLITE_DEMO.idFromName(
      matches.params.id
    )
    //
    // console.log(`durable object id`, id)

    // This stub creates a communication channel with the Durable Object instance
    // The Durable Object constructor will be invoked upon the first call for a given id
    const stub = env.ELECTRIC_SQLITE_DEMO.get(id)

    const greeting = await stub.getOrgInfo(matches.params.id)

    return new Response(greeting)
  },
} satisfies ExportedHandler<Env>
