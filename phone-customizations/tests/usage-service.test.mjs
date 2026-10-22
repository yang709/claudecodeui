import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUsage, createUsageHandler } from '../src/server/usage-service.mjs';
const response = () => ({ headers: {}, code: 200, setHeader(k,v){this.headers[k]=v;}, status(n){this.code=n;return this;}, json(data){this.data=data;return this;} });
test('prefer multi-bucket limits; clamp percentages and preserve unknown data', () => {
 const data = normalizeUsage({rateLimits:{primary:{usedPercent:99}},rateLimitsByLimitId:{fast:{primary:{usedPercent:20,windowDurationMins:300,resetsAt:123},secondary:{usedPercent:200}},other:{primary:{usedPercent:-5},secondary:{usedPercent:null}}}},0);
 assert.equal(data.updatedAt,'1970-01-01T00:00:00.000Z');
 assert.deepEqual(data.limits.map(x=>x.windows.map(w=>w.remainingPercent)),[[80,0],[100,null]]);
 assert.equal(data.limits[0].windows[0].resetsAt,123);
 assert.equal(data.limits[0].windows[1].resetsAt,null);
});
test('legacy and empty results never imply full availability', () => {
 assert.equal(normalizeUsage({rateLimits:{primary:{usedPercent:42}}}).limits[0].windows[0].remainingPercent,58);
 assert.deepEqual(normalizeUsage({}).limits,[]);
});
test('coalesces simultaneous reads, caches successes, then expires',async()=>{
 let calls=0, time=0;const handler=createUsageHandler(async()=>{calls++;return {rateLimits:{primary:{usedPercent:10}}};},{ttl:30,now:()=>time});
 const a=response(),b=response();await Promise.all([handler({},a),handler({},b)]); assert.equal(calls,1);assert.deepEqual(a.data,b.data);assert.equal(a.headers['Cache-Control'],'no-store');
 await handler({},response());assert.equal(calls,1);time=31;await handler({},response());assert.equal(calls,2);
});
test('failures reveal no secrets, do not serve stale values and allow retry',async()=>{
 let fail=false;const handler=createUsageHandler(async()=>{if(fail)throw Error('secret-token');return {};},{ttl:0});
 await handler({},response());fail=true;const r=response();await handler({},r);assert.equal(r.code,503);assert.ok(!JSON.stringify(r.data).includes('secret-token'));fail=false;const ok=response();await handler({},ok);assert.equal(ok.code,200);
});
