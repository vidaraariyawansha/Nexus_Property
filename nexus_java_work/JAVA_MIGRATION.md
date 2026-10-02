# Java migration notes

The original project used React/TypeScript in the browser and Express/TypeScript on the server. The server-side application has been recreated in `java-backend/` with Java 21 + Spring Boot while retaining the original frontend unchanged so its design, animations, workflows and component behavior are not intentionally altered.

The original TypeScript server is retained under `server/` as a migration reference only. The Java backend is the replacement runtime backend.

Why the React source remains TypeScript: browsers do not execute Java directly. Rewriting the frontend into a Java UI framework (for example Vaadin) would change the rendering/component runtime and would conflict with the requirement to avoid affecting the UI/UX. All application server logic and API execution should now use the Spring Boot backend.
