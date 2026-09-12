import pg from "pg";

const connectionString = (() => {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be set in production.");
  }
  return "postgresql://newcarboscan:newcarboscan@localhost:5432/newcarboscan";
})();

export const pool = new pg.Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX ?? 20),
});

export async function withOrgClient<T>(
  organizationId: string,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // App-level tenant guard: set local config for policies / debugging
    await client.query(
      `SELECT set_config('app.organization_id', $1, true)`,
      [organizationId],
    );
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
