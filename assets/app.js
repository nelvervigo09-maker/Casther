/* Catálogo digital Casther · catálogo web + edición local + libro A4 + PDF autónomo */
(()=>{
'use strict';
const BASE=window.CATALOG||[], IMG=window.IMG||{};
const SERVER=window.CASTHER_CUSTOM||{lines:[],entries:[]};
const STORE='casther_custom_v5';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const slug=s=>norm(s).replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,54)||'nueva';
const uuid=()=> 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const ADMIN=new URLSearchParams(location.search).get('editar')==='1'||location.protocol==='file:';
document.body.classList.toggle('is-admin',ADMIN);
const blank=()=>({lines:[],entries:[],deletedLines:[],deletedOriginalProducts:[],deletedRows:[],deletedEntryIds:[],revision:0});
function normalizeData(d){const x={...blank(),...(d||{})};for(const k of ['lines','entries','deletedLines','deletedOriginalProducts','deletedRows','deletedEntryIds'])if(!Array.isArray(x[k]))x[k]=[];return x}
let custom=normalizeData(SERVER);
try{const old=localStorage.getItem(STORE)||localStorage.getItem('casther_custom_v4');if(old){const d=normalizeData(JSON.parse(old));if(Number(d.revision||0)>=Number(custom.revision||0))custom=d}}catch(err){console.warn('No se pudo leer el almacenamiento local',err)}
const notify=(msg,ms=4000)=>{const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(notify.t);notify.t=setTimeout(()=>t.classList.remove('show'),ms)};
function persist(){try{custom.revision=Date.now();localStorage.setItem(STORE,JSON.stringify(custom));return true}catch(e){notify('No se pudo guardar. Exporta tus cambios y reduce el tamaño de las fotografías.',7500);return false}}
const has=(arr,key)=>arr.includes(key);
const itemKey=(lineId,si,file)=>[lineId,si,file].join('::');
const rowKey=(lineId,si,ti,ri)=>[lineId,si,ti,ri].join('::');
let catalog=[],bookPages=[],bookIndex=0,observer=null,editHeaders=[],flipping=false;
function buildCatalog(){
 const c=BASE.filter(l=>!has(custom.deletedLines,l.id)).map(l=>({...l,s:l.s.map((sec,si)=>({
  ...sec,originIndex:si,
  i:sec.i.filter(it=>!has(custom.deletedOriginalProducts,itemKey(l.id,si,it.f))).map(it=>({...it,delKey:itemKey(l.id,si,it.f)})),
  t:sec.t.map((t,ti)=>{const list=t.r.map((r,ri)=>({r:[...r],ref:rowKey(l.id,si,ti,ri)})).filter(x=>!has(custom.deletedRows,x.ref));return {h:[...t.h],r:list.map(x=>x.r),refs:list.map(x=>x.ref)}})
 }))}));
 for(const l of custom.lines||[])if(!has(custom.deletedLines,l.id)&&!c.find(x=>x.id===l.id))c.push({id:l.id,n:l.n,s:[],logo:null,isCustom:true});
 for(const e of custom.entries||[]){
   if(has(custom.deletedEntryIds,e.id)||has(custom.deletedLines,e.lineId))continue;
   let l=c.find(x=>x.id===e.lineId);
   if(!l){l={id:e.lineId,n:e.lineName||'Línea adicional',s:[],logo:null,isCustom:true};c.push(l)}
   let sec=l.s.find(x=>norm(x.n)===norm(e.section));
   if(!sec){sec={n:e.section,p:null,i:[],t:[],originIndex:-1,customEntries:[]};l.s.push(sec)}
   (sec.customEntries||(sec.customEntries=[])).push(e);
   sec.i.push({f:'added_'+e.id,c:e.name,added:true,delKey:'added:'+e.id});
   IMG['added_'+e.id]=e.image;
   let t=sec.t.find(x=>JSON.stringify(x.h)===JSON.stringify(e.headers));
   if(!t){t={h:[...e.headers],r:[],refs:[]};sec.t.push(t)}
   t.r.push([...e.values]);t.refs.push('added:'+e.id);
 }
 return c;
}
function stats(){let cats=0,rows=0;catalog.forEach(l=>l.s.forEach(s=>{cats++;s.t.forEach(t=>rows+=t.r.length)}));$('#stats').innerHTML=`<div><b>${catalog.length}</b><span>líneas</span></div><div><b>${cats}</b><span>categorías</span></div><div><b>${rows}</b><span>presentaciones</span></div>`}
const numCol=h=>/UND|CAJA|PACK|DISPLAY|BOLSON|PLANCHA|TIRA|PAR X|METROS/i.test(h);
function tableHTML(t){return `<div class="tblw"><table><thead><tr>${t.h.map(h=>`<th>${esc(h)}</th>`).join('')}${ADMIN?'<th class="admin-only actions-th">Acciones</th>':''}</tr></thead><tbody>${t.r.map((r,j)=>`<tr data-k="${esc(norm(r.join(' ')))}">${r.map((v,i)=>`<td class="${i&&numCol(t.h[i]||'')?'num':''}">${esc(v||'—')}</td>`).join('')}${ADMIN?`<td class="admin-only actions-cell"><button type="button" class="delete-row" data-rowref="${esc(t.refs?.[j]||'')}" title="Eliminar fila de características">Eliminar fila</button></td>`:''}</tr>`).join('')}</tbody></table></div>`}
function renderSite(){
 catalog=buildCatalog();stats();$('#brandLogo').src=COMPANY_LOGO;
 $('#logos').innerHTML=catalog.map(l=>`<a href="#${esc(l.id)}" title="${esc(l.n)}">${l.logo&&IMG[l.logo]?`<img src="${IMG[l.logo]}" alt="${esc(l.n)}">`:esc(l.n)}</a>`).join('');
 $('#main').innerHTML=catalog.map(l=>{
   const cnt=l.s.reduce((a,s)=>a+s.t.reduce((b,t)=>b+t.r.length,0),0);
   return `<section class="lineblk" id="${esc(l.id)}"><div class="linehead"><div class="lg">${l.logo&&IMG[l.logo]?`<img src="${IMG[l.logo]}" alt="">`:`<b>${esc(l.n)}</b>`}</div><div><small>Línea</small><h2>${esc(l.n)}</h2></div><div class="cnt"><b>${cnt}</b>presentaciones</div>${ADMIN?`<button type="button" class="delete-line admin-only" data-line="${esc(l.id)}" title="Eliminar esta línea completa">Eliminar línea</button>`:''}</div>
   ${l.s.map(s=>`<article class="sec" data-k="${esc(norm([l.n,s.n,...s.i.map(i=>i.c),...s.t.flatMap(t=>t.r.flat())].join(' ')))}">
     <div class="sec-h"><h3>${esc(s.n)}</h3><span>${s.i.length} productos</span></div>
     <div class="grid">${s.i.filter(i=>IMG[i.f]).map(i=>`<figure class="item" style="margin:0" data-c="${esc(i.c)}" data-s="${esc(s.n)}" data-l="${esc(l.n)}" data-f="${esc(i.f)}" data-k="${esc(norm(i.c))}"><div class="ph"><img loading="lazy" src="${IMG[i.f]}" alt="${esc(i.c||s.n)}"></div><p>${esc(i.c||s.n)}</p>${ADMIN?`<button type="button" class="delete-item admin-only" title="Eliminar producto" data-itemkey="${esc(i.delKey)}">×</button>`:''}${i.added?'<span class="new-badge">NUEVO</span>':''}</figure>`).join('')}</div>${s.t.map(tableHTML).join('')}
   </article>`).join('')}</section>`;
 }).join('');
 const nav=catalog.map(l=>`<a href="#${esc(l.id)}" data-id="${esc(l.id)}">${esc(l.n)}<em>${l.s.length}</em></a>`).join('');
 $('#side').innerHTML=nav;
 $('#chips').innerHTML=catalog.map(l=>`<a href="#${esc(l.id)}" data-id="${esc(l.id)}">${esc(l.n)}</a>`).join('');
 runSearch();
 if(observer)observer.disconnect();
 if('IntersectionObserver'in window){observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){document.querySelectorAll('[data-id]').forEach(a=>a.classList.toggle('on',a.dataset.id===e.target.id));const chip=$(`#chips [data-id="${e.target.id}"]`);if(chip){$('#chips').scrollTo({left:chip.offsetLeft-$('#chips').clientWidth/2+chip.clientWidth/2,behavior:'smooth'})}}}),{rootMargin:'-25% 0px -65% 0px'});document.querySelectorAll('.lineblk').forEach(el=>observer.observe(el))}
 buildBook();
}
function runSearch(){const q=$('#q'),v=norm(q.value.trim());$('#searchBox').classList.toggle('has',!!v);const terms=v.split(/\s+/).filter(Boolean);let any=false;document.querySelectorAll('.lineblk').forEach(lb=>{let hit=false;lb.querySelectorAll('.sec').forEach(sec=>{const ok=!terms.length||terms.every(t=>sec.dataset.k.includes(t));sec.style.display=ok?'':'none';if(ok)hit=true;sec.querySelectorAll('.item').forEach(it=>it.classList.toggle('hit',!!terms.length&&terms.some(t=>it.dataset.k.includes(t))));sec.querySelectorAll('tr[data-k] td').forEach(td=>td.style.background='')});lb.style.display=hit?'':'none';if(hit)any=true;document.querySelectorAll(`[data-id="${lb.id}"]`).forEach(a=>a.classList.toggle('off',!hit))});$('#empty').style.display=any?'none':'block'}
const q=$('#q');q.addEventListener('input',runSearch);$('#clr').onclick=()=>{q.value='';runSearch();q.focus()};
try{const initial=localStorage.getItem('casther_q');if(initial)q.value=initial}catch(e){}
q.addEventListener('input',()=>{try{localStorage.setItem('casther_q',q.value)}catch(e){}});
/* Modal de incorporación */
function showModal(el){el.hidden=false;document.body.style.overflow='hidden'}
function hideModal(el){el.hidden=true;if($('#editor').hidden&&$('#shareDialog').hidden)document.body.style.overflow=''}
function selectLines(){const options=catalog.map(l=>`<option value="${esc(l.id)}">${esc(l.n)}</option>`).join('');$('#lineSelect').innerHTML=options+'<option value="__new">＋ Crear línea nueva</option>'}
function sections(){const lineId=$('#lineSelect').value;const line=catalog.find(l=>l.id===lineId);$('#newLineRow').hidden=lineId!=='__new';$('#newLineName').required=lineId==='__new';$('#sectionSelect').innerHTML=(line?line.s.map(s=>`<option value="${esc(s.n)}">${esc(s.n)}</option>`).join(''):'')+'<option value="__new">＋ Crear categoría nueva</option>';if(!line)$('#sectionSelect').value='__new';sectionChanged()}
function sectionChanged(){const line=catalog.find(l=>l.id===$('#lineSelect').value);const name=$('#sectionSelect').value;const sec=line&&line.s.find(s=>s.n===name);const isNew=name==='__new';$('#newSectionRow').hidden=!isNew;$('#newSectionName').required=isNew;editHeaders=sec&&sec.t.length?sec.t[0].h.slice():['MARCA','AROMA / TIPO','PRESENTACIÓN','UND X CAJA'];drawFeatures()}
function drawFeatures(values=[]){$('#featureFields').innerHTML=editHeaders.map((h,i)=>`<label><span class="feature-label">${$('#sectionSelect').value==='__new'?`<input class="headerEdit" data-index="${i}" value="${esc(h)}" aria-label="Nombre de la columna ${i+1}" maxlength="35">`:`<span>${esc(h)}</span>`}${$('#sectionSelect').value==='__new'&&editHeaders.length>2?`<button type="button" class="remove-column" data-index="${i}" title="Eliminar columna">×</button>`:''}</span><input class="featureVal" data-index="${i}" maxlength="150" value="${esc(values[i]||'')}" placeholder="${esc(h)}" ${i===0?'required':''}></label>`).join('')}
$('#lineSelect').addEventListener('change',sections);$('#sectionSelect').addEventListener('change',sectionChanged);
$('#newLineName').addEventListener('input',()=>{if($('#lineSelect').value==='__new')document.querySelectorAll('#featureFields .featureVal').forEach((x,i)=>{if(i===0&&!x.value)x.value=$('#newLineName').value.toUpperCase()})});
$('#addColumnBtn').onclick=()=>{if($('#sectionSelect').value!=='__new'){notify('Para personalizar las columnas, crea una categoría nueva.');return}if(editHeaders.length>=7){notify('Hasta 7 columnas por tabla.');return}const vals=[...document.querySelectorAll('.featureVal')].map(el=>el.value);document.querySelectorAll('.headerEdit').forEach(x=>editHeaders[+x.dataset.index]=x.value);editHeaders.push('CARACTERÍSTICA');drawFeatures(vals)};
$('#featureFields').addEventListener('click',e=>{const x=e.target.closest('.remove-column');if(!x)return;const vals=[...document.querySelectorAll('.featureVal')].map(el=>el.value);document.querySelectorAll('.headerEdit').forEach(x=>editHeaders[+x.dataset.index]=x.value);const i=+x.dataset.index;editHeaders.splice(i,1);vals.splice(i,1);drawFeatures(vals)});
function openEditor(){selectLines();$('#productForm').reset();$('#lineSelect').selectedIndex=0;sections();$('#photoPreview').hidden=true;$('#photoHint').hidden=false;showModal($('#editor'))}
$('#addBtn').onclick=openEditor;$('#closeEditor').onclick=$('#cancelEditor').onclick=()=>hideModal($('#editor'));
$('#editor').addEventListener('click',e=>{if(e.target===$('#editor'))hideModal($('#editor'))});
function processPhoto(file){return new Promise((resolve,reject)=>{if(!file)return reject(new Error('Selecciona una fotografía.'));if(file.size>18*1024*1024)return reject(new Error('La fotografía supera 18 MB.'));const url=URL.createObjectURL(file);const im=new Image();im.onload=()=>{const side=600,scale=Math.min(1,side/Math.max(im.width,im.height));const cn=document.createElement('canvas');cn.width=Math.max(1,Math.round(im.width*scale));cn.height=Math.max(1,Math.round(im.height*scale));cn.getContext('2d').drawImage(im,0,0,cn.width,cn.height);URL.revokeObjectURL(url);resolve(cn.toDataURL('image/webp',.74))};im.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('No se pudo leer la fotografía.'))};im.src=url})}
$('#photoInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const url=await processPhoto(f);$('#photoPreview').src=url;$('#photoPreview').hidden=false;$('#photoHint').hidden=true}catch(err){notify(err.message)}});
$('#productForm').addEventListener('submit',async e=>{e.preventDefault();const btn=$('#saveProduct');btn.disabled=true;btn.textContent='Guardando…';try{
 let lineId=$('#lineSelect').value;let lineName='';const addingLine=lineId==='__new';if(addingLine){lineName=$('#newLineName').value.trim();if(!lineName)throw Error('Escribe el nombre de la nueva línea.');lineId='line-'+slug(lineName);if(catalog.some(l=>l.id===lineId)){const l=catalog.find(l=>l.id===lineId);lineName=l.n}else custom.lines.push({id:lineId,n:lineName})}else lineName=catalog.find(l=>l.id===lineId)?.n||'';
 const section=$('#sectionSelect').value==='__new'?$('#newSectionName').value.trim():$('#sectionSelect').value;if(!section)throw Error('Indica la categoría del producto.');
 const name=$('#productName').value.trim();if(!name)throw Error('Indica el nombre del producto.');
 let headers=editHeaders.slice();if($('#sectionSelect').value==='__new')document.querySelectorAll('.headerEdit').forEach(x=>headers[+x.dataset.index]=x.value.trim().toUpperCase()||`COLUMNA ${+x.dataset.index+1}`);
 const values=[...document.querySelectorAll('.featureVal')].map(x=>x.value.trim()||'—');if(!values[0]||values[0]==='—')throw Error('Completa la marca del producto.');
 const image=await processPhoto($('#photoInput').files[0]);
 const entry={id:uuid(),lineId,lineName,section,name,headers,values,image};custom.entries.push(entry);
 if(!persist()){custom.entries.pop();if(addingLine)custom.lines=custom.lines.filter(l=>l.id!==lineId);return}
 renderSite();hideModal($('#editor'));$('#q').value='';runSearch();notify(`Producto agregado a ${lineName} · ${section}. Exporta el sitio actualizado para publicarlo.`,6500);$('#'+CSS.escape(lineId))?.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(err){notify(err.message||'No se pudo guardar el producto',6500)}finally{btn.disabled=false;btn.textContent='Guardar producto'}});
/* Administración local: eliminación no destructiva y recuperación de productos/líneas */
let pendingItem=null;
function saveChange(label){persist();renderSite();renderDeleted();notify(label+' · Usa «Publicar cambios» para actualizar el sitio de tus clientes.',7000)}
function deleteProduct(key,rowref=''){
 if(key.startsWith('added:')){const id=key.slice(6);if(!custom.deletedEntryIds.includes(id))custom.deletedEntryIds.push(id)}
 else if(!custom.deletedOriginalProducts.includes(key))custom.deletedOriginalProducts.push(key);
 if(rowref&&rowref.startsWith('added:')){const id=rowref.slice(6);if(!custom.deletedEntryIds.includes(id))custom.deletedEntryIds.push(id)}
 else if(rowref&&!custom.deletedRows.includes(rowref))custom.deletedRows.push(rowref);
 saveChange('Producto eliminado');
}
function openDeleteProduct(key){
 if(!ADMIN)return;
 const entry=key.startsWith('added:')?custom.entries.find(e=>'added:'+e.id===key):null;
 if(entry){if(confirm('¿Eliminar «'+entry.name+'» junto con su fotografía y su fila de características?'))deleteProduct(key);return}
 const item=catalog.flatMap(l=>l.s.flatMap(s=>s.i.map(i=>({l,s,i})))).find(o=>o.i.delKey===key);
 if(!item)return;
 pendingItem=key;
 $('#deleteItemTitle').textContent='Eliminar '+(item.i.c||item.s.n);
 const refs=item.s.t.flatMap(t=>t.r.map((r,i)=>({ref:t.refs[i],label:(t.h.map((h,j)=>h+': '+(r[j]||'')).join(' · ')).slice(0,190)})));
 const normalized=norm(item.i.c).trim();
 const matching=refs.filter(x=>x.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(' · ').some(v=>v.endsWith(': '+normalized)));
 $('#linkedRow').innerHTML='<option value="">Solo eliminar la fotografía (sin fila de tabla)</option>'+refs.map(x=>`<option value="${esc(x.ref)}">${esc(x.label)}</option>`).join('');
 if(matching.length===1)$('#linkedRow').value=matching[0].ref;
 $('#deleteItemHint').textContent='Selecciona la fila de tabla de este producto. Algunas tablas originales agrupan varias variedades en una fila; en ese caso conserva esa fila y edítala por separado.';
 showModal($('#deleteItemDialog'));
}
$('#confirmDeleteItem').onclick=()=>{if(!pendingItem)return;const k=pendingItem,r=$('#linkedRow').value;pendingItem=null;hideModal($('#deleteItemDialog'));deleteProduct(k,r)};
$('#cancelDeleteItem').onclick=$('#closeDeleteItem').onclick=()=>{pendingItem=null;hideModal($('#deleteItemDialog'))};
$('#deleteItemDialog').onclick=e=>{if(e.target.id==='deleteItemDialog')hideModal($('#deleteItemDialog'))};
$('#main').addEventListener('click',e=>{
 if(!ADMIN)return;
 const d=e.target.closest('.delete-line');if(d){e.preventDefault();e.stopPropagation();const l=catalog.find(x=>x.id===d.dataset.line);if(l&&confirm('¿Eliminar toda la línea «'+l.n+'» con sus productos y tablas? Podrás restaurarla desde «Recuperar».')){custom.deletedLines.push(l.id);saveChange('Línea eliminada')}return}
 const i=e.target.closest('.delete-item');if(i){e.preventDefault();e.stopPropagation();openDeleteProduct(i.dataset.itemkey);return}
 const r=e.target.closest('.delete-row');if(r){e.preventDefault();e.stopPropagation();const ref=r.dataset.rowref;if(confirm('¿Eliminar esta fila de características?'+(ref.startsWith('added:')?' Se eliminará también el producto y su fotografía.':''))){if(ref.startsWith('added:'))deleteProduct(ref);else{custom.deletedRows.push(ref);saveChange('Fila de tabla eliminada')}}}
});
function renderDeleted(){
 const lines=custom.deletedLines.map(id=>({type:'line',key:id,label:'Línea · '+(BASE.find(l=>l.id===id)||custom.lines.find(l=>l.id===id))?.n}));
 const items=custom.deletedOriginalProducts.map(key=>({type:'original',key,label:'Producto original · '+key}));
 const rows=custom.deletedRows.map(key=>({type:'row',key,label:'Fila de tabla · '+key}));
 const added=custom.deletedEntryIds.map(id=>({type:'added',key:id,label:'Producto nuevo · '+(custom.entries.find(e=>e.id===id)?.name||id)}));
 const all=[...lines,...items,...rows,...added];
 $('#deletedList').innerHTML=all.length?all.map(o=>`<li><span>${esc(o.label)}</span><button type="button" class="restore-btn" data-type="${esc(o.type)}" data-key="${esc(o.key)}">Restaurar</button></li>`).join(''):'<li>No hay productos o líneas eliminados.</li>';
}
$('#restoreBtn').onclick=()=>{renderDeleted();showModal($('#restoreDialog'))};
$('#closeRestore').onclick=()=>hideModal($('#restoreDialog'));
$('#restoreDialog').onclick=e=>{if(e.target.id==='restoreDialog')hideModal($('#restoreDialog'));const r=e.target.closest('.restore-btn');if(!r)return;const map={line:'deletedLines',original:'deletedOriginalProducts',row:'deletedRows',added:'deletedEntryIds'};const arr=custom[map[r.dataset.type]];if(!arr)return;custom[map[r.dataset.type]]=arr.filter(x=>x!==r.dataset.key);saveChange('Elemento restaurado')};
/* Libro digital A4: contenido editable y efecto de hoja giratoria, sin plugins externos. */
function bookChunk(arr,n){const out=[];for(let i=0;i<arr.length;i+=n)out.push(arr.slice(i,i+n));return out}
function baseSectionPages(s,line){
 const items=s.i.filter(it=>!it.added&&IMG[it.f]);
 const rows=s.t.flatMap(t=>t.r.map((r,j)=>({h:t.h,r,ref:t.refs[j]})).filter(x=>!String(x.ref).startsWith('added:')));
 if(!items.length&&!rows.length)return [];
 const count=Math.max(Math.ceil(items.length/BOOK_SLOTS),Math.ceil(rows.length/BOOK_SLOTS));
 return Array.from({length:count},(_,i)=>{
  let rowSlice=rows.slice(i*BOOK_SLOTS,i*BOOK_SLOTS+BOOK_SLOTS);
  return {type:'products',line:line.n,title:s.n,images:items.slice(i*BOOK_SLOTS,i*BOOK_SLOTS+BOOK_SLOTS).map(x=>({image:IMG[x.f],name:x.c||s.n})),tables:splitRowTypes(rowSlice),new:false};
 });
}
function splitRowTypes(rows){const out=[];for(const row of rows){let t=out[out.length-1];if(!t||JSON.stringify(t.h)!==JSON.stringify(row.h)){t={h:row.h,r:[]};out.push(t)}t.r.push(row.r)}return out}
function buildBook(){
 const pages=[{type:'cover'},{type:'index'}];
 for(const line of catalog){pages.push({type:'line',line:line.n,logo:IMG[line.logo]||null});
  for(const s of line.s){pages.push(...baseSectionPages(s,line));const grouped=new Map();for(const e of s.customEntries||[]){const key=JSON.stringify(e.headers);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(e)}
   for(const es of grouped.values())for(const group of bookChunk(es,BOOK_SLOTS)){pages.push({type:'products',line:line.n,title:s.n,images:group.map(e=>({image:e.image,name:e.name})),tables:[{h:group[0].headers,r:group.map(e=>e.values)}],new:true})}
  }
 }
 bookPages=pages;$('#totalPages').textContent=pages.length;$('#bookRange').max=String(pages.length);bookIndex=Math.max(0,Math.min(bookIndex,pages.length-1));if(document.body.classList.contains('reading'))renderSpread();
}
function accentForLine(name){
 const t=norm(name);
 if(t.includes('ayudin'))return '#00b963';
 if(t.includes('magia'))return '#9d47dc';
 if(t.includes('alicorp')||t.includes('yomar'))return '#d42333';
 if(t.includes('facil')||t.includes('cielo'))return '#1a77ce';
 return '#144b9e';
}
function pageHTML(p,i){if(!p)return '<div class="book-blank" aria-hidden="true"></div>';let content='';
 if(p.type==='cover')content=`<img class="bk-cover-exact" src="${window.CASTHER_COVER_IMAGE||'ref/p1.png'}" alt="Portada original del catálogo Distribuciones Casther & Asociados S.A.C.">`;
 if(p.type==='index')content=`<div class="bk-head"><b>CASTHER</b><img src="${COMPANY_LOGO}" alt="Logo Casther"></div><h2>ÍNDICE DE LÍNEAS</h2><div class="index-lines">${catalog.map(l=>`<div><span>${esc(l.n)}</span><span>${bookPages.findIndex(b=>b.type==='line'&&b.line===l.n)+1}</span></div>`).join('')}</div>`;
 if(p.type==='line')content=`<img class="bk-watermark" src="${COMPANY_LOGO}" alt=""><div class="bk-head solo"><img src="${COMPANY_LOGO}" alt="Logo Casther"></div>${p.logo?`<img class="line-logo" src="${p.logo}" alt="">`:''}<h2>PRODUCTOS<br>LÍNEA<br>${esc(p.line)}</h2><p>CALIDAD Y GARANTÍA</p>`;
 if(p.type==='products')content=`<img class="bk-watermark" src="${COMPANY_LOGO}" alt=""><div class="bk-head"><div><small>CATÁLOGO DE PRODUCTOS</small><b>CASTHER</b></div><img src="${COMPANY_LOGO}" alt="Logo Casther"></div><div class="bk-section">${esc(p.title)}</div><div class="bk-sub">LÍNEA ${esc(p.line)}${p.new?' · NUEVOS PRODUCTOS':''}</div><div class="bk-products">${p.images.map(x=>`<div class="bk-item">${x.image?`<img src="${x.image}" alt="${esc(x.name)}">`:'<div class="placeholder">Sin foto</div>'}<b>${esc(x.name)}</b></div>`).join('')}</div>${p.tables.map(t=>`<table class="bk-table"><thead><tr>${t.h.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.r.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('')}`;
 const accent=p.line?accentForLine(p.line):'#144b9e';
 return `<section class="a4page ${p.type==='cover'?'cover-page':p.type==='line'?'line-page':p.type==='index'?'bk-index':''}" style="--bk-accent:${accent}" aria-label="Página ${i+1} del catálogo">${content}${p.type==='cover'?'':`<div class="bk-footer"><span>Distribuciones Casther &amp; Asociados</span><em>${i+1}</em></div>`}</section>`;
}
const wide=()=>window.innerWidth>880;
function spreadNumbers(index){if(!wide())return [index];if(index===0)return [null,0];const left=1+2*Math.floor((index-1)/2);return [left,left+1<bookPages.length?left+1:null]}
function spreadMarkup(index){return spreadNumbers(index).map(n=>n==null?pageHTML(null):pageHTML(bookPages[n],n)).join('')}
function updatePageControls(){const pages=spreadNumbers(bookIndex),a=pages.filter(x=>x!==null);$('#pageInput').value=String(a[0]+1);$('#bookRange').value=String(a[0]+1);$('#prevPage').disabled=bookIndex===0;$('#nextPage').disabled=(a[a.length-1]===bookPages.length-1);$('#firstPage').disabled=bookIndex===0;$('#lastPage').disabled=$('#nextPage').disabled}
function renderSpread(){if(flipping)return;$('#spread').innerHTML=spreadMarkup(bookIndex);updatePageControls()}
function targetIndex(direction){if(!wide())return bookIndex+direction;if(direction>0)return bookIndex===0?1:bookIndex+2;return bookIndex<=1?0:bookIndex-2}
function normalizeIndex(index){const n=Math.min(bookPages.length-1,Math.max(0,index));return wide()?(n===0?0:1+2*Math.floor((n-1)/2)):n}
function changePage(next,animate=true){const target=normalizeIndex(next);if(target===bookIndex||flipping)return;
 if(!animate||window.matchMedia('(prefers-reduced-motion: reduce)').matches){bookIndex=target;renderSpread();return}
 const forward=target>bookIndex,previous=spreadNumbers(bookIndex),upcoming=spreadNumbers(target),one=!wide();
 const oldFront=one?previous[0]:(forward?previous[1]:previous[0]);
 const nextBack=one?upcoming[0]:(forward?upcoming[0]:upcoming[1]);
 const spread=$('#spread');flipping=true;
 const sheet=document.createElement('div');sheet.className='flip-sheet '+(forward?'forward':'backward');
 sheet.innerHTML='<div class="sheet-face front">'+(oldFront==null?pageHTML(null):pageHTML(bookPages[oldFront],oldFront))+'</div><div class="sheet-face back">'+(nextBack==null?pageHTML(null):pageHTML(bookPages[nextBack],nextBack))+'</div>';
 spread.appendChild(sheet);
 requestAnimationFrame(()=>requestAnimationFrame(()=>sheet.classList.add('turning')));
 setTimeout(()=>{if(!sheet.isConnected)return;[...spread.children].filter(x=>x!==sheet).forEach(x=>x.remove());spread.insertAdjacentHTML('afterbegin',spreadMarkup(target))},340);
 setTimeout(()=>{bookIndex=target;sheet.remove();flipping=false;renderSpread()},720);
}
function bookMode(enable,push=true){flipping=false;document.body.classList.toggle('reading',enable);$('#bookView').hidden=!enable;$('#bookView').style.display=enable?'block':'none';if(enable){renderSpread();window.scrollTo(0,0)}else window.scrollTo(0,0);if(push){const u=new URL(location.href);u.searchParams.set('vista',enable?'libro':'pagina');history.replaceState(null,'',u.toString())}}
$('#bookBtn').onclick=()=>bookMode(true);$('#backSite').onclick=()=>bookMode(false);
$('#nextPage').onclick=()=>changePage(targetIndex(1));$('#prevPage').onclick=()=>changePage(targetIndex(-1));
$('#firstPage').onclick=()=>changePage(0);$('#lastPage').onclick=()=>changePage(bookPages.length-1);$('#pageInput').onchange=e=>changePage((+e.target.value||1)-1,false);
$('#bookRange').oninput=e=>changePage(Number(e.target.value)-1,false);
$('#zoomBook').onclick=()=>{$('#bookReader').classList.toggle('zoomed');$('#zoomBook').textContent=$('#bookReader').classList.contains('zoomed')?'⊖ Tamaño normal':'⊕ Zoom'};
$('#fullscreenBook').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#bookView').requestFullscreen()}catch(e){notify('Pantalla completa no disponible en este navegador.')}};
window.addEventListener('resize',()=>{if(document.body.classList.contains('reading')&&!flipping){bookIndex=normalizeIndex(bookIndex);renderSpread()}});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){hideModal($('#editor'));hideModal($('#shareDialog'));hideModal($('#deleteItemDialog'));hideModal($('#restoreDialog'));$('#lb').classList.remove('on')}if(document.body.classList.contains('reading')&&$('#editor').hidden&&$('#shareDialog').hidden&&$('#deleteItemDialog').hidden){if(e.key==='ArrowRight')changePage(targetIndex(1));if(e.key==='ArrowLeft')changePage(targetIndex(-1))}});
let touchX=null;$('#spread').addEventListener('pointerdown',e=>{touchX=e.clientX});$('#spread').addEventListener('pointerup',e=>{if(touchX==null)return;const delta=e.clientX-touchX;touchX=null;if(Math.abs(delta)>42)changePage(targetIndex(delta<0?1:-1))});
$('#spread').addEventListener('click',e=>{if(flipping)return;const page=e.target.closest('.a4page');if(!page)return;if(wide()){const pages=[...$('#spread').children].filter(el=>el.classList.contains('a4page'));if(page===pages[pages.length-1])changePage(targetIndex(1));else changePage(targetIndex(-1))}else changePage(targetIndex(1))});
/* URLs diferentes, accesibles para cualquier persona tras publicar el sitio. */
function publicUrl(mode){const url=new URL(location.href);url.searchParams.delete('editar');url.searchParams.delete('admin');url.searchParams.set('vista',mode);url.hash='';return url.toString()}
function online(){return /^https?:$/.test(location.protocol)&&!['localhost','127.0.0.1','0.0.0.0'].includes(location.hostname)}
function linkFields(){const isPublic=online();for(const [name,mode] of [['web','pagina'],['book','libro']]){const url=isPublic?publicUrl(mode):'';$('#'+name+'Link').value=url;$('#open'+(name==='web'?'Web':'Book')+'Link').href=isPublic?url:'#';$('#open'+(name==='web'?'Web':'Book')+'Link').classList.toggle('disabled',!isPublic)}$('#shareHelp').textContent=isPublic?'Cualquier persona que tenga estos enlaces podrá ver el catálogo publicado, sin iniciar sesión. Las ediciones locales se hacen públicas al subir nuevamente el ZIP al mismo sitio.':'Para crear enlaces públicos primero publica el ZIP en un servicio de alojamiento (por ejemplo, Netlify). Los archivos locales no tienen una dirección pública.'}
async function share(mode){if(!online()){notify('Primero publica el ZIP para conseguir enlaces públicos para tus clientes.',6500);return}const u=publicUrl(mode);try{if(navigator.share){await navigator.share({title:'Catálogo Casther · '+(mode==='libro'?'Libro digital':'Catálogo web'),url:u});}else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(u);notify('Enlace copiado: '+u,6500)}else{prompt('Copia este enlace y envíalo a tus clientes:',u)}}catch(err){if(err.name==='AbortError')return;prompt('Copia el enlace para tus clientes:',u)}hideModal($('#shareDialog'))}
$('#shareBtn').onclick=()=>{linkFields();showModal($('#shareDialog'))};
$('#bookShare').onclick=()=>share('libro');$('#closeShare').onclick=()=>hideModal($('#shareDialog'));
$('#shareWebsite').onclick=()=>share('pagina');$('#shareBook').onclick=()=>share('libro');
$('#shareDialog').addEventListener('click',e=>{if(e.target===$('#shareDialog'))hideModal($('#shareDialog'))});
/* Prepara paquete ZIP auto-contenido del catálogo actualizado, sin servicios externos */
const encoder=new TextEncoder();
const crcTable=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0}return t})();
function crc32(buf){let crc=0xffffffff;for(let i=0;i<buf.length;i++)crc=crcTable[(crc^buf[i])&255]^(crc>>>8);return(crc^0xffffffff)>>>0}
function downloadBlob(bytes,name,type){const blob=new Blob([bytes],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000)}
function u16(v){return [v&255,(v>>>8)&255]}function u32(v){return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]}
function zipStore(files){const chunks=[],central=[];let offset=0;for(const [name,data] of files){const filename=encoder.encode(name),payload=typeof data==='string'?encoder.encode(data):data,crc=crc32(payload);const local=Uint8Array.from([...u32(0x04034b50),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(payload.length),...u32(payload.length),...u16(filename.length),...u16(0)]);chunks.push(local,filename,payload);central.push({filename,payload,crc,offset});offset+=local.length+filename.length+payload.length}
 const cdStart=offset;for(const x of central){const h=Uint8Array.from([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(x.crc),...u32(x.payload.length),...u32(x.payload.length),...u16(x.filename.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(x.offset)]);chunks.push(h,x.filename);offset+=h.length+x.filename.length}chunks.push(Uint8Array.from([...u32(0x06054b50),...u16(0),...u16(0),...u16(central.length),...u16(central.length),...u32(offset-cdStart),...u32(cdStart),...u16(0)]));return new Blob(chunks,{type:'application/zip'})}
async function exportSite(){const b=$('#exportBtn');b.disabled=true;b.innerHTML='Preparando ZIP…';try{
 // Se exporta el HTML original del documento actual pero con las vistas vacías. El script reinicia todo al abrir.
 const clone=document.documentElement.cloneNode(true);const emptyIds=['main','side','chips','logos','stats','spread'];for(const id of emptyIds){const el=clone.querySelector('#'+id);if(el)el.innerHTML=''}
 clone.querySelector('body').classList.remove('reading');clone.querySelector('#bookView')?.setAttribute('hidden','');clone.querySelector('#editor')?.setAttribute('hidden','');clone.querySelector('#shareDialog')?.setAttribute('hidden','');clone.querySelector('#deleteItemDialog')?.setAttribute('hidden','');clone.querySelector('#restoreDialog')?.setAttribute('hidden','');clone.querySelector('#toast')?.classList.remove('show');
 const html='<!doctype html>\n'+clone.outerHTML;
 const files=[['index.html',html],['data/catalog-data.js','window.CATALOG='+JSON.stringify(BASE)+';\n'],['data/custom-data.js','window.CASTHER_CUSTOM='+JSON.stringify(custom)+';\n'],['assets/cover-image.js','window.CASTHER_COVER_IMAGE='+JSON.stringify(window.CASTHER_COVER_IMAGE)+';\n']];
 const keys=Object.keys(IMG).filter(k=>!k.startsWith('added_'));const bins=Array.from({length:9},()=>[]),sizes=Array(9).fill(0);for(const k of keys){const n=sizes.indexOf(Math.min(...sizes));bins[n].push([k,IMG[k]]);sizes[n]+=k.length+IMG[k].length}
 bins.forEach((items,i)=>files.push([`data/imgs${i+1}.js`,`Object.assign(window.IMG=window.IMG||{},${JSON.stringify(Object.fromEntries(items))});\n`]));
 const css=await fetchAssetOrFallback('assets/enhancements.css');const app=await fetchAssetOrFallback('assets/app.js');files.push(['assets/enhancements.css',css],['assets/app.js',app],['assets/offline-assets.js','window.CASTHER_EXPORT_ASSETS='+JSON.stringify({'assets/enhancements.css':css,'assets/app.js':app})+';\n']);
 files.push(['INSTRUCCIONES.txt','CATÁLOGO CASTHER ACTUALIZADO\n\nPUBLICACIÓN: sube este ZIP (o su carpeta descomprimida) a https://app.netlify.com/drop. Para mantener el mismo enlace, usa el despliegue de tu mismo sitio desde su sección Deploys.\n\nLECTORES: https://TU-SITIO.netlify.app/?vista=pagina y https://TU-SITIO.netlify.app/?vista=libro.\nEDICIÓN: https://TU-SITIO.netlify.app/?editar=1 (no es autenticación ni control de seguridad).\n\nLos cambios se guardan localmente; exporta un ZIP nuevo y vuelve a desplegarlo para que los clientes vean las novedades.\n']);
 const zip=zipStore(files);downloadBlob(zip,'Casther_Catalogo_Actualizado.zip','application/zip');notify('ZIP actualizado listo. Publícalo en Netlify para que tus clientes vean los productos nuevos.',7000);
 }catch(err){console.error(err);notify('Error al exportar el sitio: '+err.message,7000)}finally{b.disabled=false;b.innerHTML='▣ <span>Publicar cambios</span>'}}
async function fetchAssetOrFallback(path){try{const r=await fetch(path);if(r.ok)return r.text()}catch(e){}if(window.CASTHER_EXPORT_ASSETS?.[path])return window.CASTHER_EXPORT_ASSETS[path];throw new Error('No se pudo leer '+path+'. Verifica que todos los archivos estén en la carpeta del sitio.')}
$('#exportBtn').onclick=exportSite;
/* PDF A4 descargable sin librerías de terceros. Cada hoja es una imagen JPEG en un PDF estándar. */
const PW=595.28,PH=841.89;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function txt(c,text,x,y,maxWidth,font='bold 24px Arial',color='#1b2a6b',align='left'){c.save();c.font=font;c.textAlign=align;c.fillStyle=color;c.textBaseline='top';let s=String(text??'');if(maxWidth&&c.measureText(s).width>maxWidth){while(s.length>1&&c.measureText(s+'…').width>maxWidth)s=s.slice(0,-1);s+='…'}c.fillText(s,x,y);c.restore()}
function wrapCanvas(c,str,maxWidth,font){c.save();c.font=font;const words=String(str||'').split(/\s+/),res=[];let line='';for(const word of words){if(!word)continue;const next=line?line+' '+word:word;if(c.measureText(next).width>maxWidth&&line){res.push(line);line=word}else line=next}if(line)res.push(line);c.restore();return res}
function rounded(c,x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function drawCell(c,s,x,y,w,h,font='bold 11px Arial',color='#233765'){c.save();c.font=font;c.textAlign='center';c.fillStyle=color;c.textBaseline='middle';let lines=wrapCanvas(c,s,w-7,font).slice(0,3);if(!lines.length)lines=['—'];const step=14;let first=y+(h-lines.length*step)/2+step/2;for(const line of lines){let ss=line;while(c.measureText(ss).width>w-7&&ss.length>1)ss=ss.slice(0,-1);c.fillText(ss,x+w/2,first);first+=step}c.restore()}
const loadImg=src=>new Promise(resolve=>{if(!src)return resolve(null);const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=src});
function fitImg(c,im,x,y,w,h){if(!im)return;const r=Math.min(w/im.width,h/im.height);const iw=im.width*r,ih=im.height*r;c.drawImage(im,x+(w-iw)/2,y+(h-ih)/2,iw,ih)}
async function canvasFor(p,index){const canvas=document.createElement('canvas');canvas.width=840;canvas.height=1188;const c=canvas.getContext('2d',{alpha:false});c.fillStyle='white';c.fillRect(0,0,840,1188);
 c.fillStyle='#f7a2aa';c.beginPath();c.ellipse(45,-30,240,150,-.4,0,Math.PI*2);c.fill();c.fillStyle='#f1909e';c.beginPath();c.ellipse(790,1250,390,165,-.3,0,Math.PI*2);c.fill();
 const logo=await loadImg(COMPANY_LOGO);
 if(p.type==='cover'){const cover=await loadImg(window.CASTHER_COVER_IMAGE||'ref/p1.png');if(cover)c.drawImage(cover,0,0,840,1188);else txt(c,'CATÁLOGO CASTHER',420,420,750,'bold 80px Arial','#124892','center')}
 else if(p.type==='line'){fitImg(c,await loadImg(p.logo),200,160,440,170);txt(c,'PRODUCTOS',420,495,740,'bold 75px Arial','#1b2a6b','center');txt(c,'LÍNEA',420,600,740,'bold 68px Arial','#e3262f','center');for(const [i,str]of wrapCanvas(c,p.line,700,'bold 63px Arial').slice(0,3).entries())txt(c,str,420,705+i*77,740,'bold 63px Arial','#1b2a6b','center')}
 else if(p.type==='index'){txt(c,'ÍNDICE DE LÍNEAS',420,105,730,'bold 51px Arial','#1b2a6b','center');const linePages=bookPages.filter(b=>b.type==='line');for(let j=0;j<linePages.length;j++){const col=j<Math.ceil(linePages.length/2)?0:1;const row=j%(Math.ceil(linePages.length/2));const x=80+col*395;txt(c,linePages[j].line,x,235+row*48,280,'bold 18px Arial','#1b2a6b');txt(c,String(bookPages.indexOf(linePages[j])+1),x+282,235+row*48,35,'bold 18px Arial','#e3262f','right')}}
 else if(p.type==='products'){
 txt(c,'CATÁLOGO DE PRODUCTOS',70,64,400,'bold 19px Arial','#e3262f');fitImg(c,logo,536,34,245,96);
 c.save(); c.globalAlpha=.07; fitImg(c,logo,135,320,570,220); c.restore();
 txt(c,p.title.toUpperCase(),420,138,746,'bold 38px Arial','#1b2a6b','center');txt(c,'LÍNEA '+p.line.toUpperCase()+(p.new?' · NUEVOS PRODUCTOS':''),420,190,730,'bold 16px Arial','#6577a5','center');
 const top=228,x0=66,gapX=22,gapY=16,cellW=343,cellH=228;
 const ims=await Promise.all(p.images.map(i=>loadImg(i.image)));
 for(let k=0;k<p.images.length;k++){const col=k%2,row=Math.floor(k/2),x=x0+col*(cellW+gapX),y=top+row*(cellH+gapY); c.fillStyle='#ffffff'; c.strokeStyle='#d7e1f5'; c.lineWidth=2; c.beginPath(); c.roundRect(x,y,cellW,cellH,18); c.fill(); c.stroke(); fitImg(c,ims[k],x+26,y+18,cellW-52,150); rounded(c,x+18,y+176,cellW-36,34,16,'#13549e'); drawCell(c,p.images[k].name,x+26,y+176,cellW-52,34,'bold 13px Arial','#fff')}
 const tbTop=728,tabEnd=1096;const totalRows=p.tables.reduce((n,t)=>n+t.r.length+1,0)||1;let cy=tbTop;const slot=Math.min(38,(tabEnd-tbTop)/totalRows);
 for(const t of p.tables){const cols=t.h.length||4,w=708/cols;for(let row=-1;row<t.r.length;row++){const h=slot;for(let k=0;k<cols;k++){const x=66+k*w;c.fillStyle=row<0?'#cbd8ff':(row%2?'#f8faff':'#fff');c.fillRect(x,cy,w,h);c.strokeStyle='#2861a4';c.lineWidth=1.3;c.strokeRect(x,cy,w,h);drawCell(c,row<0?t.h[k]:t.r[row]?.[k],x,cy,w,h,row<0?'bold 12px Arial':'bold 12px Arial',row<0?'#1b2a6b':'#192f6f')}cy+=h}}
 }
 txt(c,'DISTRIBUCIONES CASTHER & ASOCIADOS S.A.C.',65,1134,660,'bold 13px Arial','#2e4383');rounded(c,736,1123,46,39,14,'#10121d');txt(c,String(index+1),759,1134,42,'bold 19px Arial','#fff','center');
 return canvas;
}
function b64bytes(data){const raw=atob(data.split(',')[1]),n=raw.length,out=new Uint8Array(n);for(let i=0;i<n;i++)out[i]=raw.charCodeAt(i);return out}
async function makePDF(){const btns=[$('#pdfBtn'),$('#bookPdf')];btns.forEach(b=>b.disabled=true);try{
 const jpgs=[];for(let i=0;i<bookPages.length;i++){if(i%4===0){notify(`Generando PDF A4: página ${i+1} de ${bookPages.length}…`,8000);await sleep(10)}const cn=await canvasFor(bookPages[i],i);jpgs.push(b64bytes(cn.toDataURL('image/jpeg',.79)));cn.width=0;cn.height=0}
 const pieces=[],offsets=[0];let pos=0;function add(data){const bin=typeof data==='string'?encoder.encode(data):data;pieces.push(bin);pos+=bin.length}function obj(id,header,raw=null){offsets[id]=pos;add(id+' 0 obj\n'+header);if(raw){add('\nstream\n');add(raw);add('\nendstream')}add('\nendobj\n')}
 add('%PDF-1.4\n%CASTHER\n');const all=bookPages.length;obj(1,'<</Type /Catalog /Pages 2 0 R>>');obj(2,`<</Type /Pages /Count ${all} /Kids [${Array.from({length:all},(_,i)=>(3+i*3)+' 0 R').join(' ')}]>>`);
 for(let i=0;i<all;i++){const pid=3+i*3,imgid=pid+1,contentid=pid+2,jpg=jpgs[i];obj(pid,`<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources <</XObject <</Pic ${imgid} 0 R>>>> /Contents ${contentid} 0 R>>`);obj(imgid,`<</Type /XObject /Subtype /Image /Width 840 /Height 1188 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length}>>`,jpg);const stream=encoder.encode(`q\n${PW} 0 0 ${PH} 0 0 cm\n/Pic Do\nQ\n`);obj(contentid,`<</Length ${stream.length}>>`,stream)}
 const xref=pos;add(`xref\n0 ${3+3*all}\n0000000000 65535 f \n`);for(let i=1;i<3+all*3;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');add(`trailer\n<</Size ${3+3*all} /Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`);
 downloadBlob(new Blob(pieces,{type:'application/pdf'}),'Casther_Catalogo_A4_Actualizado.pdf','application/pdf');notify(`PDF A4 listo: ${all} páginas, con los productos agregados.`,6500);
 }catch(err){console.error('Error PDF',err);notify('No fue posible descargar el PDF: '+err.message,7000)}finally{btns.forEach(b=>b.disabled=false)}}
$('#pdfBtn').onclick=makePDF;$('#bookPdf').onclick=makePDF;
/* Ampliación de fotografías */
document.addEventListener('click',e=>{const it=e.target.closest('.item');if(!it||e.target.closest('button'))return;$('#lbimg').src=IMG[it.dataset.f]||'';$('#lbt').textContent=it.dataset.c||it.dataset.s;$('#lbs').textContent=it.dataset.l+' · '+it.dataset.s;$('#lb').classList.add('on')});
$('#lb').addEventListener('click',e=>{if(e.target.id==='lb'||e.target.id==='lbx')$('#lb').classList.remove('on')});
renderSite();if(new URLSearchParams(location.search).get('vista')==='libro')bookMode(true,false);
window.__CASTHER_TEST__={buildBook,bookPages:()=>bookPages,custom:()=>custom,catalog:()=>catalog,zipStore,canvasFor};
})();
