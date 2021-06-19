# auth

Most web service backends require at least a basic authentication system.

In the past, I have wasted time writing auth code for each new project. Most of it was written in a hurry and was half baked, with several issues such as using regular JWTs with ridiculously long expiration times, instead of refresh tokens.

This is my attempt at creating a barebones backend that features simple but well built (and maybe more importantly, well documented) authentication, that can be used as a starting point for future projects.

End goals:
- An API that lets users sign up with email (email verification may be added later, but it is a pain and not my main focus).
- Signed up users should be able to use their credentials to get a token and refresh token (login).
- Regular tokens should be used to make requests to protected routes.
- Regular tokens should expire frequently and refresh tokens should be used to generate new ones.
- Users should be able to view a list of devices (each associated with a refresh token), and revoke any refresh token at will.

This will also be my first attempt at writing unit tests.

Don't judge this code 😅, it is a messy work in progress, and that progress may be **S L O W**.