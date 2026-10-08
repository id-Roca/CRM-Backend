# Pre-deployment checklist

## Security

- Sensitive values such as the database connection string and JWT secret are stored in environment variables and are not committed to GitHub. The local `.env` file is included in `.gitignore`, while the production values are stored directly in Render.

- CORS is configured in the Express application to control which frontend origin is allowed to access the API.

- Rate limiting is implemented for the login route to reduce repeated login attempts and help protect the authentication endpoint.

- `helmet` was not implemented in this project due to time constraints. Helmet is an Express security package that adds security-related HTTP headers to responses and would be a useful future improvement before using the application in a real production environment.

## Database Management

- Use Prisma migrations to manage database schema changes.
- Apply existing migration files to the production database with:

  `npx prisma migrate deploy`

- Use `prisma migrate deploy` instead of `prisma db push` for production database changes. `db push` is better suited to prototyping because it updates the schema without using the normal migration history.
- Review indexes and unique constraints before deployment to ensure good database performance and data integrity.

## Error Handling & Logs

- Use centralized error-handling middleware.
- Do not send stack traces, raw database errors, or sensitive internal details to public users.
- Return short, safe error messages with the correct HTTP status code.
- Avoid logging secrets such as passwords, JWTs, API keys, or database credentials.
- After deployment, check the hosting platform's live application logs to investigate runtime errors. On Render, these logs are available in the service dashboard.

## Environment Setup

- Keep runtime packages in `dependencies`.
- Keep testing and development tools such as Jest and Supertest in `devDependencies`.
- Do not commit or deploy `node_modules`; let the hosting platform install dependencies.
- Keep local-only files such as `.env` and temporary test files out of production.
- Remove unnecessary debug logs and unused development configuration before deployment.
- Use a clean production install so only the packages needed to run the application are included.