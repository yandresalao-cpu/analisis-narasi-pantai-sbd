import {counts} from './core.js';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const palette=['#255e59','#468074','#75998a','#b7aa7d','#4a7079','#8a956f','#426c62','#9b8967'];
function lines(text,limit=27){
 const result=[];let line='';for(const word of String(text).split(/\s+/)){if(word.length>limit){if(line){result.push(line);line='';}for(let i=0;i<word.length;i+=limit)result.push(word.slice(i,i+limit));continue;}if((line+' '+word).trim().length>limit){result.push(line);line=word;}else line=(line+' '+word).trim();}if(line)result.push(line);return result.length?result:[''];
}
const height=t=>Math.max(70,lines(t).length*17+40);
function label(t,x,y,limit=27,fill='#183b3a',size=12){return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}">${lines(t,limit).map((l,i)=>`<tspan x="${x}" dy="${i?17:0}">${esc(l)}</tspan>`).join('')}</text>`;}
function box(t,x,y,w,h,color,ids){return `<g tabindex="0" role="button" aria-label="${esc(t)} : lihat bukti sumber" data-evidence="${esc(ids.join(','))}"><title>${esc(t)}</title><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${color}" stroke="#cad9cf"/>${label(t,x+14,y+26)}</g>`;}
const svg=(body,h,title)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><rect width="1000" height="${h}" fill="#fbfcfa"/>${body}</svg>`;
export function tree(data){
 if(!data.axial.length)return '<p class="muted">Belum ada kategori yang didukung bukti untuk divisualisasikan.</p>';
 let y=65,edges='',nodes='';
 const head=label('KATEGORI',22,30)+label('SUBKATEGORI',350,30)+label('KODE',680,30);
 for(const cat of data.axial){const start=y;const subs=[];
  for(const sub of cat.subcategories){const begin=y;const codes=[];
   for(const id of [...new Set(sub.open_ids)]){const o=data.open.find(o=>o.id===id);const text=`${o.id} · ${o.code}`;const h=height(text);codes.push({y:y+h/2,id});nodes+=box(text,680,y,295,h,'#fff',[id]);y+=h+15;}
   const h=height(sub.name),space=y-begin-15;
   if(space<h)y+=h-space;
   const cy=(begin+y-15)/2;subs.push({y:cy,ids:sub.open_ids});nodes+=box(sub.name,350,cy-h/2,280,h,'#edf3ed',sub.open_ids);
   for(const c of codes)edges+=`<path d="M630 ${cy} C655 ${cy} 655 ${c.y} 680 ${c.y}" stroke="#aac3b5" fill="none"/>`;
   y+=15;
  }
  const h=height(cat.category),cy=(start+y-30)/2;nodes+=box(cat.category,22,cy-h/2,278,h,'#dce9dd',cat.subcategories.flatMap(s=>s.open_ids));
  for(const sub of subs)edges+=`<path d="M300 ${cy} C325 ${cy} 325 ${sub.y} 350 ${sub.y}" stroke="#91ac9c" fill="none"/>`;
  y+=30;
 }
 return svg(head+edges+nodes,y+10,'Node Tree — kategori, subkategori, kode');
}
export function frame(data){
 if(!data.relations.length)return '<p class="muted">Belum ada hubungan antarkategori yang cukup didukung bukti. Diagram tidak dipaksakan.</p>';
 let y=50,body='<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#39756a"/></marker></defs>';
 for(const r of data.relations){const a=data.axial.find(a=>a.id===r.from),b=data.axial.find(a=>a.id===r.to);const h=Math.max(height(a.category),height(b.category),lines(r.label,35).length*17+65);
  body+=`<path d="M300 ${y+h-18}H690" stroke="#39756a" stroke-width="2" marker-end="url(#arrow)"/>`;
  body+=box(a.category,15,y,285,h,'#e8efe6',r.evidence_ids)+box(b.category,700,y,285,h,'#e8efe6',r.evidence_ids);
  body+=label(r.label,330,y+23,35,'#385e54',11);body+=label(r.evidence_ids.join(', '),330,y+h+17,45,'#6b7d71',10);y+=h+60;
 }
 return svg(body,y,'Diagram Bingkai — relasi antarkategori; kategori dapat muncul pada beberapa relasi');
}
function partition(items,x,y,w,h,out){
 if(!items.length)return;if(items.length===1){out.push({...items[0],x,y,w,h});return;}
 const total=items.reduce((s,i)=>s+i.value,0);let half=0,index=0;while(index<items.length-1&&half<total/2){half+=items[index++].value;}
 const fraction=half/total;
 if(w>=h){partition(items.slice(0,index),x,y,w*fraction,h,out);partition(items.slice(index),x+w*fraction,y,w*(1-fraction),h,out);}
 else{partition(items.slice(0,index),x,y,w,h*fraction,out);partition(items.slice(index),x,y+h*fraction,w,h*(1-fraction),out);}
}
export function treemap(data,mode){
 const items=counts(data,mode).filter(c=>c.value>0).sort((a,b)=>b.value-a.value);
 if(!items.length)return '<p class="muted">Belum ada potongan berkode untuk dihitung.</p>';
 const tiles=[];partition(items,0,0,1000,550,tiles);
 const body=tiles.map((t,i)=>{const a=data.axial.find(a=>a.id===t.id),ids=a.subcategories.flatMap(s=>s.open_ids);const color=palette[i%palette.length];
  const text=`${t.id} · ${t.label} (${t.value})`;const max=Math.max(4,Math.floor((t.w-24)/7));const wrapped=lines(text,max);const fits=t.w>90&&wrapped.length*17<t.h-20;
  return `<g tabindex="0" role="button" aria-label="${esc(text)}" data-evidence="${esc(ids.join(','))}"><title>${esc(text)}</title><rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" fill="${color}" stroke="#fff" stroke-width="2"/>${fits?label(text,t.x+12,t.y+25,max,'#fff'):t.w>30&&t.h>24?label(t.id,t.x+6,t.y+17,8,'#fff',10):''}</g>`;
 }).join('');
 return svg(body,550,`Treemap — ${mode==='reviews'?'ulasan unik':'potongan unik'} per kategori`);
}
