import test from 'node:test';
import assert from 'node:assert/strict';
import {strengthInsight,runningInsight,parseDayPlan,parseWeekPlan} from '../src/lib/home-insights.ts';
const set=(session_id:string,weight_kg:number,reps=8,side='both',reps_type='count')=>({session_id,exercise_id:'bench',exercise_name:'Panca',weight_kg,reps,side,reps_type,completed_at:session_id==='now'?'2026-10-07T10:00:00Z':'2026-10-03T10:00:00Z'});
test('confronta la migliore serie della precedente seduta a parità di quantità e lato',()=>{
 assert.equal(strengthInsight([set('now',32),set('old',30),set('old',28)],new Set(['now','old']))?.delta,2);
 assert.equal(strengthInsight([set('now',32),set('old',30,10)],new Set(['now','old'])),null);
 assert.equal(strengthInsight([set('now',32,8,'left'),set('old',30,8,'right')],new Set(['now','old'])),null);
 assert.equal(strengthInsight([set('now',32,8,'both','time'),set('old',30)],new Set(['now','old'])),null);
});
test('non spaccia sedute in corso o una vecchia serie debole per un progresso',()=>{
 assert.equal(strengthInsight([set('now',32),set('old',30)],new Set(['old'])),null);
 assert.equal(strengthInsight([set('now',32),set('old',30),set('old',34)],new Set(['now','old'])),null);
});
test('le ripetute richiedono stesso numero, distanze e recuperi registrati',()=>{
 const reps=(time:number,rest:number|null=60)=>[{distance_m:300,time_sec:time,rest_sec:rest},{distance_m:300,time_sec:time,rest_sec:rest}];
 const a={id:'a',date:'2026-10-07',interval_reps:reps(58)},b={id:'b',date:'2026-10-01',interval_reps:reps(60)};
 assert.equal(runningInsight([a,b])?.delta,2);
 assert.equal(runningInsight([a,{...b,interval_reps:reps(60,90)}]),null);
 assert.equal(runningInsight([{...a,interval_reps:reps(58,null)},b]),null);
});
test('programma vuoto e preferenze errate non inventano sedute',()=>{
 assert.equal(parseDayPlan({kind:'gym'}),null);
 assert.deepEqual(parseWeekPlan(null),Array(7).fill(null));
 assert.deepEqual(parseDayPlan({kind:'rest'}),{kind:'rest'});
});
