-- Migration: Add missing columns (safe to run, errors for existing columns can be ignored)
-- Run: wrangler d1 execute memos-worker --file=src/migration_add_columns.sql

ALTER TABLE notes ADD COLUMN is_favorited INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE notes ADD COLUMN is_archived INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE notes ADD COLUMN pics TEXT;
ALTER TABLE notes ADD COLUMN videos TEXT;
