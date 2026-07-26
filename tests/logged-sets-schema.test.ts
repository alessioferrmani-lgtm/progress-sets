import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const repair = readFileSync(
  "supabase/migrations/20260726120000_repair_logged_sets_owner.sql",
  "utf8",
);

test("logged_sets schema repair matches the workout logger contract", () => {
  assert.match(
    repair,
    /ALTER TABLE public\.logged_sets[\s\S]*ADD COLUMN IF NOT EXISTS user_id UUID/,
  );
  assert.match(repair, /SET user_id = ws\.user_id/);
  assert.match(repair, /ALTER COLUMN user_id SET NOT NULL/);
  assert.match(repair, /CREATE POLICY "logged_sets_own"/);
  assert.match(repair, /NOTIFY pgrst, 'reload schema'/);
});
