import test from 'node:test';
import assert from 'node:assert/strict';
import { nextGroupedSet, workoutBlocks } from '../src/lib/workout-navigation.ts';
import { parseWorkoutLocally } from '../supabase/functions/_shared/workout-parser.ts';

test('superserie alterna A/B, recupera solo a fine giro e conserva le serie', () => {
  const exercises = [{id:'warm'}, {id:'a',superset_group:'Braccia'}, {id:'b',superset_group:'Braccia'}, {id:'end'}];
  const rows = {warm:[{completed:true}], a:Array.from({length:3},()=>({completed:false})), b:Array.from({length:3},()=>({completed:false})), end:[{completed:false}]};
  assert.deepEqual(workoutBlocks(exercises), [[0],[1,2],[3]]);
  for(let i=0;i<3;i++) {
    rows.a[i].completed=true;
    assert.deepEqual(nextGroupedSet(exercises,rows,{exerciseIndex:1,setIndex:i}),{next:{exerciseIndex:2,setIndex:i},rest:false});
    rows.b[i].completed=true;
    assert.deepEqual(nextGroupedSet(exercises,rows,{exerciseIndex:2,setIndex:i}),{next:i<2?{exerciseIndex:1,setIndex:i+1}:{exerciseIndex:3,setIndex:0},rest:true});
  }
  rows.end[0].completed=true;
  assert.deepEqual(nextGroupedSet(exercises,rows,{exerciseIndex:3,setIndex:0}),{next:null,rest:false});
});

test('superserie gestisce serie disuguali e non ritorna su serie già registrate', () => {
  const exercises=[{id:'a',superset_group:'x'},{id:'b',superset_group:'x'}];
  const rows={a:[{completed:true},{completed:false}], b:[{completed:true}]};
  assert.deepEqual(nextGroupedSet(exercises,rows,{exerciseIndex:1,setIndex:0}),{next:{exerciseIndex:0,setIndex:1},rest:true});
});

test('importazione mantiene superserie, note, serie per lato ed eccezione Dead Bug', () => {
  const parsed=parseWorkoutLocally('GIORNO: Test\nCurl\nSerie: 3\nRipetizioni: 8-12\nSuperserie: Braccia\nRecupero: 75 secondi\nNota: Recupero originale 60-75 secondi\nPushdown\nSerie: 3\nRipetizioni: 10-15\nSuperserie: Braccia\nRecupero: 75 secondi\nDead Bug\nSerie: 2 per lato\nRipetizioni: 6-8 per lato\nMonopodalico: no');
  assert.equal(parsed[0].exercises.length,3);
  assert.equal(parsed[0].exercises[0].superset_group,'Braccia');
  assert.equal(parsed[0].exercises[0].objective,'Recupero originale 60-75 secondi');
  assert.equal(parsed[0].exercises[2].sets,2);
  assert.equal(parsed[0].exercises[2].is_unilateral,false);
});
