# 🌐 NEMBack

A Node.js, Express, and MongoDB based web server that can be used as a template or starting off point for backend projects. Features JSON Web Token and refresh token based authentication, and uses TypeScript and Mongoose. 

## Why
Most web service backends share certain basic features — they usually involve exposing HTTP endpoints that allow for CRUD operations on a database, protected via some kind of authentication.

Most Node/Express/MongoDB based backends are obviously even more similar, and they share similar code at their base. Repeatedly implementing these basic features from scratch with each new project that shares this tech stack is a waste of time and can lead to rushed or inconsistent code. For example, a common mistake or shortcut is to avoid using refresh tokens for authentication, and to instead issue only regular JWTs with ridiculously long expiration times, leading to security risks and poorer UX.

This project helps avoid these issues. The goals are a logical structure, good documentation, maintainability, and extensibility.

> This is a work in progress, and that progress may be **S L O W** 😅 as this is a hobby/side project.

## Features

- A simple User model with email and password fields.
- The following authentication related functionality (with associated API endpoints):
  - Users can sign up with email.
  - Users can login to receive a JSON web token and a refresh token; these will be used for authentication.
  - Users can request information about refresh tokens currently associated with their account. These are called 'logins', and the provided information includes the IP address from which a refresh token was last used, along with the user agent and date.
  - Users can revoke any refresh token at will.
  - Users can change their passwords and optionally revoke all existing refresh tokens when doing so.

## Setup/Usage
1. Use `npm i` to install required dependencies.
2. Create a copy of `template.env`, rename it to `.env`, and fill in the appropriate details. Alternatively, set up environment variables some other way.
3. Build the project for production or run in in a development environment using the scripts defined in `package.json`.

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

### Main Process

Code execution begins in `main.ts`. This file sets up Express and various middleware, then ensures that required environment variables exist. Finally, it checks the database connection and starts the server.

Implementing new functionality in the application usually involves creating the relevant models, then implementing a controller or some functions in an existing controller, then adding the necessary routes, then finally making sure the routes are imported in `main.ts`.

### Directory Structure

```
├── .gitignore                 -  Specify files to exclude from version control
├── Notes.md                   -  Detailed notes on progress, planning, and concerns
├── package.json               -  Standard Node package.json
├── package-lock.json          -  Standard Node package-lock.json — do not modify
├── README.md                  -  Standard README
├── src                        -  Directory containing all code
│   ├── controllers            -  Controller directory
│   │   └── authController.ts  -  All authentication related functions
│   ├── errors.ts              -  Code related to error standardization
│   ├── helpers.ts             -  Various functions that don't fit elsewhere
│   ├── main.ts                -  Main process code; starting point for execution
│   ├── middleware             -  Middleware directory
│   │   └── authMiddleware.ts  -  Authentication related middleware
│   ├── models                 -  Model directory
│   │   └── User.ts            -  User model
│   └── routes                 -  Routes directory
│       └── authRoutes.ts      -  Routes related to authentication
└── tsconfig.json              -  TypeScript configuration file
```

------

Detailed notes, including progress, planning, and concerns, are in [Notes.md](./Notes.md).
