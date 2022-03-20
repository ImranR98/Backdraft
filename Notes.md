# Concerns

## Refresh Token Cleanup Policy

When a user logs out, it deletes its refresh token and also sends a request to the server to destroy the server copy of that refresh token (since it won't be used again). But a log out is not the only way a user might lose a refresh token; this could also happen due to a change in browsers or devices (factory reset, loss, etc.) and when this happens the server retains its copy of the refresh token. Over time, this would lead to many 'dead' refresh tokens building up in the DB. To avoid this, refresh tokens that have not been used for a long time should be cleaned up automatically. But when and how is this appropriate? The point of refresh tokens is that they last forever, so a clean up policy would involve a trade-off between expected behaviour and practical needs.

 The current functionality is that old tokens should be revoked when a new one is requested (at login). Specifically:

- All tokens that haven't been used in 30 days that came from the same IP and user agent as the latest login are revoked.
- All tokens that haven't been used in a year are revoked.

Is this the best way? Does it make sense to treat tokens differently based on IP and user-agent given that these change all the time (especially IP due to moving between networks and DHCP)? Is the IP that Express receives always accurate even when there are, for example, for example, proxies involved? It may be better to just stick to the 1-year policy, but for now things have been left as above.

# Basic Flow for Refresh Tokens

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

# Possible Improvements
- Tests are not clearly structured, have a lot of repetition, use `.then()`/`.catch()` instead of `async`/`await`, and have some shortcuts for generating JWTs and OTPs for test users (since the OTP sent to the test email can't be easily retreived). All this could be fixed.