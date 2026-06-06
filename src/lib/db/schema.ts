import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { withTimezone: true, mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
    index("idx_accounts_user_id").on(account.userId),
  ]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

export const magicLinkRateLimits = pgTable(
  "magic_link_rate_limits",
  {
    identifier: text("identifier").primaryKey(),
    attemptCount: integer("attempt_count").notNull().default(0),
    windowStart: timestamp("window_start", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_magic_link_rate_limits_updated_at").on(table.updatedAt),
  ]
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    company: text("company").notNull(),
    role: text("role").notNull(),
    url: text("url"),
    status: text("status").notNull().default("saved"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    workMode: text("work_mode"),
    location: text("location"),
    department: text("department"),
    employmentType: text("employment_type"),
    experienceLevel: text("experience_level"),
    jobId: text("job_id"),
    datePosted: date("date_posted", { mode: "string" }),
    contactName: text("contact_name"),
    jobDescription: text("job_description"),
    appliedAt: date("applied_at", { mode: "string" }),
    respondedAt: date("responded_at", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    archived: boolean("archived").notNull().default(false),
  },
  (table) => [
    index("idx_opportunities_user_id").on(table.userId),
    index("idx_opportunities_user_status").on(table.userId, table.status),
    index("idx_opportunities_user_archived").on(table.userId, table.archived),
    // Trigram GIN indexes back the ILIKE '%x%' substring search in
    // listOpportunities / getStatusCounts. Requires the pg_trgm extension
    // (created in the migration alongside these indexes). contactName is
    // intentionally not indexed in v1 — see issue #97.
    index("idx_opportunities_company_trgm").using(
      "gin",
      sql`${table.company} gin_trgm_ops`
    ),
    index("idx_opportunities_role_trgm").using(
      "gin",
      sql`${table.role} gin_trgm_ops`
    ),
    index("idx_opportunities_job_id_trgm").using(
      "gin",
      sql`${table.jobId} gin_trgm_ops`
    ),
    index("idx_opportunities_location_trgm").using(
      "gin",
      sql`${table.location} gin_trgm_ops`
    ),
  ]
);

export const statusHistory = pgTable(
  "status_history",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    note: text("note"),
    changedAt: timestamp("changed_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_status_history_opp_changed").on(
      table.opportunityId,
      table.changedAt
    ),
  ]
);

export const opportunityComments = pgTable(
  "opportunity_comments",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_opportunity_comments_opp_created").on(
      table.opportunityId,
      table.createdAt
    ),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type MagicLinkRateLimit = typeof magicLinkRateLimits.$inferSelect;
export type NewMagicLinkRateLimit = typeof magicLinkRateLimits.$inferInsert;
export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
export type StatusHistory = typeof statusHistory.$inferSelect;
export type NewStatusHistory = typeof statusHistory.$inferInsert;
export type OpportunityComment = typeof opportunityComments.$inferSelect;
export type NewOpportunityComment = typeof opportunityComments.$inferInsert;
