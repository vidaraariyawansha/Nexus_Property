# Nexus Property — Java 21 / Spring Boot Backend

This directory replaces the previous Express/TypeScript server with Java while preserving the existing React UI and `/api/...` contract.

## Stack
- Java 21
- Spring Boot 3.5
- Spring Web + Spring Security
- Spring JDBC
- SQLite JDBC (uses the copied existing `nexus.sqlite` data)
- BCrypt password compatibility
- JWT bearer authentication

## Run
1. Install Java 21 and Maven 3.9+.
2. From `java-backend/`: `mvn spring-boot:run`
3. Run the React frontend from the project root using Vite. The Java API defaults to port 3000.

For a production build, build the React application and copy `dist/` into `java-backend/src/main/resources/static/` before packaging, or serve the frontend independently and proxy `/api` to the Java app.

Environment variables:
- `PORT` (default `3000`)
- `NEXUS_DB` (default `./nexus.sqlite`)
- `JWT_SECRET` (change in production)
- `GEMINI_API_KEY` (optional; AI advisor has a local fallback)

## Compatibility
The Java application implements the existing route groups: auth, profile, properties/media, appointments, feedback, wishlist, notifications, comparisons, admin, AI advisor, and health.
