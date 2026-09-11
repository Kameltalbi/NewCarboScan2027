import Fastify from "fastify";
import { authPlugin } from "../../plugins/auth.js";
import { registerRoutes } from "../../routes/index.js";

export async function buildTestApp() {
  const app = Fastify({ logger: false });
  await authPlugin(app, {});
  await registerRoutes(app);
  await app.ready();
  return app;
}
