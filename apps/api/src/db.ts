import { AsyncLocalStorage } from "node:async_hooks";
import pg from "pg";

const connectionString = (() => {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be set in production.");
  }
  return "postgresql://newcarboscan:newcarboscan@localhost:5432/newcarboscan";
})();

export const rawPool = new pg.Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX ?? 20),
});

export type TenantStore = {
  organizationId?: string;
  userId?: string;
  superadmin?: boolean;
  client?: pg.PoolClient;
};

export const tenantAls = new AsyncLocalStorage<TenantStore>();

export const pool: pg.Pool = new Proxy(rawPool, {
  get(target, prop, receiver) {
    if (
      prop === "connect" ||
      prop === "end" ||
      prop === "on" ||
      prop === "once" ||
      prop === "off" ||
      prop === "addListener" ||
      prop === "removeListener" ||
      prop === "emit"
    ) {
      const value = Reflect.get(target, prop, receiver) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    }
    const store = tenantAls.getStore();
    const obj: object = store?.client ?? target;
    const value = Reflect.get(obj, prop, obj) as unknown;
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(obj) : value;
  },
}) as pg.Pool;

export async function beginTenantTx(input: {
  organizationId?: string;
  userId?: string;
  superadmin?: boolean;
}): Promise<void> {
  const store = tenantAls.getStore();
  if (!store) return;
  if (!store.client) {
    store.client = await rawPool.connect();
    await store.client.query("BEGIN");
  }
  store.organizationId = input.organizationId ?? store.organizationId;
  store.userId = input.userId ?? store.userId;
  store.superadmin = input.superadmin ?? store.superadmin;
  await store.client.query(`SELECT set_config('app.user_id', $1, true)`, [
    store.userId ?? "",
  ]);
  await store.client.query(`SELECT set_config('app.organization_id', $1, true)`, [
    store.organizationId ?? "",
  ]);
  await store.client.query(`SELECT set_config('app.is_superadmin', $1, true)`, [
    store.superadmin ? "true" : "false",
  ]);
}

export async function endTenantTx(commit: boolean): Promise<void> {
  const store = tenantAls.getStore();
  const client = store?.client;
  if (!store || !client) return;
  store.client = undefined;
  try {
    await client.query(commit ? "COMMIT" : "ROLLBACK");
  } catch {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
  } finally {
    client.release();
  }
}

export async function withOrgClient<T>(
  organizationId: string,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const store = tenantAls.getStore();
  if (store?.client) {
    await store.client.query(
      `SELECT set_config('app.organization_id', $1, true)`,
      [organizationId],
    );
    return fn(store.client);
  }
  const client = await rawPool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT set_config('app.organization_id', $1, true)`, [
      organizationId,
    ]);
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
