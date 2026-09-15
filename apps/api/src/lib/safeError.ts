export function clientSafeError(
  err: unknown,
  fallback = "Une erreur interne est survenue",
): string {
  if (process.env.NODE_ENV !== "production" && err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
