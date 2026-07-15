/* ============ Review, export & send-to-rep ============ */

/* field label lookup across all schemas */
function buildLabelMap(){
  const m={};
  const add = list=>list.forEach(p=>(p.fields||[]).forEach(f=>{ if(f.key) m[f.key]=f.label; }));
  add([SURVEY.INFO]); add(SURVEY.PRODUCTS); add(SURVEY.EXTERIOR); add([SURVEY.SIGNOFF]);
  return m;
}
const LABELS = buildLabelMap();

function fmtVal(v, key){
  if(v==null||v==='') return '';
  if(Array.isArray(v)) return v.join(', ');
  // append inches to numeric measurement-ish fields
  return String(v);
}
function isMeasure(key){
  return /(_w$|_h$|^w$|^h$|^d$|width|height|meas_|letter_h|mount_h|overall_h|panel_w|panel_h|header_h|install_h|win_)/.test(key);
}

/* ---------- key/value list for a data object ---------- */
const SKIP_TYPES = ['photos','panels','signature','reference','note','subhead'];
function KVList({obj, fields}){
  const rows = fields.filter(f=>f.key && obj[f.key]!=null && obj[f.key]!=='' &&
    !(Array.isArray(obj[f.key]) && obj[f.key].length===0) && !SKIP_TYPES.includes(f.type));
  if(!rows.length) return null;
  return <div className="rev-kv">
    {rows.map(f=>{
      let v = fmtVal(obj[f.key], f.key);
      if(isMeasure(f.key) && /^[\d.]+$/.test(String(obj[f.key]))) v = v+'″';
      if(f.unit==='ft' && /^[\d.]+$/.test(String(obj[f.key]))) v = obj[f.key]+' ft';
      return <div className="kv" key={f.key}>
        <span className="k">{f.label}</span><span className="v">{v}</span>
      </div>;
    })}
  </div>;
}

function PhotoStrip({photos}){
  if(!photos || !photos.length) return null;
  return <div className="rev-photos">{photos.map((p,i)=><img key={i} src={p} alt=""/>)}</div>;
}

/* ---------- generic repeater table (dynamic columns) ---------- */
function RepeaterTable({field, rows}){
  if(!rows || !rows.length) return null;
  const cols = field.cols || [{key:'label',label:'Panel'},{key:'w',label:'Width'},{key:'h',label:'Height'}];
  return <div style={{marginTop:10}}>
    <div style={{fontSize:12,fontWeight:700,color:'var(--ink-soft)',marginBottom:4}}>{field.label}</div>
    <table className="rev-panels">
      <thead><tr>{cols.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead>
      <tbody>{rows.map((r,i)=>(
        <tr key={i}>{cols.map((c,ci)=>{
          let val = r[c.key];
          if(val==null||val==='') val = ci===0 ? (cols[0].label+' '+(i+1)) : '—';
          else if(ci!==0 && c.key!=='qty' && /^[\d.]+$/.test(String(val))) val = val+'″';
          return <td key={c.key}>{val}</td>;
        })}</tr>
      ))}</tbody>
    </table>
  </div>;
}

function ReviewProduct({product, list, group}){
  if(!list.length) return null;
  const repeaters = product.fields.filter(f=>f.type==='panels');
  return <div className="rev-sec">
    <h3>{product.name}</h3>
    {list.map((it,i)=>(
      <div className="rev-item" key={i}>
        <h4>{(product.labelField && it[product.labelField]) || `${product.labelPrefix||product.itemName} ${i+1}`}</h4>
        <KVList obj={it} fields={product.fields}/>
        {repeaters.map(f=> it[f.key] && it[f.key].length ? <RepeaterTable key={f.key} field={f} rows={it[f.key]}/> : null)}
        <PhotoStrip photos={it.photos}/>
      </div>
    ))}
  </div>;
}

function ReviewView({data, items, autoFile, onComplete, onReopen}){
  const now = new Date();
  const sc = data.meta.site_code || '—';
  const anyScope = SURVEY.PRODUCTS.some(p=>items('scope',p.id).length) || SURVEY.EXTERIOR.some(p=>items('exterior',p.id).length);
  return <div className="wrap review">
    <div className="rev-doc">
      <div className="rev-banner">
        <h2>Customer Site Survey &amp; Installation Checklist</h2>
        <p>Site {sc} · {data.meta.street||''} · Generated {now.toLocaleDateString()}</p>
      </div>

      {(()=>{
        const sec = SURVEY.INFO;
        const has = sec.fields.some(f=>f.key && data.meta[f.key]!=null && data.meta[f.key]!=='');
        if(!has) return null;
        return <div className="rev-sec">
          <h3>{sec.title}</h3>
          <KVList obj={data.meta} fields={sec.fields}/>
        </div>;
      })()}

      {!anyScope && <div className="rev-sec"><p className="rev-empty">No products added yet.</p></div>}
      {SURVEY.PRODUCTS.map(p=><ReviewProduct key={p.id} product={p} list={items('scope',p.id)} group="scope"/>)}
      {SURVEY.EXTERIOR.map(p=><ReviewProduct key={p.id} product={p} list={items('exterior',p.id)} group="exterior"/>)}

      {/* sign-off */}
      {(()=>{
        const s=data.signoff||{};
        const has = Object.keys(s).some(k=>s[k]!=null && s[k]!=='' && !(Array.isArray(s[k])&&s[k].length===0));
        if(!has) return null;
        return <div className="rev-sec">
          <h3>Photos &amp; Sign-Off</h3>
          <KVList obj={s} fields={SURVEY.SIGNOFF.fields}/>
          <PhotoStrip photos={s.site_photos}/>
          {s.signature && <div className="rev-sig" style={{marginTop:12}}>
            <div className="kv"><span className="k" style={{fontSize:11,color:'var(--muted-2)',fontWeight:600,textTransform:'uppercase'}}>Signature</span></div>
            <img src={s.signature} alt="signature"/>
          </div>}
        </div>;
      })()}
    </div>
    <CompletePanel data={data} autoFile={autoFile} onComplete={onComplete} onReopen={onReopen}/>
    <div className="no-print" style={{textAlign:'center',color:'var(--muted-2)',fontSize:12.5,padding:'14px 0 4px'}}>
      Use <strong>Export PDF</strong> to save or print · <strong>Send</strong> to email a summary
    </div>
  </div>;
}

/* ---------- Auto-file to team repository (Netlify Function → GitHub) ---------- */
const SUBMIT_ENDPOINT = '/.netlify/functions/submit-survey';

function pad(n){ return String(n).padStart(2,'0'); }
function slug(s){ return String(s||'').trim().replace(/[^A-Za-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'') || 'site'; }

/* a completed survey = explicitly marked complete by the surveyor */
function isComplete(data){ return !!data.completed; }
/* the minimum needed before the surveyor may mark it complete */
function canComplete(data){ const m=data.meta||{}; return !!(m.site_code && m.surveyor); }
/* stable repo path per survey (surv& re-files overwrite the same record) */
function surveyBase(data){
  const site = slug(data.meta && data.meta.site_code);
  const id = data.surveyId || 'x';
  return `surveys/${site}/${site}_${id}`;
}
/* cheap content fingerprint so we only re-file when something actually changed */
function fingerprint(data, items){
  try{ return JSON.stringify(buildRecord(data, items)).length + ':' + hashStr(JSON.stringify(buildRecord(data, items))); }
  catch(e){ return String(Date.now()); }
}
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return h; }

async function fileSurvey(data, items){
  const m=data.meta||{};
  if(!(m.site_code && m.surveyor)) throw new Error('Missing Site Code or Surveyor');
  const now=new Date();
  const base=surveyBase(data);
  const html=buildSnapshotHTML(data, items, now);
  const record=buildRecord(data, items, now);
  const res=await fetch(SUBMIT_ENDPOINT,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ base, site:slug(m.site_code), html, json:JSON.stringify(record,null,2),
      surveyorEmail:m.surveyor_email||null, surveyor:m.surveyor||null, address:m.street||null })
  });
  if(!res.ok){ const t=await res.text(); throw new Error('Server '+res.status+' — '+t.slice(0,160)); }
  return res.json().catch(()=>({ok:true, path:base+'.html'}));
}
Object.assign(window, { fileSurvey, isComplete, canComplete, fingerprint });

/* ---------- Survey Complete gate (unlocks Send/PDF + files to repo) ---------- */
function CompletePanel({data, autoFile, onComplete, onReopen}){
  const completed = isComplete(data);
  const ready = canComplete(data);
  const st = (autoFile && autoFile.status) || 'idle';
  const filedAt = data._filedAt;

  if(!completed){
    return <div className="no-print submitpanel">
      <div className="sp-head">
        <span className="sp-ic"><Icon name="check" size={18}/></span>
        <div>
          <div className="sp-ttl">Finish the survey</div>
          <div className="sp-sub">Mark it complete to file it to FASTSIGNS and unlock Send &amp; PDF</div>
        </div>
      </div>
      {!ready && <div className="sp-warn"><Icon name="info" size={14}/> Add a <strong>Site Code</strong> and <strong>Surveyor</strong> before you can complete.</div>}
      <button className="btn primary" style={{width:'100%',marginTop:12}} disabled={!ready} onClick={onComplete}>
        <Icon name="check" size={17}/> Survey Complete
      </button>
      <div className="sp-note">Send &amp; PDF unlock once the survey is marked complete.</div>
    </div>;
  }

  return <div className="no-print submitpanel">
    <div className="sp-head">
      <span className="sp-ic" style={{background:'var(--green)'}}><Icon name="check" size={18}/></span>
      <div>
        <div className="sp-ttl">Survey complete</div>
        <div className="sp-sub">Filed to the FASTSIGNS team repository · Send &amp; PDF are unlocked</div>
      </div>
    </div>
    {st==='filing' && <div className="sp-sending">Filing to the team repository…</div>}
    {st==='error' && <div className="sp-err"><Icon name="warn" size={14}/> {autoFile.msg||'Could not file — will retry when back online.'}
      <button className="btn ghost sm" style={{marginLeft:'auto'}} onClick={autoFile.retry}>Retry now</button></div>}
    {(st==='done' || filedAt) && st!=='filing' && st!=='error' &&
      <div className="sp-ok"><Icon name="check" size={14}/> Filed to FASTSIGNS{data._filedPath?(' · '+data._filedPath):''}{filedAt?(' · '+new Date(filedAt).toLocaleTimeString()):''}. Re-files if you change anything.</div>}
    <button className="btn ghost" style={{width:'100%',marginTop:12}} onClick={onReopen}>
      <Icon name="back" size={16}/> Reopen to edit
    </button>
    <div className="sp-note">Send &amp; PDF are available below for emailing your company and the install coordinator.</div>
  </div>;
}

/* ---------- build a self-contained HTML snapshot of the survey ---------- */
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function snapKV(obj, fields){
  const rows = fields.filter(f=>f.key && obj[f.key]!=null && obj[f.key]!=='' &&
    !(Array.isArray(obj[f.key]) && obj[f.key].length===0) && !SKIP_TYPES.includes(f.type));
  if(!rows.length) return '';
  const cells = rows.map(f=>{
    let v = Array.isArray(obj[f.key]) ? obj[f.key].join(', ') : obj[f.key];
    if(isMeasure(f.key) && /^[\d.]+$/.test(String(obj[f.key]))) v = v+'″';
    else if(f.unit==='ft' && /^[\d.]+$/.test(String(obj[f.key]))) v = v+' ft';
    return `<div class="kv"><div class="k">${esc(f.label)}</div><div class="v">${esc(v)}</div></div>`;
  }).join('');
  return `<div class="kv-grid">${cells}</div>`;
}
function snapRepeater(field, rows){
  if(!rows || !rows.length) return '';
  const cols = field.cols || [{key:'label',label:'Panel'},{key:'w',label:'Width'},{key:'h',label:'Height'}];
  const head = cols.map(c=>`<th>${esc(c.label)}</th>`).join('');
  const body = rows.map((r,i)=>'<tr>'+cols.map((c,ci)=>{
    let val=r[c.key];
    if(val==null||val==='') val = ci===0?(cols[0].label+' '+(i+1)):'—';
    else if(ci!==0 && c.key!=='qty' && /^[\d.]+$/.test(String(val))) val=val+'″';
    return `<td>${esc(val)}</td>`;
  }).join('')+'</tr>').join('');
  return `<div class="rep-ttl">${esc(field.label)}</div><table class="rep"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
function snapPhotos(photos){
  if(!photos || !photos.length) return '';
  return `<div class="photos">${photos.map(p=>`<img src="${p}"/>`).join('')}</div>`;
}
function snapProduct(p, list){
  if(!list.length) return '';
  const reps = p.fields.filter(f=>f.type==='panels');
  const items = list.map((it,i)=>{
    const title = (p.labelField && it[p.labelField]) || `${p.labelPrefix||p.itemName} ${i+1}`;
    return `<div class="item"><h4>${esc(title)}</h4>${snapKV(it,p.fields)}${reps.map(f=>it[f.key]&&it[f.key].length?snapRepeater(f,it[f.key]):'').join('')}${snapPhotos(it.photos)}</div>`;
  }).join('');
  return `<section><h3>${esc(p.name)}</h3>${items}</section>`;
}

function buildSnapshotHTML(data, items, now){
  now = now || new Date();
  const m = data.meta||{};
  const infoHas = SURVEY.INFO.fields.some(f=>f.key && m[f.key]!=null && m[f.key]!=='');
  const info = infoHas ? `<section><h3>Site Information</h3>${snapKV(m, SURVEY.INFO.fields)}</section>` : '';
  const scope = SURVEY.PRODUCTS.map(p=>snapProduct(p, items('scope',p.id))).join('');
  const ext = SURVEY.EXTERIOR.map(p=>snapProduct(p, items('exterior',p.id))).join('');
  const s = data.signoff||{};
  const signHas = Object.keys(s).some(k=>s[k]!=null && s[k]!=='' && !(Array.isArray(s[k])&&s[k].length===0));
  const sign = signHas ? `<section><h3>Photos &amp; Sign-Off</h3>${snapKV(s, SURVEY.SIGNOFF.fields)}${snapPhotos(s.site_photos)}${s.signature?`<div class="sig"><div class="k">Signature</div><img src="${s.signature}"/></div>`:''}</section>` : '';
  const css = `*{box-sizing:border-box}body{font-family:'Public Sans',system-ui,-apple-system,'Segoe UI',sans-serif;color:#16243B;margin:0;background:#EEF1F5;padding:24px}.doc{max-width:840px;margin:0 auto;background:#fff;border:1px solid #D9DFE8;border-radius:14px;overflow:hidden}.banner{background:#16243B;color:#fff;padding:20px 24px;border-bottom:3px solid #1B75BC}.banner h1{margin:0;font-size:20px}.banner p{margin:4px 0 0;font-size:12.5px;color:#9fb0c8}section{padding:16px 24px;border-bottom:1px solid #D9DFE8}section:last-child{border-bottom:none}h3{margin:0 0 10px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#1B75BC}.kv-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px 18px}.kv .k{font-size:11px;color:#8A93A2;font-weight:600;text-transform:uppercase}.kv .v{font-size:14px;font-weight:600;word-break:break-word}.item{border:1px solid #D9DFE8;border-radius:10px;padding:12px 14px;margin-top:10px;background:#F7F9FB}.item h4{margin:0 0 8px;font-size:14px}.rep-ttl{font-size:12px;font-weight:700;margin-top:10px}table.rep{width:100%;border-collapse:collapse;margin-top:4px;font-size:13px}table.rep th{text-align:left;font-size:10.5px;text-transform:uppercase;color:#8A93A2;padding:3px 8px 3px 0;border-bottom:1px solid #D9DFE8}table.rep td{padding:4px 8px 4px 0;border-bottom:1px solid #D9DFE8}.photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-top:10px}.photos img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;border:1px solid #D9DFE8}.sig{margin-top:12px}.sig .k{font-size:11px;color:#8A93A2;font-weight:600;text-transform:uppercase}.sig img{max-width:260px;border:1px solid #D9DFE8;border-radius:8px;background:#fff;margin-top:4px}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Site Survey — ${esc(m.site_code||'')}</title><link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700;800&display=swap" rel="stylesheet"/><style>${css}</style></head><body><div class="doc"><div class="banner"><h1>Customer Site Survey &amp; Installation Checklist</h1><p>Site ${esc(m.site_code||'—')}${m.street?' · '+esc(m.street):''} · Surveyor ${esc(m.surveyor||'—')} · Filed ${esc(now.toLocaleString())}</p></div>${info}${scope}${ext}${sign}</div></body></html>`;
}

/* ---------- machine-readable record (photos reduced to counts) ---------- */
function stripHeavy(v){
  if(Array.isArray(v)){
    if(v.length && typeof v[0]==='string' && v[0].slice(0,5)==='data:') return { photoCount:v.length };
    return v.map(stripHeavy);
  }
  if(v && typeof v==='object'){ const o={}; for(const k in v) o[k]=stripHeavy(v[k]); return o; }
  if(typeof v==='string' && v.slice(0,5)==='data:') return '[image]';
  return v;
}
function buildRecord(data, items, now){
  now = now || new Date();
  return {
    submittedAt: now.toISOString(),
    siteCode: data.meta?.site_code || null,
    surveyor: data.meta?.surveyor || null,
    surveyorEmail: data.meta?.surveyor_email || null,
    surveyDate: data.meta?.survey_date || null,
    address: data.meta?.street || null,
    meta: stripHeavy(data.meta||{}),
    scope: stripHeavy(data.scope||{}),
    exterior: stripHeavy(data.exterior||{}),
    signoff: stripHeavy(data.signoff||{}),
  };
}

/* ---------- text summary for email ---------- */
function buildSummary(data, items){
  const L=[]; const m=data.meta;
  L.push('CUSTOMER SITE SURVEY & MEASUREMENT FORM');
  L.push('=========================================');
  L.push('Site Code: '+(m.site_code||'—'));
  if(m.survey_date) L.push('Survey Date: '+m.survey_date);
  if(m.street) L.push('Address: '+m.street);
  if(m.surveyor) L.push('Surveyor: '+m.surveyor);
  L.push('');
  const dumpItem = (p, it, i)=>{
    L.push('  • '+((p.labelField&&it[p.labelField])||(p.itemName+' '+(i+1))));
    p.fields.forEach(f=>{
      if(!f.key || f.type==='photos'||f.type==='signature'||f.type==='reference') return;
      const v=it[f.key];
      if(v==null||v===''||(Array.isArray(v)&&!v.length)) return;
      if(f.type==='panels'){
        const cols=f.cols||[{key:'label'},{key:'w'},{key:'h'}];
        const nums=cols.slice(1);
        L.push('      '+f.label+': '+v.map(r=>(r[cols[0].key]||'item')+' '+nums.map(c=>r[c.key]||'?').join('×')).join('; '));
        return;
      }
      let val=Array.isArray(v)?v.join(', '):v;
      if(isMeasure(f.key)&&/^[\d.]+$/.test(String(v))) val=val+'in';
      if(f.unit==='ft'&&/^[\d.]+$/.test(String(v))) val=val+'ft';
      L.push('      '+f.label+': '+val);
    });
    const np=(it.photos||[]).length; if(np) L.push('      ('+np+' photo'+(np>1?'s':'')+' attached in PDF)');
  };
  SURVEY.PRODUCTS.forEach(p=>{ const l=items('scope',p.id); if(l.length){ L.push(p.name.toUpperCase()); l.forEach((it,i)=>dumpItem(p,it,i)); L.push(''); }});
  const anyExt = SURVEY.EXTERIOR.some(p=>items('exterior',p.id).length);
  if(anyExt){ L.push('EXTERIOR SIGNS'); SURVEY.EXTERIOR.forEach(p=>{ const l=items('exterior',p.id); if(l.length){ L.push(' '+p.name); l.forEach((it,i)=>dumpItem(p,it,i)); }}); L.push(''); }
  if(data.signoff?.general_notes) L.push('Site notes: '+data.signoff.general_notes);
  L.push('');
  L.push('— Photos & signature are included in the exported PDF. Please attach the PDF to this email.');
  return L.join('\n');
}

function sendToRep(data, flash){
  const items=(g,pid)=> (g==='exterior'?data.exterior:data.scope)[pid]||[];
  const summary = buildSummary(data, items);
  const subj = 'Site Survey — '+(data.meta.site_code||'New Site');
  const href = 'mailto:?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(summary);
  if(href.length>1900){
    navigator.clipboard?.writeText(summary);
    flash('Summary copied — paste into your email');
    const short='mailto:?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent('Site survey summary copied to clipboard — paste here, and attach the exported PDF.');
    window.location.href=short;
  }else{
    window.location.href=href;
    flash('Opening email…');
  }
}

/* ---------- Action bar ---------- */
function ActionBar({view, saving, onReview, onEdit, onExport, onSend, locked, onLocked}){
  const lock = (fn)=> locked ? onLocked : fn;
  return <div className="actionbar">
    <div className="actionbar-inner">
      <div className="save-status">
        <span className={"dot"+(saving?' saving':'')}></span>
        {saving?'Saving…':'Saved'}
      </div>
      {view==='review'
        ? <button className="btn ghost sm" onClick={onEdit}><Icon name="back" size={16}/> Edit</button>
        : <button className="btn ghost sm" onClick={onReview}>Review</button>}
      <button className={"btn blue sm"+(locked?' is-locked':'')} aria-disabled={locked} onClick={lock(onSend)}>
        {locked && <Icon name="lock" size={14}/>}<Icon name="send" size={16}/> Send</button>
      <button className={"btn primary sm"+(locked?' is-locked':'')} aria-disabled={locked} onClick={lock(onExport)}>
        {locked && <Icon name="lock" size={14}/>}<Icon name="pdf" size={16}/> PDF</button>
    </div>
  </div>;
}

Object.assign(window, { ReviewView, ActionBar, sendToRep });
