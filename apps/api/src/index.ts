import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import { rawPool, tenantAls } from "./db.js";
import { authPlugin } from "./plugins/auth.js";
import { registerRoutes } from "./routes/index.js";
import { clientSafeError } from "./lib/safeError.js";

const PORT = Number(process.env.PORT ?? 8080);
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === "production") {
  if (CORS_ORIGINS.length === 0) {
    throw new Error("CORS_ORIGINS must be set in production.");
  }
  for (const origin of CORS_ORIGINS) {
    if (
      origin === "*" ||
      /localhost|127\.0\.0\.1/i.test(origin)
    ) {
      throw new Error(
        "CORS_ORIGINS must not include * or localhost/127.0.0.1 in production.",
      );
    }
  }
}

async function main() {
  const app = Fastify({
    logger: true,
    bodyLimit: Number(process.env.BODY_LIMIT_BYTES ?? 1_000_000),
    ignoreTrailingSlash: true,
    trustProxy: true,
  });

  app.addHook("onRequest", (request, _reply, done) => {
    request.tenantStore = {};
    tenantAls.enterWith(request.tenantStore);
    done();
  });

  await app.register(cookie);
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || CORS_ORIGINS.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error("CORS origin not allowed"), false);
    },
    credentials: true,
  });

  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 100),
    timeWindow: "1 minute",
  });

  app.setErrorHandler((err, request, reply) => {
    request.log.error(err);
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) {
      return reply.code(status).send({ error: clientSafeError(err) });
    }
    const message =
      err instanceof Error ? err.message : clientSafeError(err, "Bad request");
    return reply.code(status).send({ error: message });
  });

  await authPlugin(app, {});
  await registerRoutes(app);

  const webOrigin =
    process.env.WEB_ORIGIN ?? "http://localhost:5174";

  app.get("/", async (request, reply) => {
    const accept = String(request.headers.accept ?? "");
    if (accept.includes("text/html")) {
      return reply.redirect(webOrigin);
    }
    return {
      ok: true,
      service: "newcarboscan-api",
      health: "/health",
      web: webOrigin,
    };
  });

  app.get("/health", async (_request, reply) => {
    try {
      await rawPool.query("SELECT 1");
      return {
        ok: true,
        service: "newcarboscan-api",
        year: 2027,
        db: true,
      };
    } catch {
      reply.code(503);
      return {
        ok: false,
        service: "newcarboscan-api",
        year: 2027,
        db: false,
        error: "db_unavailable",
      };
    }
  });

  const shutdown = async () => {
    await app.close();
    await rawPool.end();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
