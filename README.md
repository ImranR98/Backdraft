# 🔥 Backdraft

Node.js, Express, and MongoDB based web server with simple user authentication, to be used as a template or starting off point for backend projects.



## Why
Most web service backends share certain basic features — they usually involve exposing HTTP endpoints that allow for CRUD operations on a database, protected via some kind of authentication.

Repeatedly implementing these basic features from scratch with each new project, especially when your projects share the same stack, is a waste of time and can lead to rushed or inconsistent code. For example, a common mistake or shortcut is to avoid using refresh tokens for authentication, and to instead issue only regular JWTs with ridiculously long expiration times, leading to security risks and poorer UX. Additionally, features like automated testing, logging, and email verification are often skipped to save time.

This project helps avoid such issues by providing a solid foundation that includes the basics right out of the box in a well documented, maintainable, and extensible way.



## Features

- User authentication using JWT and refresh tokens.
- Ability for authenticated users to manage their credentials and refresh tokens.
- Automated testing for all API endpoints using Mocha, Chai, SuperTest, and mongodb-memory-server.
- Standardized logging using Winston and Morgan.
- Mongoose and TypeScript used for easier database querying and increased type safety.
- User email verification and enabled by Nodemailer.



## Setup/Usage
1. Use `npm i` to install required dependencies.
2. Create a copy of `template.env`, rename it to `.env`, and fill in the appropriate details as described in that file. Refer to the `dotenv` [documentation](https://www.npmjs.com/package/dotenv) for details on how this works. Alternatively, set up environment variables some other way.
3. Test the project, build it for production, or run it in a development environment using the scripts defined in `package.json`.



## Project Structure

### DB

Each file in the `db` directory (aside from `dbConnection.ts`) defines a model used in the database. These models are never directly exported to other files. Instead, this file also defines various query functions that are used to make changes to the database. This means that the database layer is abstracted away and can be swapped out later if needed, without changing the controllers.

Note that this layer has minimal validation as this is mostly done in the controllers.

The `dbConnection.ts` file exports functions used to connect/disconnect to/from the DB, including for testing.

### Controllers

Each file in the `controllers` directory contains a set of functions, each of which carries out some task related to the application's use. Such functions normally involve accepting input that was received from the client, querying or modifying the database using the functions exposed by the database layer, and returning a result.

The functions are grouped into files, called controllers, based on a shared theme or aspect of functionality. For example, all functions related to authentication are stored in `authController.ts`.

Controllers contain the vast majority of application logic; anything used directly to respond to requests is generally stored in a controller.

### Routes

Each file in the `routes` directory contains a set of Express route functions. Each of these usually ensures the request contains required data, then calls some controller function and returns the result or an error.

Like controllers (see above), these are grouped into files based on a shared theme.

### Middleware

Each file in the `middleware` directory defines functions that are used in the main process as [Express middleware](https://expressjs.com/en/guide/using-middleware.html).

### Everything Else

The `funcs` directory contains all other code (aside from `main.ts`) needed for the server to run, divided into several files according to functionality.

Some of what this covers:
- Functions to send emails
- Functions to standardize errors for the client
- The Express `app` (after configuring it with middleware)
- Functions to encode and decode JSON Web Tokens
- The Winston logger
- Various other functions that do not fit elsewhere, such as those related to user input and environment variables

### Main Process

Code execution begins in `main.ts`. This file runs some checks, then starts the server.



## Typical Flow for Implementing New Features

Implementing new functionality in the application usually involves:
1. Creating the relevant DB model(s)
2. Implementing the relevant controller(s) or controller function(s)
3. Adding the necessary route(s)
4. Making sure the route(s) are imported in `express.ts`
5. Writing the appropriate test(s)



## Testing
Each `.test.ts` file in the `test` directory contains functional Mocha tests for a particular set of server endpoints. All root hook plugins are in `hooks.ts`.

In principle, each test should be fully independent and isolated from others. This means that there should be a root hook plugin that connects to a new, empty test database (in memory, using mongodb-memory-server). This also means that, for example, a test that requires the existence of a logged in user would need a signup and login to be done first in `before` or `beforeEach` hooks. While this does lead to repetition, it is the only way to keep tests independent.


# TODO
- Forgot password (probably using a JWT too, with existing password hash as signing key)
- Automated tests for refresh token removal policies (and just more organized tests in general)



------

Current concerns, ideas, and other notes are in [Notes.md](./Notes.md).
