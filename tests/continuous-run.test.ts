import test from "node:test";
import assert from "node:assert/strict";
import {parseRunDuration,runPace} from "../src/lib/continuous-run.ts";
test("durata corsa interpreta minuti e ore senza accettare secondi fuori intervallo",()=>{
  assert.equal(parseRunDuration("42:30"),2550);
  assert.equal(parseRunDuration("1:05:20"),3920);
  for(const bad of ["0:00","42:60","-1:30","42","1:90:00","abc"])assert.equal(parseRunDuration(bad),null);
});
test("passo arrotonda con riporto dei secondi e gestisce dati mancanti",()=>{
 assert.equal(runPace(10000,2640),"4:24/km");
 assert.equal(runPace(1000,299.8),"5:00/km");
 assert.equal(runPace(0,300),"—");
});
