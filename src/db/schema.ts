import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const eventType = pgEnum("event_type", ["pageview", "custom"]);
export const deviceType = pgEnum("device_type", ["desktop", "mobile", "tablet"]);

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt,
});

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 hash of the session token. The raw token only lives in the user's cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt,
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Hostname without protocol or path, e.g. "example.com". */
    domain: varchar("domain", { length: 253 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    /** When true the dashboard is readable by anyone at /share/{shareSlug}. */
    isPublic: boolean("is_public").notNull().default(false),
    shareSlug: varchar("share_slug", { length: 32 }).notNull().unique(),
    createdAt,
  },
  (t) => [index("sites_owner_idx").on(t.ownerId)],
);

/**
 * Append-only event log. No cookies or IP addresses are stored: `visitor_id` is a
 * truncated hash of (daily salt, site, IP, user agent), so a visitor cannot be
 * followed across sites or across days.
 */
export const events = pgTable(
  "events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    visitorId: varchar("visitor_id", { length: 16 }).notNull(),
    type: eventType("type").notNull().default("pageview"),
    /** "pageview" for page views, otherwise the custom event (goal) name. */
    name: varchar("name", { length: 64 }).notNull().default("pageview"),
    pathname: varchar("pathname", { length: 512 }).notNull(),
    /** Normalised referrer: hostname ("google.com"), UTM source, or "Direct". */
    source: varchar("source", { length: 255 }).notNull().default("Direct"),
    utmMedium: varchar("utm_medium", { length: 100 }),
    utmCampaign: varchar("utm_campaign", { length: 100 }),
    browser: varchar("browser", { length: 32 }).notNull().default("Unknown"),
    os: varchar("os", { length: 32 }).notNull().default("Unknown"),
    device: deviceType("device").notNull().default("desktop"),
    country: char("country", { length: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    // Every dashboard query filters by site and time range.
    index("events_site_created_idx").on(t.siteId, t.createdAt),
    // Sessionisation walks each visitor's events in time order.
    index("events_site_visitor_created_idx").on(t.siteId, t.visitorId, t.createdAt),
    check("events_country_format", sql`${t.country} is null or ${t.country} ~ '^[A-Z]{2}$'`),
  ],
);

export const sitesRelations = relations(sites, ({ one, many }) => ({
  owner: one(users, { fields: [sites.ownerId], references: [users.id] }),
  events: many(events),
}));

export type User = typeof users.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type AnalyticsEvent = typeof events.$inferSelect;
export type NewAnalyticsEvent = typeof events.$inferInsert;
