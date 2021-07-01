# 🌐 BasicBackend

Most web service backends share certain basic features, the most important of which is a simple authentication system. In the past, I have wasted time implementing JSON Web Token authentication (among other essentials) from scratch for each new project, and much of it was written in a hurry. For example, a common shortcut I (and many others apparently) take is to use regular tokens with ridiculously long expiration times, instead of refresh tokens.

BasicBackend is my attempt at creating a solid server with most commonly used features, that can be used as a template or starting off point for any future Node.js server project.

End goals:
- An API that lets users sign up with email.
- Users should be able to login and receive a JSON Web Token and a refresh token; these will be used for authentication.
- Users should be able to view a list of devices (each associated with a refresh token), and revoke any refresh token at will.
- Code should be logically structured, well documented, and maintainable.

Tentative goals:

- Email verification on sign up
- Unit testing
- Logging

I've never done unit testing or logging, and email verification is a pain and not that important, hence the tentative goals. I'll see where things go.

Don't judge this code yet 😅, it is a messy work in progress, and that progress may be **S L O W** as this is a hobby/side project.

Detailed planning and progress notes are in [Notes.md](./Notes.md).