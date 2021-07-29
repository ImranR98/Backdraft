# Ideas

- Email verification on signup.
- 'Forgot password' function. This would build on the email verification feature.



# Concerns



## Refresh Token Cleanup Policy

Sometimes, a user may manually log out, and reasonable client software would destroy the refresh token then, or they may lose their refresh tokens in some other way. But the DB still stores that refresh token. Over time, this would lead to thousands of dead refresh tokens building up in the DB. Obviously, very old tokens should be revoked automatically. But when and how is this appropriate? Isn't the point of refresh tokens that they last forever? The current functionality is that old tokens should be revoked when a new one is requested (at login). Specifically:

- All tokens that haven't been used in 30 days that came from the same IP and user agent as the latest login are revoked.
- All tokens that haven't been used in year are revoked.

Is this the best way? Is the IP that Express receives always accurate? That may depend on, for example, proxies. What if a user has two identical user agents on the same network? In that case, would the IP received be accurate to the individual device or the network? This needs to be tested. If it is precise, is the 30 day limit needed? Why not revoke immediately? Answers unclear but this could perhaps be improved.



# Other Notes



## Basic Flow for Refresh Tokens

1. User logs in, gets token + refresh token:
   - Unlike the token, all refresh tokens are stored in the database in the User model.
   - Also stored is some info about the request (device, IP, when the refresh token was last used, etc.)
2. User uses token to make requests
3. If a request is made with an expired token:
   - User can request a new token using the refresh token, then use the new one.
   - If the refresh token is invalid, user gets 401.
4. If a logged in user wants, they can take a look at their refresh tokens (not the tokens themselves, but some associated data such as device or IP) and choose to revoke the token.
5. Older tokens are automatically revoked in accordance with some policy based on token usage. Prevents buildup of 'dead' tokens in the database.
6. User can reset their password. This optionally revokes all refresh tokens.