import {parseReviews,validateAnalysis,counts} from './core.js';
import {esc,tree,frame,treemap} from './visuals.js';
const $=id=>document.getElementById(id);
let current=null,controller=null,inputIsExample=false;
const text=(id,value)=>{$(id).textContent=value;};
const status=(message,error=false)=>{text('status',message);$('status').classList.toggle('error',error);};
const refs=ids=>[...new Set(ids)].map(id=>`<button class="ref" type="button" data-evidence="${esc(id)}">${esc(id)} ↗</button>`).join(' ');
const para=s=>`<p>${esc(s)}</p>`;
function updateCount(){const value=$('review-input').value;let label;try{label=`${parseReviews(value).length} ulasan`;}catch(e){label=value.trim()?e.message:'0 ulasan';}text('count',label);text('char-count',`${value.length.toLocaleString('id-ID')} / 18.000 karakter per proses`);}
function endpoint(){const value=$('endpoint').value.trim();const url=new URL(value);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Alamat backend harus menggunakan HTTPS.');if(url.username||url.password||url.search||url.hash)throw Error('Gunakan alamat endpoint tanpa sandi atau parameter.');return url.href;}
$('endpoint').value=window.APP_CONFIG?.apiUrl||'';
$('save-settings').onclick=()=>{try{endpoint();if(!$('token').value.trim())throw Error('Isi kode akses peneliti.');text('connection','Koneksi disiapkan · belum diuji');status('Pengaturan siap. Koneksi akan diperiksa saat Anda memilih Analisis.');$('connection')?.focus();}catch(e){status(e.message,true);}};
$('review-input').addEventListener('input',()=>{inputIsExample=false;updateCount();if(current)status('Input berubah. Hasil di bawah tetap berasal dari proses sebelumnya sampai analisis baru berhasil.');});
$('example').onclick=()=>{$('review-input').value='Jalan menuju pantai rusak dan perjalanan melelahkan. Namun setelah tiba, pemandangannya membuat rasa lelah terbayar. Saya ingin kembali.\n---\nPantainya indah, tetapi sampah di dekat parkir membuat saya kurang nyaman. Semoga kebersihannya lebih diperhatikan.';inputIsExample=true;updateCount();status('Contoh buatan dimasukkan, bukan data penelitian. Tombol Analisis tetap memerlukan koneksi AI.');};
$('cancel').onclick=()=>controller?.abort();
$('analysis-form').addEventListener('submit',async event=>{
 event.preventDefault();let url,reviews;const raw=$('review-input').value;const example=inputIsExample;
 try{reviews=parseReviews(raw);url=endpoint();if(!$('token').value.trim())throw Error('Buka Pengaturan koneksi AI dan isi kode akses peneliti.');}catch(e){status(e instanceof TypeError?'Backend AI belum diatur. Buka Pengaturan koneksi AI.':e.message,true);return;}
 controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),170000);
 $('analyze').disabled=true;$('cancel').hidden=false;$('review-input').disabled=true;$('example').disabled=true;
 status(`Menganalisis ${reviews.length} ulasan: membaca kutipan, mengembangkan kategori, dan menyiapkan visualisasi…`);
 try{
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${$('token').value.trim()}`},body:JSON.stringify({text:raw}),signal:controller.signal});
  let result;try{result=await response.json();}catch{throw Error('Backend tidak mengirim JSON. Periksa alamat endpoint /analyze.');}
  if(!response.ok)throw Error(result.error||`Backend gagal (${response.status}).`);
  if(JSON.stringify(result.reviews)!==JSON.stringify(reviews))throw Error('Ulasan pada respons tidak sesuai dengan input.');
  validateAnalysis(result.analysis,reviews);
  if(typeof result.run_id!=='string'||typeof result.created_at!=='string'||typeof result.model!=='string')throw Error('Metadata hasil tidak lengkap.');
  current={...result,input_kind:example?'Contoh buatan — bukan data penelitian':'Input peneliti',researcher_memo:''};$('memo').value='';render();text('connection','AI terhubung');status('Analisis selesai. Periksa kutipan, kategori, dan hubungan sebelum menggunakan hasil penelitian.');$('results').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){status(e.name==='AbortError'?'Permintaan dihentikan atau melewati batas waktu. Proses di server mungkin masih berjalan. Hasil sebelumnya tetap tersedia.':`${e.message}${e instanceof TypeError?' Periksa koneksi internet, endpoint, dan ALLOWED_ORIGIN backend.':''}`,true);}
 finally{clearTimeout(timer);controller=null;$('analyze').disabled=false;$('cancel').hidden=true;$('review-input').disabled=false;$('example').disabled=false;}
});
function render(){const a=current.analysis;$('results').hidden=false;
 text('run-meta',`${current.input_kind} · ${new Date(current.created_at).toLocaleString('id-ID')} · ${current.model} · ID ${current.run_id}`);
 const segments=new Set(a.open.map(o=>JSON.stringify([o.review_id,o.quote]))).size;
 $('stats').innerHTML=[[current.reviews.length,'Ulasan sumber'],[segments,'Potongan unik'],[a.open.length,'Penerapan kode'],[a.axial.length,'Kategori axial']].map(([n,l])=>`<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('');
 $('open-content').innerHTML=a.open.length?`<div class="table-scroll"><table><thead><tr><th>ID / Sumber</th><th>Potongan teks bermakna</th><th>Kode</th><th>Makna</th></tr></thead><tbody>${a.open.map(o=>`<tr><td>${refs([o.id])}<br>${esc(o.review_id)}</td><td class="quote">“${esc(o.quote)}”</td><td>${esc(o.code)}</td><td>${esc(o.meaning)}</td></tr>`).join('')}</tbody></table></div>`:para('Tidak ditemukan potongan bermakna yang dapat dikodekan.');
 $('axial-content').innerHTML=a.axial.map(c=>`<div class="category"><h4>${esc(c.id)} · ${esc(c.category)}</h4>${c.subcategories.map(s=>`<p><strong>${esc(s.name)}</strong><br>${refs(s.open_ids)}</p>`).join('')}<p><strong>Hubungan:</strong> ${esc(c.relationship)}</p><p><strong>Variasi:</strong> ${esc(c.variation)}</p></div>`).join('')||para('Belum ada kategori axial.');
 const s=a.selective;
 $('selective-content').innerHTML=`<div class="core"><div class="eyebrow">USULAN KATEGORI INTI</div><h4>${esc(s.core_category||'Bukti belum memadai')}</h4>${para(s.explanation)}</div><p><strong>Kategori pendukung:</strong> ${esc(s.axial_ids.join(', ')||'Belum tersedia')}</p>${refs(s.evidence_ids)}<h4>Kasus yang berbeda / bertentangan</h4>${para(s.counterexamples)}<h4>Batas interpretasi</h4>${para(s.limitations)}`;
 $('node-content').innerHTML=tree(a);$('frame-content').innerHTML=frame(a);renderTreemap();
 text('interpretation',a.interpretation.text);$('interpretation').insertAdjacentHTML('beforeend',`<div>${refs(a.interpretation.evidence_ids)}</div>`);
 $('limitations').innerHTML=`<ul>${a.limitations.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><p>Ulasan tanpa coding: ${esc(a.uncoded_review_ids.join(', ')||'Tidak ada')}.</p>`;
 $('sources').innerHTML=current.reviews.map(r=>`<div class="source"><strong>${esc(r.id)}</strong>\n${esc(r.text)}</div>`).join('');
 document.querySelectorAll('.diagram-actions').forEach(el=>{const has=!!$(el.dataset.target).querySelector('svg');el.innerHTML=has?`<button class="button secondary" data-download="${el.dataset.target}" data-format="svg">Unduh SVG</button><button class="button secondary" data-download="${el.dataset.target}" data-format="png">Unduh PNG</button>`:'';});
}
function renderTreemap(){if(!current)return;$('treemap-content').innerHTML=treemap(current.analysis,$('metric').value);$('treemap-legend').innerHTML=counts(current.analysis,$('metric').value).map(c=>`<span class="legend">${esc(c.id)} · ${esc(c.label)}: <strong>${c.value}</strong></span>`).join('');}
$('metric').onchange=renderTreemap;
function showEvidence(ids){if(!current)return;const set=new Set(ids.split(','));const rows=current.analysis.open.filter(o=>set.has(o.id));$('evidence-content').innerHTML=rows.map(o=>{const r=current.reviews.find(r=>r.id===o.review_id);return `<h4>${esc(o.id)} · ${esc(o.code)} · ${esc(o.review_id)}</h4><blockquote>${esc(o.quote)}</blockquote>${para(o.meaning)}<details><summary>Lihat ulasan utuh</summary><div class="source">${esc(r.text)}</div></details>`;}).join('')||para('Belum ada bukti.');$('evidence-dialog').showModal();}
document.addEventListener('click',e=>{const ev=e.target.closest('[data-evidence]');if(ev)showEvidence(ev.dataset.evidence);const dl=e.target.closest('[data-download]');if(dl)downloadDiagram(dl.dataset.download,dl.dataset.format).catch(err=>status(err.message,true));});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('svg [data-evidence]')){e.preventDefault();showEvidence(e.target.dataset.evidence);}});
$('close-dialog').onclick=()=>$('evidence-dialog').close();
function save(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function downloadDiagram(id,format){const element=$(id).querySelector('svg');if(!element)return;const copy=element.cloneNode(true);copy.querySelectorAll('text').forEach(t=>t.setAttribute('font-family','Arial, Helvetica, sans-serif'));const xml=new XMLSerializer().serializeToString(copy);const blob=new Blob([xml],{type:'image/svg+xml;charset=utf-8'});const name=`${id}-${current.run_id}`;
 if(format==='svg'){save(blob,`${name}.svg`);return;}
 const url=URL.createObjectURL(blob);try{const image=new Image();image.src=url;await image.decode();const view=element.viewBox.baseVal;const scale=Math.min(2,14000/view.height,14000/view.width,Math.sqrt(24000000/(view.width*view.height)));const canvas=document.createElement('canvas');canvas.width=Math.round(view.width*scale);canvas.height=Math.round(view.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw Error('PNG terlalu besar. Gunakan SVG.');save(png,`${name}.png`);}finally{URL.revokeObjectURL(url);}
}
$('memo').oninput=()=>{if(current)current.researcher_memo=$('memo').value;};
$('export-json').onclick=()=>{if(current)save(new Blob([JSON.stringify({...current,treemap_basis:$('metric').value},null,2)],{type:'application/json'}),`analisis-narasi-${current.run_id}.json`);};
$('export-report').onclick=()=>{
 if(!current)return;const clone=$('results').cloneNode(true);clone.querySelectorAll('.ref').forEach(e=>{const span=document.createElement('span');span.textContent=e.textContent;span.className='ref';e.replaceWith(span);});clone.querySelectorAll('button,.export-bar,.results-nav,.diagram-actions').forEach(e=>e.remove());clone.querySelectorAll('textarea').forEach(e=>{const p=document.createElement('p');p.textContent=$('memo').value||'Belum ada catatan peninjauan.';e.replaceWith(p);});clone.querySelectorAll('details').forEach(e=>e.open=true);clone.querySelectorAll('select').forEach(e=>{const p=document.createElement('p');p.textContent=$('metric').selectedOptions[0].textContent;e.replaceWith(p);});
 const html=`<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Laporan Analisis Narasi</title><style>body{font:14px/1.6 Arial;color:#183b3a;max-width:1100px;margin:30px auto;padding:20px}h2,h3{font-family:Georgia}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:10px;text-align:left}svg{width:100%;height:auto}text{font-family:Arial}.panel{margin:30px 0;padding:20px;border:1px solid #ccc}.stats{display:flex;gap:30px}.stat b{display:block;font-size:25px}.source,blockquote{white-space:pre-wrap}.source{border-top:1px solid #ddd;padding:12px}.ref{font-size:11px} @media print{.panel{break-inside:avoid}}</style><body><h1>Analisis Narasi Pengalaman Wisatawan</h1><p>Emilianus Aloysius Fernando · NIM 2581011002 · Universitas Udayana · 2026</p><p>Hasil usulan AI, bukan teori final. Format data sumber lengkap tersedia dalam ekspor JSON.</p>${clone.outerHTML}</body></html>`;
 save(new Blob([html],{type:'text/html;charset=utf-8'}),`laporan-narasi-${current.run_id}.html`);
};
$('print').onclick=()=>window.print();
updateCount();
