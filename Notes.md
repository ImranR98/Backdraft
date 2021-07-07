# Notes



## To Do

- [x] Take a look at the `req` object and see what data about the client is available to associate with a refresh token.
- [x] If needed, force the client to send extra info about itself on login, such as the user agent and device (reject logins without this info) for use with the above.
- [x] Decide on the exact info that will be stored with each refresh token.
- [x] Add a new property to the User schema, in which refresh tokens and associated info can be stored.
- [x] Make sure a refresh token is generated, stored, and returned on login.
- [x] Make sure older refresh tokens are deleted on login (see concerns section below).
- [x] Create a `/token` endpoint that accepts a refresh token and issues a new token.
- [x] Make sure that every time /token is called, the last-used date for the associated refresh token is updated.
- [x] Test that the above system works:
  1. Log in and take note of the provided token and refresh token.
  2. Attempt to access a protected route without the token. This should return a 401.
  3. Try again with an invalid (modified) token. This should also return a 401.
  4. Attempt to access a protected route with the token before it expires. This should work.
  5. Wait for the token to expire and try again. This should return a 401.
  6. Attempt to request a new token without providing a refresh token. This should return a 401.
  7. Try again with an invalid (modified) refresh token. This should also return a 401.
  8. Attempt to request a new token using the provided refresh token. This should return a new token.
  9. Repeat steps 4 and 5 with the new token.
- [x] Create a protected `/logins` endpoint that returns IP + user-agent info about existing refresh tokens. Use a free IP lookup API to show the user location instead of IP.
- [x] Create a protected `/revoke-login` endpoint that revokes a specific refresh token.
- [x] Test that the above system works:
  1. Make sure you have several existing refresh tokens.
  2. Use `/logins` to get a list of existing refresh tokens.
  3. Pick one and use it to request a new token. This should work.
  3. Use `/revoke-login` to revoke the refresh token you picked.
  4. Try step 3 again. It should return a 401.
- [x] Refactor code:
  - Make controllers not receive `req` and `res` directly; those should be handled in the routes.
  - See if it makes more sense to move the logic in User model static functions into the controllers.
  - Go through all code so far, see if anything else needs changing. Everything should be where it makes the most sense to be. Deduplicate code, separate concerns, think of future extensibility.
- [x] Test again to ensure changes have not introduced new bugs.
- [x] Implement a `/reset-password` endpoint that also optionally revokes all refresh tokens. Test it.
- [ ] Replace the hardcoded token secret and DB URI with environment variables.
- [ ] Update `README.md` with a breakdown of project structure, explaining the 3 layers (DB, controllers, routes) and anything else.
- [ ] Look into unit-testing. This line is vague as I have no idea what it entails.
- [ ] Look into logging. Line is vague for similar reasons as above.
- [ ] Update `README.md` as needed.



## Basic Flow for Refresh Tokens

1. User logs in, gets token + refresh token:
   - Unlike the token, all refresh tokens are stored in the user table.
   - Along with some info about the request (device, IP, when the refresh token was last used, etc.)
2. User uses token to make requests
3. If a request is made with an expired token:
   - User can request a new token using the refresh token, then use the new one.
   - If the refresh token is invalid, user gets 401.
4. If a logged in user wants, they can take a look at their refresh tokens (not the tokens themselves, but some associated data such as device or IP) and choose to revoke the token.
5. Older tokens are automatically revoked in accordance with some policy based on token usage.
6. User can reset their password. This optionally revokes all refresh tokens.



Concerns
----------------
Sometimes, a user may manually log out (reasonable client software would destroy the refresh token then) or they may lose their refresh tokens in some other way. The server still stores that refresh token. Over time, this would lead to thousands of dead refresh tokens building up in the DB. Obviously, very old tokens should be revoked automatically. But when and how is this appropriate? Isn't the point of refresh tokens that they are forever? For now, I have decided that old tokens should be revoked when a new one is requested (login). Specifically:

- All tokens that haven't been used in 30 days that came from the same IP and user agent as the latest login are revoked.
- All tokens that haven't been used in year are revoked.

Is this the best way? Is the IP Express receives always accurate? What if a user has two identical user agents on the same network? In that case, would the IP I receive be accurate to the individual device or the network? If it is precise, do I need the 30 day limit? Why not revoke immediately?

