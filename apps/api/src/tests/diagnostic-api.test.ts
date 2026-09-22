import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { hashResumeToken } from "../services/diagnostic/access.js";
import { shownQuestions } from "../services/diagnostic/engine.js";
import { createMemoryDiagnosticRepository } from "../services/diagnostic/memoryRepository.js";
import type { AnswerMap, DiagnosticAnswer } from "../services/diagnostic/types.js";
import { registerDiagnosticRoutes } from "../routes/diagnostic.js";

type Actor = { id: string; email: string; organizationId: string; role: string };

function choice(value: string): DiagnosticAnswer {
  return { kind: "choice", value };
}

function fill(drivers: AnswerMap = {}): AnswerMap {
  const answers: AnswerMap = { ...drivers };
  for (let pass = 0; pass < 6; pass += 1) {
    let changed = false;
    for (const question of shownQuestions(answers)) {
      if (answers[question.code]) continue;
      const option = question.options.find((item) => item.value !== "unknown");
      if (!option) continue;
      answers[question.code] =
        question.type === "multi"
          ? { kind: "multi", values: [option.value] }
          : { kind: "choice", value: option.value };
      changed = true;
    }
    if (!changed) break;
  }
  const visible = new Set(shownQuestions(answers).map((question) => question.code));
  return Object.fromEntries(Object.entries(answers).filter(([code]) => visible.has(code)));
}

async function buildApp(repo = createMemoryDiagnosticRepository(), actor?: { current: Actor }) {
  const app = Fastify({ logger: false });
  const current = actor ?? {
    current: { id: "user-1", email: "ada@example.com", organizationId: "org-1", role: "admin" },
  };
  app.decorate("requireAuth", async (request: { user?: Actor }) => {
    request.user = { ...current.current };
  });
  app.decorate("requireOrgMember", async () => undefined);
  app.decorate("requireOrgWriter", async () => undefined);
  await app.register(rateLimit, { max: 1000, timeWindow: "1 minute" });
  await registerDiagnosticRoutes(app, { repo });
  await app.ready();
  return { app, repo, actor: current };
}

describe("diagnostic public API", () => {
  it("hides scores until complete and rejects client-supplied results", async () => {
    const { app } = await buildApp();
    const created = await app.inject({ method: "POST", url: "/v1/public/diagnostics", payload: {} });
    assert.equal(created.statusCode, 201);
    const body = created.json() as {
      sessionId: string;
      resumeToken: string;
      templateVersion: string;
      result: null;
      shownQuestions: Array<Record<string, unknown>>;
    };
    assert.equal(body.templateVersion, "diag-360-2026.1");
    assert.equal(body.result, null);
    assert.equal(body.shownQuestions.some((question) => "weight" in question), false);
    const profile = body.shownQuestions.find((question) => question.code === "country");
    assert.equal(profile?.axisId, null);
    assert.equal(profile?.axisLabelFr, null);
    const headers = { "x-diagnostic-token": body.resumeToken };

    const imposed = await app.inject({
      method: "PUT",
      url: `/v1/public/diagnostics/${body.sessionId}/answers`,
      headers,
      payload: { answers: { country: choice("TN") }, score: 100 },
    });
    assert.equal(imposed.statusCode, 400);
    assert.equal(imposed.json().code, "invalid_payload");

    const scoredOption = await app.inject({
      method: "PUT",
      url: `/v1/public/diagnostics/${body.sessionId}/answers`,
      headers,
      payload: { answers: { country: { kind: "choice", value: "TN", points: 9 } } },
    });
    assert.equal(scoredOption.statusCode, 400);

    const saved = await app.inject({
      method: "PUT",
      url: `/v1/public/diagnostics/${body.sessionId}/answers`,
      headers,
      payload: { answers: { country: choice("TN"), carbon_assessment_status: choice("unknown") } },
    });
    assert.equal(saved.statusCode, 200);
    assert.equal(saved.json().result, null);
    assert.equal(saved.json().answers.carbon_assessment_status.kind, "unknown");
    const measure = (saved.json().shownQuestions as Array<{ code: string; axisLabelFr: string | null; weight?: number }>).find(
      (question) => question.code === "carbon_assessment_status",
    );
    assert.equal(measure?.axisLabelFr, "Mesure carbone");
    assert.equal(measure?.weight, undefined);

    const read = await app.inject({
      method: "GET",
      url: `/v1/public/diagnostics/${body.sessionId}`,
      headers,
    });
    assert.equal(read.statusCode, 200);
    assert.equal(read.json().result, null);

    const wrong = await app.inject({
      method: "GET",
      url: `/v1/public/diagnostics/${body.sessionId}`,
      headers: { "x-diagnostic-token": "not-the-token" },
    });
    assert.equal(wrong.statusCode, 404);
    assert.equal(wrong.json().error, "Diagnostic introuvable");

    const missing = await app.inject({
      method: "GET",
      url: "/v1/public/diagnostics/00000000-0000-4000-8000-000000000099",
      headers,
    });
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json().error, "Diagnostic introuvable");
    await app.close();
  });

  it("rejects answers outside the current path and keeps them when the path later hides them", async () => {
    const { app } = await buildApp();
    const created = await app.inject({ method: "POST", url: "/v1/public/diagnostics", payload: { language: "fr" } });
    const { sessionId, resumeToken } = created.json() as { sessionId: string; resumeToken: string };
    const headers = { "x-diagnostic-token": resumeToken };

    const opened = await app.inject({
      method: "PUT",
      url: `/v1/public/diagnostics/${sessionId}/answers`,
      headers,
      payload: {
        answers: {
          fleet_fuel_tracking: choice("invoices"),
          has_fleet: choice("yes"),
        },
      },
    });
    assert.equal(opened.statusCode, 200);
    assert.equal(opened.json().answers.fleet_fuel_tracking.value, "invoices");

    const seeded = await app.inject({
      method: "PUT",
      url: `/v1/public/diagnostics/${sessionId}/answers`,
      headers,
      payload: { answers: { country: choice("TN"), export_status: choice("goods_eu"), cbam_exposure: choice("not_examined") } },
    });
    assert.equal(seeded.statusCode, 200);

    const rejected = await app.inject({
      method: "PUT",
      url: `/v1/public/diagnostics/${sessionId}/answers`,
      headers,
      payload: { answers: { export_status: choice("none"), cbam_exposure: choice("mapped"), country: choice("CA") } },
    });
    assert.equal(rejected.statusCode, 422);
    assert.equal(rejected.json().code, "question_not_in_path");

    const afterReject = await app.inject({
      method: "GET",
      url: `/v1/public/diagnostics/${sessionId}`,
      headers,
    });
    assert.equal(afterReject.json().answers.export_status.value, "goods_eu");
    assert.equal(afterReject.json().answers.country.value, "TN");

    const hidden = await app.inject({
      method: "PUT",
      url: `/v1/public/diagnostics/${sessionId}/answers`,
      headers,
      payload: { answers: { export_status: choice("none") } },
    });
    assert.equal(hidden.statusCode, 200);
    assert.equal(hidden.json().answers.cbam_exposure.value, "not_examined");
    assert.equal(
      hidden.json().shownQuestions.some((question: { code: string }) => question.code === "cbam_exposure"),
      false,
    );

    const unknownCode = await app.inject({
      method: "PUT",
      url: `/v1/public/diagnostics/${sessionId}/answers`,
      headers,
      payload: { answers: { not_a_question: choice("TN") } },
    });
    assert.equal(unknownCode.statusCode, 400);
    assert.equal(unknownCode.json().code, "unknown_question");
    await app.close();
  });

  it("freezes one snapshot, ignores later answer edits, and separates the report from consent", async () => {
    const { app, repo } = await buildApp();
    const created = await app.inject({ method: "POST", url: "/v1/public/diagnostics", payload: {} });
    const { sessionId, resumeToken } = created.json() as { sessionId: string; resumeToken: string };
    const headers = { "x-diagnostic-token": resumeToken };
    const early = await app.inject({
      method: "POST",
      url: `/v1/public/diagnostics/${sessionId}/complete`,
      headers,
      payload: {},
    });
    assert.equal(early.statusCode, 422);
    assert.equal(early.json().code, "incomplete");
    assert.ok(early.json().missing.includes("carbon_assessment_status"));

    const reportTooSoon = await app.inject({
      method: "POST",
      url: `/v1/public/diagnostics/${sessionId}/report-request`,
      headers,
      payload: { fullName: "Ada Lovelace", companyName: "Analytical Engines", email: "ada@example.com" },
    });
    assert.equal(reportTooSoon.statusCode, 409);
    assert.equal(reportTooSoon.json().code, "report_requires_completion");

    const saved = await app.inject({
      method: "PUT",
      url: `/v1/public/diagnostics/${sessionId}/answers`,
      headers,
      payload: { answers: fill() },
    });
    assert.equal(saved.statusCode, 200);

    const [first, second] = await Promise.all([
      app.inject({ method: "POST", url: `/v1/public/diagnostics/${sessionId}/complete`, headers, payload: {} }),
      app.inject({ method: "POST", url: `/v1/public/diagnostics/${sessionId}/complete`, headers, payload: {} }),
    ]);
    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    const snapA = first.json().snapshot;
    const snapB = second.json().snapshot;
    assert.deepEqual(snapA, snapB);
    assert.equal([first.json().idempotent, second.json().idempotent].filter((value) => value === false).length, 1);
    assert.equal(snapA.templateVersion, "diag-360-2026.1");
    assert.ok(snapA.recommendations.length <= 3);
    assert.equal("internal" in snapA, false);
    assert.ok(snapA.applicableAnswers);
    assert.ok(snapA.presentation);
    assert.equal(typeof snapA.reliabilityLimited, "boolean");

    repo.replaceAnswerForTest(sessionId, "reduction_target", choice("none"));
    const replay = await app.inject({
      method: "POST",
      url: `/v1/public/diagnostics/${sessionId}/complete`,
      headers,
      payload: {},
    });
    assert.equal(replay.json().idempotent, true);
    assert.equal(replay.json().snapshot.maturityScore, snapA.maturityScore);

    const locked = await app.inject({
      method: "PUT",
      url: `/v1/public/diagnostics/${sessionId}/answers`,
      headers,
      payload: { answers: { country: choice("CA") } },
    });
    assert.equal(locked.statusCode, 409);
    assert.equal(locked.json().code, "session_completed");

    const before = await app.inject({
      method: "POST",
      url: `/v1/public/diagnostics/${sessionId}/report-request`,
      headers,
      payload: { fullName: "Ada Lovelace", companyName: "Analytical Engines", email: "ada@example.com" },
    });
    assert.equal(before.statusCode, 200);
    assert.equal(before.json().reportRequested, true);
    assert.equal(before.json().marketingConsent, false);

    const optedIn = await app.inject({
      method: "POST",
      url: `/v1/public/diagnostics/${sessionId}/report-request`,
      headers,
      payload: {
        fullName: "Ada Lovelace",
        companyName: "Analytical Engines",
        email: "ada@example.com",
        marketingConsent: true,
      },
    });
    assert.equal(optedIn.json().marketingConsent, true);

    const unchanged = await app.inject({
      method: "POST",
      url: `/v1/public/diagnostics/${sessionId}/report-request`,
      headers,
      payload: { fullName: "Ada Lovelace", companyName: "Analytical Engines", email: "ada@example.com" },
    });
    assert.equal(unchanged.json().marketingConsent, true);

    const optedOut = await app.inject({
      method: "POST",
      url: `/v1/public/diagnostics/${sessionId}/report-request`,
      headers,
      payload: {
        fullName: "Ada Lovelace",
        companyName: "Analytical Engines",
        email: "ada@example.com",
        marketingConsent: false,
      },
    });
    assert.equal(optedOut.json().marketingConsent, false);
    assert.equal(optedOut.json().reportRequested, true);
    await app.close();
  });

  it("does not recalculate a session stamped with another methodology", async () => {
    const { app, repo } = await buildApp();
    const token = "other-methodology-token-0123456789";
    const session = await repo.createSession({
      templateVersion: "diag-360-2019.0",
      resumeTokenHash: hashResumeToken(token),
      language: "fr",
    });
    const response = await app.inject({
      method: "POST",
      url: `/v1/public/diagnostics/${session.id}/complete`,
      headers: { "x-diagnostic-token": token },
      payload: {},
    });
    assert.equal(response.statusCode, 409);
    assert.equal(response.json().code, "methodology_unavailable");
    await app.close();
  });

  it("links a session to one organization and does not list it elsewhere", async () => {
    const actor = {
      current: { id: "user-1", email: "ada@example.com", organizationId: "org-1", role: "admin" },
    };
    const { app } = await buildApp(createMemoryDiagnosticRepository(), actor);
    const created = await app.inject({ method: "POST", url: "/v1/public/diagnostics", payload: {} });
    const { sessionId, resumeToken } = created.json() as { sessionId: string; resumeToken: string };
    const hidden = await app.inject({ method: "GET", url: `/v1/diagnostics/${sessionId}` });
    assert.equal(hidden.statusCode, 404);

    const claim = await app.inject({
      method: "POST",
      url: "/v1/diagnostics/claim",
      payload: { sessionId, resumeToken },
    });
    assert.equal(claim.statusCode, 200);
    assert.equal(claim.json().already, false);

    const again = await app.inject({
      method: "POST",
      url: "/v1/diagnostics/claim",
      payload: { sessionId, resumeToken },
    });
    assert.equal(again.json().already, true);

    const list = await app.inject({ method: "GET", url: "/v1/diagnostics" });
    assert.equal(list.json().diagnostics.length, 1);
    assert.equal(JSON.stringify(list.json()).includes(resumeToken), false);

    actor.current = { ...actor.current, organizationId: "org-2", id: "user-2" };
    const stolen = await app.inject({
      method: "POST",
      url: "/v1/diagnostics/claim",
      payload: { sessionId, resumeToken },
    });
    assert.equal(stolen.statusCode, 409);
    assert.equal(stolen.json().code, "already_linked");
    const invisible = await app.inject({ method: "GET", url: `/v1/diagnostics/${sessionId}` });
    assert.equal(invisible.statusCode, 404);
    await app.close();
  });

  it("rate-limits public session creation", async () => {
    const { app } = await buildApp();
    let last = 0;
    for (let i = 0; i < 11; i += 1) {
      const response = await app.inject({ method: "POST", url: "/v1/public/diagnostics", payload: {} });
      last = response.statusCode;
    }
    assert.equal(last, 429);
    await app.close();
  });

  it("drops a hidden answer from the frozen snapshot", async () => {
    const { app } = await buildApp();
    const created = await app.inject({ method: "POST", url: "/v1/public/diagnostics", payload: {} });
    const { sessionId, resumeToken } = created.json() as { sessionId: string; resumeToken: string };
    const headers = { "x-diagnostic-token": resumeToken };
    const drivers = {
      export_status: choice("goods_eu"),
      cbam_exposure: choice("not_examined"),
    };
    await app.inject({
      method: "PUT",
      url: `/v1/public/diagnostics/${sessionId}/answers`,
      headers,
      payload: { answers: drivers },
    });
    await app.inject({
      method: "PUT",
      url: `/v1/public/diagnostics/${sessionId}/answers`,
      headers,
      payload: { answers: { export_status: choice("none") } },
    });
    const saved = await app.inject({
      method: "PUT",
      url: `/v1/public/diagnostics/${sessionId}/answers`,
      headers,
      payload: { answers: fill({ export_status: choice("none"), cbam_exposure: choice("not_examined") }) },
    });
    assert.equal(saved.statusCode, 200);
    const done = await app.inject({
      method: "POST",
      url: `/v1/public/diagnostics/${sessionId}/complete`,
      headers,
      payload: {},
    });
    assert.equal(done.statusCode, 200);
    assert.equal(done.json().snapshot.applicableAnswers.cbam_exposure, undefined);
    assert.equal(done.json().snapshot.applicableAnswers.export_status.value, "none");
    await app.close();
  });
});
