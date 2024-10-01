import { DurableObject } from "cloudflare:workers"
import { match } from "path-to-regexp"
import {
  ShapeStream,
  Shape,
  isChangeMessage,
  Message,
  Offset,
} from "@electric-sql/client"

export class ElectricSqliteDemo extends DurableObject {
  sql: SqlStorage
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
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

  /*
   * Sync any updates from Electric & then query for org/user info and return
   */
  async getOrgInfo(id: string): Promise<string> {
    const ORG_SHAPE = `org_shape`
    const USER_SHAPE = `user_shape`

    // Get shape info
    const shapeMetadata = this.sql
      .exec(`SELECT * FROM shape_sync_metadata where shape_id;`)
      .toArray()
    // console.log({ shapeMetadata })

    const userStreamMetadata =
      shapeMetadata.find((s) => s.shape_name === USER_SHAPE) || {}
    const orgStreamMetadata =
      shapeMetadata.find((s) => s.shape_name === ORG_SHAPE) || {}

    let orgLastOffset = (orgStreamMetadata?.offset || -1) as Offset
    let userLastOffset = (userStreamMetadata?.offset || -1) as Offset
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
      for (const message of messages) {
        if (isChangeMessage(message)) {
          orgLastOffset = message.offset
          if (message.headers.operation === `insert`) {
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
      for (const message of messages) {
        if (isChangeMessage(message)) {
          userLastOffset = message.offset
          if (message.headers.operation === `insert`) {
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

    // Get org and users.
    const org = this.sql.exec(`SELECT * from organizations;`).toArray()
    const users = this.sql.exec(`SELECT * from users;`).toArray()

    return JSON.stringify({ org, users }, null, 4)
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

    if (!matches?.params?.id) {
      return new Response(`no org`, { status: 400 })
    }

    const id: DurableObjectId = env.ELECTRIC_SQLITE_DEMO.idFromName(
      matches.params.id
    )
    const stub = env.ELECTRIC_SQLITE_DEMO.get(id)

    const greeting = await stub.getOrgInfo(matches.params.id)

    return new Response(greeting)
  },
} satisfies ExportedHandler<Env>
