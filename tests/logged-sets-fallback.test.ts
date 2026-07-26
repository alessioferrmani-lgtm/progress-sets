import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const helper = readFileSync("src/lib/logged-sets.ts", "utf8");
const guidedRun = readFileSync("src/routes/_authenticated/workouts/$templateId/run.tsx", "utf8");
const freeRun = readFileSync("src/routes/_authenticated/workouts/free.tsx", "utf8");

test("logged set writes retry only when the legacy schema lacks user_id", () => {
  assert.match(helper, /isMissingLoggedSetsUserIdError/);
  assert.match(helper, /message\.includes\("schema cache"\)/);
  assert.match(helper, /const \{ user_id: _legacyOwner, \.\.\.legacyPayload \} = payload/);
  assert.match(helper, /insert\(legacyPayload\)/);
  assert.match(guidedRun, /insertLoggedSet\(/);
  assert.match(freeRun, /insertLoggedSet\(/);
});
