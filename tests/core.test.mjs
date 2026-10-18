import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReviews,validateAnalysis,counts,LIMIT} from '../docs/core.js';
import {tree,treemap,frame,esc} from '../docs/visuals.js';
import worker from '../backend/worker.js';
import {reviews,analysis} from './fixture.mjs';
test('input preserves paragraphs and splits explicit separators',()=>{
 assert.equal(parseReviews('Paragraf 1\n\nParagraf 2').length,1);
 assert.equal(parseReviews('satu\n---\ndua').length,2);
 assert.throws(()=>parseReviews('   '));assert.throws(()=>parseReviews('a'.repeat(LIMIT+1)));assert.throws(()=>parseReviews('sama\n---\nsama'));
});
test('validation rejects invented quotation, dangling evidence, duplicate IDs and missing coverage',()=>{
 assert.equal(validateAnalysis(analysis,reviews),analysis);
 for(const mutate of [a=>a.open[0].quote='Kutipan fiktif',a=>a.open[1].id='O1',a=>a.selective.evidence_ids=['O99'],a=>a.relations[0].to='A99',a=>a.uncoded_review_ids=['U001']]){const a=structuredClone(analysis);mutate(a);assert.throws(()=>validateAnalysis(a,reviews));}
 assert.throws(()=>validateAnalysis(analysis,[...reviews,{id:'U003',text:'Belum diperiksa'}]));
});
test('counts distinguish unique reviews from quotes; duplicate assignment does not inflate',()=>{
 const a=structuredClone(analysis);a.axial[1].subcategories[0].open_ids.push('O1','O2');
 assert.equal(counts(a,'reviews')[1].value,2);assert.equal(counts(a,'segments')[1].value,3);
});
test('visuals are evidence-linked SVG and escape markup',()=>{
 for(const output of [tree(analysis),frame(analysis),treemap(analysis,'reviews')]){assert.match(output,/<svg/);assert.match(output,/data-evidence/);}
 assert.equal(esc('<script>'), '&lt;script&gt;');
});
const env={ALLOWED_ORIGIN:'https://example.github.io',OPENAI_API_KEY:'test-only',OPENAI_MODEL:'test-model',ACCESS_TOKEN:'test-access'};
const req=(text,origin=env.ALLOWED_ORIGIN,token='test-access')=>new Request('https://api.example/analyze',{method:'POST',headers:{Origin:origin,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({text})});
test('backend rejects unauthorized origins, access tokens and blank input before API calls',async()=>{
 assert.equal((await worker.fetch(req('abc','https://evil.example'),env)).status,403);
 assert.equal((await worker.fetch(req('abc',undefined,'wrong'),env)).status,401);
 assert.equal((await worker.fetch(req(''),env)).status,400);
});
test('backend validates successful AI output and rejects truncated responses',async()=>{
 const original=globalThis.fetch;let finish='stop';
 globalThis.fetch=async(url,opts)=>{assert.equal(JSON.parse(opts.body).response_format.type,'json_schema');return Response.json({model:'test-model',choices:[{finish_reason:finish,message:{content:JSON.stringify(analysis)}}]});};
 try{let r=await worker.fetch(req(reviews.map(r=>r.text).join('\n---\n')),env);assert.equal(r.status,200);assert.equal((await r.json()).analysis.open.length,3);finish='length';r=await worker.fetch(req(reviews.map(r=>r.text).join('\n---\n')),env);assert.equal(r.status,422);}finally{globalThis.fetch=original;}
});
