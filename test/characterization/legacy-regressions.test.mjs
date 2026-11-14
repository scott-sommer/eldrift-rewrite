import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'vitest';
const { fixtures } = JSON.parse(fs.readFileSync(new URL('../fixtures/legacy/excerpts.json', import.meta.url), 'utf8'));
function source(file, name) {
  assert.equal(fixtures[name].file, file);
  return fixtures[name].source;
}
function probe(name, fn) { test(name, fn); }
const patch = fixtures.positionPatch.source;
function equalContext() {
  const context = vm.createContext({});
  vm.runInContext('class RoomPosition { constructor(x,y,roomName){this.x=x;this.y=y;this.roomName=roomName;} isEqualTo(x,y){return this.x===x && this.y===y;} };' + patch, context);
  return context;
}
probe('Position equality ignores room identity',()=>{const actual=vm.runInContext('new RoomPosition(10,10,"W1N1").isEqualTo(new RoomPosition(10,10,"W9N9"))',equalContext());assert.equal(actual,true);return{expected:false,observed:actual,finding:'Different rooms compare equal',location:'main.js:61'};});
probe('Position equality conflates opposite room borders',()=>{const actual=vm.runInContext('new RoomPosition(0,10,"W1N1").isEqualTo(new RoomPosition(49,10,"W1N1"))',equalContext());assert.equal(actual,true);return{expected:false,observed:actual,location:'main.js:67'};});
probe('Position numeric overload loses method receiver',()=>{let err;try{vm.runInContext('new RoomPosition(10,10,"W1N1").isEqualTo(10,10)',equalContext())}catch(e){err=e.name}assert.equal(err,'TypeError');return{expected:true,observed:err,location:'main.js:83',limit:'Original API method represented by a receiver-dependent class method; actual Screeps exception text not tested.'};});
probe('Existing construction sites are counted twice',()=>{
 const entries=[1,2,3,4].map(x=>({t:'extension',pos:{x,y:10},level:2,distance:x,key:'extension:'+x+':10'}));let calls=0;
 const sites=entries.slice(0,3).map(e=>({structureType:e.t,pos:e.pos}));
 const room={controller:{level:2},find:type=>type==='sites'?sites:[],createConstructionSite(){calls++;return 0}};
 const context={Memory:{build:{W1N1:{extension:entries}}},Game:{rooms:{W1N1:room}},roomLayout:{sortEntries:e=>e.slice()},console:{log(){}},STRUCTURE_CONTAINER:'container',STRUCTURE_EXTENSION:'extension',STRUCTURE_ROAD:'road',STRUCTURE_SPAWN:'spawn',FIND_MY_STRUCTURES:'structures',FIND_MY_CONSTRUCTION_SITES:'sites',LOOK_STRUCTURES:'structures',LOOK_CONSTRUCTION_SITES:'sites',CONTROLLER_STRUCTURES:{extension:{2:5,3:10}},OK:0,ERR_FULL:-8,
 RoomPosition:class{constructor(x,y){this.x=x;this.y=y}lookFor(type){return type==='sites'?sites.filter(s=>s.pos.x===this.x):[]}}};
 vm.runInNewContext(source('utilV2.js','shouldDeferPlannedSourceContainer')+'\n'+source('utilV2.js','checkPlannedConstructions')+';checkPlannedConstructions();',context);assert.equal(calls,0);
 return{expected:'1 new extension site (3 existing; cap 5)',observed:calls,location:'utilV2.js:3192',limit:'Focused construction adapter stubs, not a server simulation.'};
});
probe('Preferred fitting layout bypasses alternative scoring',()=>{
 let alternativeCalls=0;const standard={name:'standard',canFitRoom:()=>true,getSuitabilityScore:()=>1};const constrained={name:'constrained',canFitRoom:()=>{alternativeCalls++;return true},getSuitabilityScore:()=>100};
 const c={ROOM_LAYOUT_STRATEGIES:[standard,constrained]};const actual=vm.runInNewContext(source('room.layout.js','selectRoomLayoutStrategy')+';selectRoomLayoutStrategy({}).name',c);assert.equal(actual,'standard');assert.equal(alternativeCalls,0);
 return{observed:actual,alternativeCalls,location:'room.layout.js:31',classification:'Confirmed policy constraint; not an unintended bug'};
});
probe('Road planner accepts incomplete search result',()=>{
 const partial=[{x:5,y:5}];const c={getRoomAnalysis:()=>({}),PathFinder:{search:()=>({incomplete:true,path:partial})}};
 const result=vm.runInNewContext(source('room.layout.shared.js','buildRoadPath')+';buildRoadPath({name:"W1N1"},{x:1,y:1},{x:20,y:20},new Set(),new Set())',c);assert.equal(result,partial);
 return{expected:'An explicit incomplete result or failed connection',observed:'Partial path returned as a road path',location:'room.layout.shared.js:954'};
});
