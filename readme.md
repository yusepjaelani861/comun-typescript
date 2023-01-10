# Comun API
[![Build Status](https://travis-ci.org/joemccann/dillinger.svg?branch=master)](https://travis-ci.org/joemccann/dillinger)

Comun API using Typescript with Typescript ORM Prisma using database PostgreSQL

## Server Requirement
- Node v18.10.0+
- PostgreSQL 14.3+

## Configuration Environment
Before installation, you must be setup .env.

Format database URL
```bash
postgresql://{username}:{password}@{ip}:{port}/{database_name}

```

Please fill all data in .env below

```bash
DATABASE_URL=
SHADOW_DATABASE_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

NODE_ENV=development
PORT=
FRONTEND_URL=
FRONTEND_AUTH_URL=
JWT_SECRET=
JWT_EXPIRED=
JWT_COOKIE_EXPIRE=

MAIL_MAILER=
MAIL_HOST=
MAIL_PORT=
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_ENCRYPTION=
MAIL_FROM_ADDRESS=
MAIL_FROM_NAME=
```

## Installation

Use the package manager [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) to install foobar.

```bash
npm install
npm run migration
npm run seed
npm run build
npm run start
```

## Usage

```
http://127.0.0.1:3000
```

## Authorization
Bearer {token}

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)