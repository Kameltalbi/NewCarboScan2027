import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isStrongPassword } from "../lib/passwordPolicy.js";
import { sanitizeImportPayload } from "../lib/excelSanitize.js";
import { generateTotpSecret, verifyTotp } from "../lib/totp.js";
import { signWebhookBody, verifyWebhookSignature } from "../lib/webhookHmac.js";
import { encryptSecret, decryptSecret } from "../lib/secretBox.js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("security hardening wave 1-2", () => {
  it("enforces password complexity", () => {
    assert.equal(isStrongPassword("short"), false);
    assert.equal(isStrongPassword("password"), false);
    assert.equal(isStrongPassword("Password1"), false);
    assert.equal(isStrongPassword("Password1!"), true);
  });

  it("neutralizes spreadsheet formula injection", () => {
    const out = sanitizeImportPayload({ q: "=cmd|'/c calc'!A0", n: 1 }) as {
      q: string;
    };
    assert.equal(out.q.startsWith("'"), true);
  });

  it("round-trips TOTP secret generation", () => {
    const secret = generateTotpSecret();
    assert.ok(secret.length >= 16);
    assert.equal(verifyTotp(secret, "000000"), false);
  });

  it("verifies webhook HMAC", () => {
    const body = JSON.stringify({ ping: true });
    const sig = signWebhookBody("whsec_test", body);
    assert.equal(verifyWebhookSignature("whsec_test", body, sig), true);
    assert.equal(verifyWebhookSignature("whsec_test", body, "sha256=dead"), false);
  });

  it("encrypts MFA secrets with AES-256-GCM", () => {
    const enc = encryptSecret("JBSWY3DPEHPK3PXP");
    assert.notEqual(enc, "JBSWY3DPEHPK3PXP");
    assert.equal(decryptSecret(enc), "JBSWY3DPEHPK3PXP");
  });

  it("ships RLS migration 032", () => {
    const mig = join(here, "../../../../db/migrations/032_security_hardening.sql");
    assert.equal(existsSync(mig), true);
    const sql = readFileSync(mig, "utf8");
    assert.ok(sql.includes("ENABLE ROW LEVEL SECURITY"));
    assert.ok(sql.includes("ncs_app"));
    assert.ok(sql.includes("revoked_tokens"));
  });

  it("ships FORCE RLS migration 033", () => {
    const mig = join(here, "../../../../db/migrations/033_force_rls_webhooks.sql");
    assert.equal(existsSync(mig), true);
    const sql = readFileSync(mig, "utf8");
    assert.ok(sql.includes("FORCE ROW LEVEL SECURITY"));
    assert.ok(sql.includes("organization_webhooks") || sql.includes("organization_id"));
  });
});
