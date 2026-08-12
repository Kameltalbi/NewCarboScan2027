import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { pool } from "./db.js";
import { authPlugin } from "./plugins/auth.js";
import { registerRoutes } from "./routes/index.js";

const PORT = Number(process.env.PORT ?? 8080);
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function main() {
  const app = Fastify({
    logger: true,
    bodyLimit: Number(process.env.BODY_LIMIT_BYTES ?? 1_000_000),
  });

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

  // Auth decorators must live on the root instance (no encapsulation)
  await authPlugin(app, {});
  await registerRoutes(app);

  app.get("/health", async (_request, reply) => {
    try {
      await pool.query("SELECT 1");
      return {
        ok: true,
        service: "newcarboscan-api",
        year: 2027,
        db: true,
      };
    } catch (err) {
      reply.code(503);
      return {
        ok: false,
        service: "newcarboscan-api",
        year: 2027,
        db: false,
        error: err instanceof Error ? err.message : "db_unavailable",
      };
    }
  });

  const shutdown = async () => {
    await app.close();
    await pool.end();
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
