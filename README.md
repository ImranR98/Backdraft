# 🔥 Backdraft

Node.js, Express, and MongoDB based web server with simple user authentication, to be used as a template or starting off point for backend projects.



## Why
Most web service backends share certain basic features — they usually involve exposing HTTP endpoints that allow for CRUD operations on a database, protected via some kind of authentication.

Repeatedly implementing these basic features from scratch with each new project, especially when your projects share the same stack, is a waste of time and can lead to rushed or inconsistent code. For example, a common mistake or shortcut is to avoid using refresh tokens for authentication, and to instead issue only regular JWTs with ridiculously long expiration times, leading to security risks and poorer UX. Additionally, features like automated testing and logging are often skipped to save time.

This project helps avoid such issues by providing a solid foundation that includes the basics right out of the box in a well documented, maintainable, and extensible way.



## Features

- User authentication using JWT and refresh tokens.
- Ability for authenticated users to manage their credentials and refresh tokens.
- Automated testing for all API endpoints using Mocha, Chai, SuperTest, and mongodb-memory-server.
- Standardized logging using Winston and Morgan.
- Mongoose and TypeScript used for easier database querying and increased type safety.



## Setup/Usage
1. Use `npm i` to install required dependencies.
2. Create a copy of `template.env`, rename it to `.env`, and fill in the appropriate details. Alternatively, set up environment variables some other way.
3. Test the project, build it for production, or run it in a development environment using the scripts defined in `package.json`.



## Project Structure

### Models

Each file in the `models` directory defines a model used in the database. These models do not contain any logic aside from some simple data validation.

### Controllers

Each file in the `controllers` directory contains a set of functions, each of which carries out some task related to the application's use. Such functions normally involve accepting input that was received from the client, querying or modifying the database, and returning a result.

The functions are grouped into files, called controllers, based on a shared theme or aspect of functionality. For example, all functions related to authentication are stored in `authController.ts`.

Controllers contain the vast majority of application logic.

### Routes

Each file in the `routes` directory contains a set of Express route functions. Each of these usually ensures the request contains required data, then calls some controller function and returns the result or an error.

Like controllers (see above), these are grouped into files based on a shared theme.

### Middleware

Each file in the `middleware` directory defines functions that are used in the main process as [Express middleware](https://expressjs.com/en/guide/using-middleware.html).

### Other Files
`connection.ts` configures the Express app object and exports it, along with functions used to validate environment variables and connect/disconnect to/from the database.

`errors.ts` defines a standardized error object with predefined messages, along with code to convert any error received into this standard form. Only these standardized errors should be sent to the client.

`helpers.ts` contains any simple, reusable helper functions that may be used in multiple files.

`logger.ts` configures and exports a Winston logger object that outputs to the console.

### Main Process

Code execution begins in `main.ts`. This file to prepares the server, connects to the DB, and starts the server.

Implementing new functionality in the application usually involves creating the relevant models, then implementing a controller or some functions in an existing controller, then adding the necessary routes, then finally making sure the routes are imported in `connection.ts`. Appropriate tests should also be written before or after this.



## Testing
Each `.test.ts` file in the `test` directory contains functional Mocha tests for a particular set of server endpoints. All root hook plugins are in `hooks.ts`.

In principle, each test should be fully independent and isolated from others. This means that there should be a root hook plugin that connects to a new, empty test database (in memory, using mongodb-memory-server). This also means that, for example, a test that requires the existence of a logged in user would need a signup and login to be done first in `before` or `beforeEach` hooks. While this does lead to repetition, it is the only way to keep tests independent.



------

Detailed notes, including progress, planning, and concerns, are in [Notes.md](./Notes.md).
