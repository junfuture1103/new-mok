import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const rooms = sqliteTable('rooms', {
  code: text('code').primaryKey(),
  version: integer('version').notNull().default(0),
  data: text('data').notNull(),
  seen1: integer('seen1').notNull().default(0),
  seen2: integer('seen2').notNull().default(0),
  expiresAt: integer('expires_at').notNull(),
}, table => [index('idx_rooms_expiry').on(table.expiresAt)]);

export const roomLimits = sqliteTable('room_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, table => [index('idx_room_limits_expiry').on(table.expiresAt)]);
