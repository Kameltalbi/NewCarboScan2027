import type { FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./auth.js";
import { registerCalculateRoutes } from "./calculate.js";
import { registerEvidenceRoutes } from "./evidence.js";
import { registerReportRoutes } from "./reports.js";
import { registerLegacyFunctionStubs } from "./legacy-functions.js";
import { registerAuditRoutes } from "./audit.js";
import { registerPublicRoutes } from "./public.js";
import { registerImportRoutes } from "./import.js";
import { registerFactorRoutes } from "./factors.js";
import { registerRunRoutes } from "./runs.js";

export async function registerRoutes(app: FastifyInstance) {
  await registerAuthRoutes(app);
  await registerPublicRoutes(app);
  await registerImportRoutes(app);
  await registerCalculateRoutes(app);
  await registerEvidenceRoutes(app);
  await registerFactorRoutes(app);
  await registerRunRoutes(app);
  await registerReportRoutes(app);
  await registerAuditRoutes(app);
  await registerLegacyFunctionStubs(app);
}
