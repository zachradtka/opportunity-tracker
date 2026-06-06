import { describe, expect, it } from "vitest";
import {
  checkMagicLinkRateLimit,
  normalizeMagicLinkIdentifier,
  type MagicLinkRateLimitRow,
  type MagicLinkRateLimitStore,
} from "./magic-link";

class InMemoryMagicLinkRateLimitStore implements MagicLinkRateLimitStore {
  private readonly rows = new Map<string, MagicLinkRateLimitRow>();

  async increment(
    identifier: string,
    nowIso: string,
    resetBeforeIso: string
  ): Promise<MagicLinkRateLimitRow> {
    const existing = this.rows.get(identifier);
    if (!existing || existing.windowStart <= resetBeforeIso) {
      const row = { attemptCount: 1, windowStart: nowIso };
      this.rows.set(identifier, row);
      return row;
    }

    const row = {
      attemptCount: existing.attemptCount + 1,
      windowStart: existing.windowStart,
    };
    this.rows.set(identifier, row);
    return row;
  }
}

describe("magic link rate limit", () => {
  it("normalizes email identifiers", () => {
    expect(normalizeMagicLinkIdentifier(" USER@Example.COM ")).toBe(
      "user@example.com"
    );
  });

  it("blocks requests after the configured per-email limit", async () => {
    const store = new InMemoryMagicLinkRateLimitStore();
    const now = new Date("2026-06-06T00:00:00.000Z");

    await expect(checkMagicLinkRateLimit("user@example.com", { now, store }))
      .resolves.toMatchObject({ allowed: true, attempts: 1 });
    await expect(checkMagicLinkRateLimit("USER@example.com", { now, store }))
      .resolves.toMatchObject({ allowed: true, attempts: 2 });
    await expect(checkMagicLinkRateLimit("user@example.com", { now, store }))
      .resolves.toMatchObject({ allowed: true, attempts: 3 });
    await expect(checkMagicLinkRateLimit("user@example.com", { now, store }))
      .resolves.toMatchObject({ allowed: false, attempts: 4 });
  });

  it("resets the counter after the window", async () => {
    const store = new InMemoryMagicLinkRateLimitStore();
    const first = new Date("2026-06-06T00:00:00.000Z");
    const afterWindow = new Date("2026-06-06T00:16:00.000Z");

    await checkMagicLinkRateLimit("user@example.com", { now: first, store });
    await checkMagicLinkRateLimit("user@example.com", { now: first, store });
    await checkMagicLinkRateLimit("user@example.com", { now: first, store });
    await expect(
      checkMagicLinkRateLimit("user@example.com", { now: first, store })
    ).resolves.toMatchObject({ allowed: false, attempts: 4 });

    await expect(
      checkMagicLinkRateLimit("user@example.com", {
        now: afterWindow,
        store,
      })
    ).resolves.toMatchObject({ allowed: true, attempts: 1 });
  });
});
