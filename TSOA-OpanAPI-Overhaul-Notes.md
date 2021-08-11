# TODO
- [ ] Create User and RefreshToken interfaces.
- [ ] Separate authController into authService and meService, based on notes in the ***Route Changes*** section below.
- [ ] Similarly, create authController and meController for routes.
- Figure out structure:
    - [ ] DB Models have no programmatic connection to the Interfaces used for routing, although they are obviously often similar.
    - [ ] DB layer and API layer completely separate and in separate directories; the former should ideally remain almost completely unchanged.
    - [ ] Generated `routes.ts` should probably be placed in `src`, not `build`, but not sure yet. Building will be 2 step now so needs more thought.
- [ ] Ensure `tsoa.json` and `tsconfig.json` are properly set up to make everything work.
- Next steps:
    - [ ] Where does the error handling fit in now? Does `tsoa` have friendlier errors? Default ones are not suitable for clients. Figure this out and implement.
    - [ ] Use `swagger-ui-express` to generate API documentation/demo webpage. Add to build script too (maybe served under just `/api` somehow? So as to avoid conflict with possible actual client served from root `/`).
    - [ ] Figure out how to run everything in dev with auto reloading, `nodemon` style.
    - [ ] Update and run tests to ensure everything works.
    - [ ] Update notes and README accordingly, and merge PR.

# Route Changes
These first 6 remain the same; they are not "RESTful" as I can't think of how that would work.
- `/api/signup`
- `/api/verify-email`
- `/api/login`
- `/api/token`
- `/api/request-password-reset`
- `/api/reset-password`

Once, the user is logged in, though, we can start thinking in terms of "everything is a resource" and have a more "RESTful" system of routes
- NEW - `/api/me` GET - Can be implemented later; returns basic user info
- `/api/logins` => `/api/me/refreshtokens` GET
- `/api/revoke-login` => `/api/me/refreshtokens/{id}` DELETE
- `/api/change-password` => `/api/me/password` POST
- `/api/change-email` => `/api/me/email` POST