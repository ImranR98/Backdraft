# Concerns



## Refresh Token Cleanup Policy

When a user logs out, it deletes its refresh token and also sends a request to the server to destroy the server copy of that refresh token (since it won't be used again). But a log out is not the only way a user might lose a refresh token; this could also happen due to a change in browsers or devices (factory reset, loss, etc.) and when this happens the server retains its copy of the refresh token. Over time, this would lead to many 'dead' refresh tokens building up in the DB. To avoid this, refresh tokens that have not been used for a long time should be cleaned up automatically. But when and how is this appropriate? The point of refresh tokens is that they last forever, so a clean up policy would involve a trade-off between expected behaviour and practical needs.

 The current functionality is that old tokens should be revoked when a new one is requested (at login). Specifically:

- All tokens that haven't been used in 30 days that came from the same IP and user agent as the latest login are revoked.
- All tokens that haven't been used in a year are revoked.

Is this the best way? Does it make sense to treat tokens differently based on IP and user-agent given that these change all the time (especially IP due to moving between networks and DHCP)? Is the IP that Express receives always accurate even when there are, for example, for example, proxies involved? It may be better to just stick to the 1-year policy, but for now things have been left as above.

## Email Verification - Link to Client or Server

Traditionally, email verification has been done by sending a link containing a unique key to the user that they can click on. The link could work in one of two ways:
1. Sending a GET request through the browser directly to the backend/API.
2. Sending the user to a client, which parses the key then sends it to the backend.

With the first approach, there is less coupling with the client; you don't even need to know where the client is hosted. This is good if the backend is public/not restricted and can recieve requests from anywhere. It allows others to create custom clients. The downside is that the response (success/fail message) sent to the user would be barebones and not reflective of the UI they may be used to. Also, it is less "RESTful"; that is an inconvenience but not a major concern.

The second approach is more complex as it requries the server to know where the client is in order to send a link to that client to the user. What happens when there is more than one possible client? Or when there are mobile clients that have no domain (maybe deep links could be used)?

For now, the second path has been taken, with the client having to provide its own verification URL in the request body.

Similar issue for password reset.

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