import { sql } from "drizzle-orm";
import { db, type DB } from "@/lib/db";
import { magicLinkRateLimits } from "@/lib/db/schema";

export const MAGIC_LINK_RATE_LIMIT_MAX_ATTEMPTS = 3;
export const MAGIC_LINK_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export interface MagicLinkRateLimitRow {
  attemptCount: number;
  windowStart: string;
}

export interface MagicLinkRateLimitResult {
  allowed: boolean;
  attempts: number;
  retryAfterSeconds: number;
}

export interface MagicLinkRateLimitStore {
  increment(
    identifier: string,
    nowIso: string,
    resetBeforeIso: string
  ): Promise<MagicLinkRateLimitRow>;
}

export class DrizzleMagicLinkRateLimitStore implements MagicLinkRateLimitStore {
  constructor(private readonly database: DB = db) {}

  async increment(
    identifier: string,
    nowIso: string,
    resetBeforeIso: string
  ): Promise<MagicLinkRateLimitRow> {
    const [row] = await this.database
      .insert(magicLinkRateLimits)
      .values({
        identifier,
        attemptCount: 1,
        windowStart: nowIso,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: magicLinkRateLimits.identifier,
        set: {
          attemptCount: sql<number>`
            CASE
              WHEN ${magicLinkRateLimits.windowStart} <= ${resetBeforeIso}
              THEN 1
              ELSE ${magicLinkRateLimits.attemptCount} + 1
            END
          `,
          windowStart: sql<string>`
            CASE
              WHEN ${magicLinkRateLimits.windowStart} <= ${resetBeforeIso}
              THEN ${nowIso}
              ELSE ${magicLinkRateLimits.windowStart}
            END
          `,
          updatedAt: nowIso,
        },
      })
      .returning({
        attemptCount: magicLinkRateLimits.attemptCount,
        windowStart: magicLinkRateLimits.windowStart,
      });

    if (!row) {
      throw new Error("Magic link rate-limit upsert returned no row");
    }

    return row;
  }
}

export function normalizeMagicLinkIdentifier(email: string): string {
  return email.trim().toLowerCase();
}

export async function checkMagicLinkRateLimit(
  email: string,
  {
    now = new Date(),
    maxAttempts = MAGIC_LINK_RATE_LIMIT_MAX_ATTEMPTS,
    windowMs = MAGIC_LINK_RATE_LIMIT_WINDOW_MS,
    store = new DrizzleMagicLinkRateLimitStore(),
  }: {
    now?: Date;
    maxAttempts?: number;
    windowMs?: number;
    store?: MagicLinkRateLimitStore;
  } = {}
): Promise<MagicLinkRateLimitResult> {
  const identifier = normalizeMagicLinkIdentifier(email);
  const resetBeforeIso = new Date(now.getTime() - windowMs).toISOString();
  const row = await store.increment(identifier, now.toISOString(), resetBeforeIso);
  const windowEndMs = new Date(row.windowStart).getTime() + windowMs;
  const retryAfterSeconds = Math.max(
    0,
    Math.ceil((windowEndMs - now.getTime()) / 1000)
  );

  return {
    allowed: row.attemptCount <= maxAttempts,
    attempts: row.attemptCount,
    retryAfterSeconds,
  };
}
