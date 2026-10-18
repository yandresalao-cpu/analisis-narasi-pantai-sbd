import {parseReviews,validateAnalysis,schema,PROMPT} from '../docs/core.js';
async function sameSecret(a,b){
  const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  const x=await hash(a),y=await hash(b);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;
}
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin');
  const allowed=env.ALLOWED_ORIGIN;
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
  if(origin===allowed){headers['Access-Control-Allow-Origin']=allowed;headers['Access-Control-Allow-Headers']='Content-Type, Authorization';headers['Access-Control-Allow-Methods']='POST, OPTIONS';}
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(!allowed||origin!==allowed)return reply({error:'Asal situs tidak diizinkan.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(new URL(request.url).pathname!=='/analyze')return reply({error:'Endpoint tidak ditemukan.'},404);
  if(request.method!=='POST')return reply({error:'Gunakan POST.'},405);
  if(!env.OPENAI_API_KEY||!env.ACCESS_TOKEN||!env.OPENAI_MODEL)return reply({error:'Backend belum dikonfigurasi oleh pemilik.'},503);
  if(!await sameSecret(request.headers.get('Authorization')||'',`Bearer ${env.ACCESS_TOKEN}`))return reply({error:'Kode akses peneliti salah atau belum diisi.'},401);
  if(!request.headers.get('Content-Type')?.includes('application/json'))return reply({error:'Format permintaan harus JSON.'},415);
  let reviews;
  try{
    // Read with an actual byte limit, including requests without Content-Length.
    const reader=request.body?.getReader();if(!reader)throw Error('Input kosong.');
    let bytes=0,parts=[];while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>90000){await reader.cancel();return reply({error:'Permintaan terlalu besar.'},413);}parts.push(value);}
    const joined=new Uint8Array(bytes);let offset=0;for(const p of parts){joined.set(p,offset);offset+=p.length;}
    reviews=parseReviews(JSON.parse(new TextDecoder().decode(joined)).text);
  }catch(e){return reply({error:e instanceof SyntaxError?'JSON tidak valid.':e.message},400);}
  try{
    const response=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.OPENAI_API_KEY}`},signal:AbortSignal.timeout(150000),
      body:JSON.stringify({model:env.OPENAI_MODEL,store:false,max_completion_tokens:14000,
        messages:[{role:'system',content:PROMPT},{role:'user',content:JSON.stringify({reviews})}],
        response_format:{type:'json_schema',json_schema:{name:'analisis_narasi',strict:true,schema}}})
    });
    if(!response.ok){return reply({error:response.status===429?'Layanan AI mencapai batas pemakaian atau kuota. Periksa akun API lalu coba lagi.':'Layanan AI gagal. Periksa API key, saldo, dan dukungan model pada backend.'},502);}
    const payload=await response.json();const choice=payload.choices?.[0];
    if(choice?.message?.refusal)return reply({error:'AI tidak dapat memproses input ini. Periksa ulasan yang dimasukkan.'},422);
    if(choice?.finish_reason!=='stop')return reply({error:'Keluaran AI belum lengkap. Kurangi jumlah teks per proses dan coba kembali.'},422);
    const analysis=validateAnalysis(JSON.parse(choice.message.content),reviews);
    return reply({schema_version:'1.0',prompt_version:'1.0',run_id:crypto.randomUUID(),created_at:new Date().toISOString(),model:payload.model||env.OPENAI_MODEL,status:'Draf AI — belum ditinjau',reviews,analysis});
  }catch(e){return reply({error:e.name==='TimeoutError'?'Analisis melewati batas waktu. Coba kelompok ulasan yang lebih kecil.':e instanceof SyntaxError?'Format hasil AI tidak valid. Coba kembali.':e.message?.includes('fetch')?'Tidak dapat menghubungi layanan AI. Coba kembali.':e.message},502);}
 }
};
