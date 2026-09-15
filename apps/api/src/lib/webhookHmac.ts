import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhookBody(secret: string, rawBody: string): string {
  const hex = createHmac("sha256", secret).update(rawBody).digest("hex");
  return `sha256=${hex}`;
}

export function verifyWebhookSignature(
  secret: string,
  rawBody: string,
  header: string | undefined,
): boolean {
  if (!header) return false;
  const expected = signWebhookBody(secret, rawBody);
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}
