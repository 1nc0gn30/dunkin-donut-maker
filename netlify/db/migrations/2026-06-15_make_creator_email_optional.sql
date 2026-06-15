-- Migration: Make creator_email optional to match the UI/function behavior
-- The frontend and submit-donut function treat email as optional, but the
-- original schema declared creator_email NOT NULL, causing 500 errors when
-- users submitted without an email address.

ALTER TABLE donut_submissions ALTER COLUMN creator_email DROP NOT NULL;
