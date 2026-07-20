import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const profileRoute = readFileSync("src/routes/_authenticated/profile.tsx", "utf8");

test("la pagina Profilo rende le rotte figlie come Esporta dati", () => {
  assert.match(profileRoute, /component: ProfileRoute/);
  assert.match(profileRoute, /pathname === "\/profile"/);
  assert.match(profileRoute, /<Outlet \/>/);
});
