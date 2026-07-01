import { pgTable, pgEnum, uuid, text, timestamp, primaryKey, jsonb } from 'drizzle-orm/pg-core';

export const severityEnum = pgEnum('severity_enum', ['Critical', 'High', 'Medium', 'Low']);
export const statusEnum = pgEnum('status_enum', ['Open', 'InProgress', 'Resolved', 'Closed']);

export const users = pgTable('users', {
  userId: uuid('user_id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const groups = pgTable('groups', {
  groupId: uuid('group_id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userGroups = pgTable(
  'user_groups',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.groupId),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.groupId] }),
  })
);

export const incidents = pgTable('incidents', {
  incidentId: uuid('incident_id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  severity: severityEnum('severity').notNull(),
  status: statusEnum('status').notNull().default('Open'),
  reporterId: uuid('reporter_id')
    .notNull()
    .references(() => users.userId),
  assigneeId: uuid('assignee_id').references(() => users.userId),
  targetGroupId: uuid('target_group_id')
    .notNull()
    .references(() => groups.groupId),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  aiSummary: text('ai_summary'),
  aiSummaryGeneratedAt: timestamp('ai_summary_generated_at', { withTimezone: true }),
  aiRootCause: jsonb('ai_root_cause').$type<string[]>(),
  aiRootCauseGeneratedAt: timestamp('ai_root_cause_generated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const incidentComments = pgTable('incident_comments', {
  commentId: uuid('comment_id').primaryKey().defaultRandom(),
  incidentId: uuid('incident_id')
    .notNull()
    .references(() => incidents.incidentId),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.userId),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
