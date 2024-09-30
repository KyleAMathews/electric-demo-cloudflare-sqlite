create table organizations (
  id uuid primary key,
  name text not null,
  domain text not null,
  description text,
  plan text not null
);

create table users (
  id uuid primary key,
  organization_id uuid references organizations (id),
  name text not null,
  email text not null,
  role text not null
);

-- Insert sample data for organizations
insert into
  organizations (id, name, domain, description, plan)
values
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'Tech Innovators',
    'techinnovators.com',
    'Leading tech solutions provider',
    'Enterprise'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Health Plus',
    'healthplus.org',
    'Healthcare services and products',
    'Premium'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'Edu World',
    'eduworld.edu',
    'Educational resources and services',
    'Standard'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'Green Energy',
    'greenenergy.net',
    'Renewable energy solutions',
    'Enterprise'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440004',
    'Foodies',
    'foodies.com',
    'Gourmet food and recipes',
    'Basic'
  );

-- Insert sample data for users
insert into
  users (id, organization_id, name, email, role)
values
  (
    '550e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440000',
    'Alice Johnson',
    'alice@techinnovators.com',
    'Admin'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440000',
    'Bob Smith',
    'bob@techinnovators.com',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440012',
    '550e8400-e29b-41d4-a716-446655440000',
    'Charlie Brown',
    'charlie@techinnovators.com',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440013',
    '550e8400-e29b-41d4-a716-446655440000',
    'David Wilson',
    'david@techinnovators.com',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440014',
    '550e8400-e29b-41d4-a716-446655440000',
    'Eve Davis',
    'eve@techinnovators.com',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440015',
    '550e8400-e29b-41d4-a716-446655440000',
    'Frank Moore',
    'frank@techinnovators.com',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440016',
    '550e8400-e29b-41d4-a716-446655440000',
    'Grace Lee',
    'grace@techinnovators.com',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440017',
    '550e8400-e29b-41d4-a716-446655440000',
    'Hank Green',
    'hank@techinnovators.com',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440018',
    '550e8400-e29b-41d4-a716-446655440000',
    'Ivy White',
    'ivy@techinnovators.com',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440019',
    '550e8400-e29b-41d4-a716-446655440000',
    'Jack Black',
    'jack@techinnovators.com',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440020',
    '550e8400-e29b-41d4-a716-446655440001',
    'Karen Young',
    'karen@healthplus.org',
    'Admin'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440021',
    '550e8400-e29b-41d4-a716-446655440001',
    'Larry King',
    'larry@healthplus.org',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440022',
    '550e8400-e29b-41d4-a716-446655440001',
    'Mona Lisa',
    'mona@healthplus.org',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440023',
    '550e8400-e29b-41d4-a716-446655440001',
    'Nina Simone',
    'nina@healthplus.org',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440024',
    '550e8400-e29b-41d4-a716-446655440001',
    'Oscar Wilde',
    'oscar@healthplus.org',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440025',
    '550e8400-e29b-41d4-a716-446655440001',
    'Paul Newman',
    'paul@healthplus.org',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440026',
    '550e8400-e29b-41d4-a716-446655440001',
    'Quincy Jones',
    'quincy@healthplus.org',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440027',
    '550e8400-e29b-41d4-a716-446655440001',
    'Rachel Green',
    'rachel@healthplus.org',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440028',
    '550e8400-e29b-41d4-a716-446655440002',
    'Steve Jobs',
    'steve@healthplus.org',
    'User'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440029',
    '550e8400-e29b-41d4-a716-446655440002',
    'Tom Hanks',
    'tom@healthplus.org',
    'User'
  );
