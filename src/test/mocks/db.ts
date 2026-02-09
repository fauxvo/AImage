import { vi, type Mock } from "vitest";

/** A single link in the Drizzle query chain */
export interface DrizzleChain {
  from: Mock;
  where: Mock;
  orderBy: Mock;
  set: Mock;
  values: Mock;
  onConflictDoUpdate: Mock;
  returning: Mock;
  limit: Mock;
  offset: Mock;
  get: Mock;
  all: Mock;
  then: (onFulfilled?: (v: any) => any, onRejected?: (e: any) => any) => Promise<any>;
}

/**
 * Chainable Drizzle mock — builds a thenable chain so both
 *   `await db.select().from(t).where(c).get()`   → single row
 *   `await db.select().from(t).orderBy(c)`        → array
 *   `const [row] = await db.insert(t).values(v).returning()` → array
 * all work out of the box.
 *
 * Any method passed in `overrides` becomes terminal (returns the
 * override value instead of continuing the chain). Methods not in
 * `overrides` return `self` to keep chaining.
 *
 * Usage:
 *   db.select.mockReturnValue(chain({ get: row }));
 *   db.select.mockReturnValue(chain({ _resolve: [r1, r2] }));
 */
export function chain(overrides: Record<string, unknown> = {}): DrizzleChain {
  const { _resolve = [], ...rest } = overrides;

  const obj: Record<string, any> = {};
  const self = () => obj;

  // Thenable — resolves when the chain is awaited directly
  obj.then = (onFulfilled?: (v: any) => any, onRejected?: (e: any) => any) =>
    Promise.resolve(_resolve).then(onFulfilled, onRejected);

  // Chaining methods — return self unless overridden
  const methods = [
    "from",
    "where",
    "orderBy",
    "set",
    "values",
    "onConflictDoUpdate",
    "returning",
    "limit",
    "offset",
  ];
  for (const m of methods) {
    obj[m] = m in rest ? vi.fn().mockReturnValue(rest[m]) : vi.fn().mockImplementation(self);
  }

  // Terminal — returns a single value (or undefined)
  obj.get = "get" in rest ? vi.fn().mockReturnValue(rest.get) : vi.fn().mockReturnValue(undefined);

  // .all() — SQLite-specific, returns array. Falls back to _resolve value.
  obj.all = "all" in rest ? vi.fn().mockReturnValue(rest.all) : vi.fn().mockReturnValue(_resolve);

  return obj as DrizzleChain;
}

export interface MockDb {
  select: Mock;
  insert: Mock;
  update: Mock;
  delete: Mock;
  transaction: Mock;
}

/** Mock db instance — drop-in replacement for `@/db` */
export const db: MockDb = {
  select: vi.fn().mockReturnValue(chain()),
  insert: vi.fn().mockReturnValue(chain()),
  update: vi.fn().mockReturnValue(chain()),
  delete: vi.fn().mockReturnValue(chain()),
  transaction: vi.fn().mockImplementation(async (fn: (tx: MockDb) => Promise<void>) => {
    // The transaction callback receives a tx object with the same interface
    await fn(db);
  }),
};

/** Reset all db mocks to default (empty) chains. Call in beforeEach. */
export function resetDbMocks() {
  db.select.mockReset().mockReturnValue(chain());
  db.insert.mockReset().mockReturnValue(chain());
  db.update.mockReset().mockReturnValue(chain());
  db.delete.mockReset().mockReturnValue(chain());
  db.transaction.mockReset().mockImplementation(async (fn: (tx: MockDb) => Promise<void>) => {
    await fn(db);
  });
}
