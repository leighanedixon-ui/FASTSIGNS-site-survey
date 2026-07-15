/* ============ App: state, autosave, views, export ============ */
const { useState, useRef, useEffect, useCallback } = React;
const STORE_KEY = 'fastsigns_site_survey_v1';

const genId = () => (Date.now().toString(36) + Math.random().toString(36).slice(2,6));
const blankState = () => ({ surveyId: genId(), meta:{}, scope:{}, exterior:{}, signoff:{}, open:{contact:false,site:false,safety:false} });

function load(){
  try{ const r=localStorage.getItem(STORE_KEY); if(r){ const d={...blankState(), ...JSON.parse(r)}; if(!d.surveyId) d.surveyId=genId(); return d; } }catch(e){}
  return blankState();
}

/* path helpers for scope items: scope[productId] = [ {..fields..}, ... ] */

function App(){
  const [view, setView] = useState('main');           // main | exterior | review | mysurveys
  const [data, setData] = useState(load);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const saveTimer = useRef(null);
  const toastTimer = useRef(null);

  /* autosave (debounced) */
  useEffect(()=>{
    setSaving(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(()=>{
      try{ localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
      catch(e){ flash('Storage full — remove a few photos'); }
      setSaving(false);
    }, 500);
    return ()=>clearTimeout(saveTimer.current);
  },[data]);

  const flash = msg=>{
    setToast(msg); clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(''),2200);
  };

  const resetAll = ()=>{
    if(!confirm('Start a new site survey? This clears all current entries on this device. Export or send first if you need a copy.')) return;
    setData(blankState()); setView('main'); scrollTop(); setAutoFile({status:'idle'}); flash('Cleared — ready for a new site');
  };

  const markComplete = ()=>{
    if(!(data.meta && data.meta.site_code && data.meta.surveyor)){ flash('Add a Site Code and Surveyor first'); return; }
    setData(d=>({...d, completed:true, completedAt:Date.now()}));
    setAutoFile({status:'filing'});
    flash('Survey complete — filing to FASTSIGNS…');
  };
  const reopen = ()=>setData(d=>({...d, completed:false}));

  /* ---- mutations ---- */
  const setMeta = (sectionId, key, val)=>setData(d=>({...d, meta:{...d.meta, [key]:val}}));
  const setSignoff = (key,val)=>setData(d=>({...d, signoff:{...d.signoff, [key]:val}}));
  const toggleOpen = id=>setData(d=>({...d, open:{...d.open, [id]:!d.open?.[id]}}));

  const bucket = (group)=> group==='exterior' ? 'exterior' : 'scope';
  const items = (group, pid)=> (data[bucket(group)][pid]||[]);

  /* ---- auto-file to team repo when the survey is complete (customer signed) ---- */
  const [autoFile, setAutoFile] = useState({status:'idle'});
  const [onlineTick, setOnlineTick] = useState(0);
  const filingRef = useRef(false);
  const tryFileRef = useRef(null);

  const tryFile = async ()=>{
    if(filingRef.current) return;
    if(!(window.isComplete && window.isComplete(data))) return;
    if(!navigator.onLine){ setAutoFile({status:'error', msg:'Offline — files automatically when back online.', retry:retryFile}); return; }
    const fp = window.fingerprint(data, items);
    if(data._filedFp===fp){ setAutoFile(a=>a.status==='done'?a:{status:'done'}); return; }
    filingRef.current=true; setAutoFile({status:'filing'});
    try{
      const res = await window.fileSurvey(data, items);
      filingRef.current=false;
      setData(d=>({...d, _filedFp:fp, _filedPath:(res&&res.path)||null, _filedAt:Date.now()}));
      setAutoFile({status:'done'});
      flash('Filed to FASTSIGNS ✓');
    }catch(e){
      filingRef.current=false;
      setAutoFile({status:'error', msg:'Could not file: '+e.message, retry:retryFile});
    }
  };
  tryFileRef.current = tryFile;
  const retryFile = useCallback(()=>{ tryFileRef.current && tryFileRef.current(); },[]);

  /* fire when the survey becomes complete or changes after completion (debounced) */
  useEffect(()=>{
    if(!(window.isComplete && window.isComplete(data))) return;
    if(data._filedFp && data._filedFp===window.fingerprint(data, items)){
      setAutoFile(a=>a.status==='filing'?a:{status:'done'}); return;
    }
    if(!navigator.onLine){ setAutoFile({status:'error', msg:'Offline — files automatically when back online.', retry:retryFile}); return; }
    const t=setTimeout(()=>{ tryFileRef.current && tryFileRef.current(); }, 1800);
    return ()=>clearTimeout(t);
  },[data, onlineTick]);

  /* retry the moment the device comes back online */
  useEffect(()=>{
    const on=()=>setOnlineTick(t=>t+1);
    window.addEventListener('online', on);
    return ()=>window.removeEventListener('online', on);
  },[]);

  const addItem = (group,pid)=>setData(d=>{
    const b=bucket(group); const list=[...(d[b][pid]||[]), {}];
    return {...d, [b]:{...d[b], [pid]:list}};
  });
  const removeItem = (group,pid,idx)=>setData(d=>{
    const b=bucket(group); const list=(d[b][pid]||[]).filter((_,i)=>i!==idx);
    const nb={...d[b]}; if(list.length) nb[pid]=list; else delete nb[pid];
    return {...d, [b]:nb};
  });
  const setItemField = (group,pid,idx,key,val)=>setData(d=>{
    const b=bucket(group); const list=(d[b][pid]||[]).map((it,i)=>i===idx?{...it,[key]:val}:it);
    return {...d, [b]:{...d[b], [pid]:list}};
  });

  const toggleProduct = (group,pid)=>{
    const has = items(group,pid).length>0;
    if(has) return; // already active — tapping card scrolls; handled below
    addItem(group,pid);
  };

  /* counts */
  const extCount = SURVEY.EXTERIOR.reduce((n,p)=>n+items('exterior',p.id).length,0);

  return <div className="app">
    <Header view={view} onBack={()=>setView('main')} onMySurveys={()=>{setView('mysurveys'); scrollTop();}}/>

    {view==='main' && <MainView
        data={data} setMeta={setMeta} toggleOpen={toggleOpen}
        items={items} addItem={addItem} removeItem={removeItem} setItemField={setItemField}
        toggleProduct={toggleProduct} goExterior={()=>{setView('exterior'); scrollTop();}}
        extCount={extCount} setSignoff={setSignoff} onReset={resetAll}/>}

    {view==='exterior' && <ExteriorView
        items={items} addItem={addItem} removeItem={removeItem} setItemField={setItemField}/>}

    {view==='review' && <ReviewView data={data} items={items} autoFile={autoFile}
        onComplete={markComplete} onReopen={reopen}/>}

    {view==='mysurveys' && <MySurveysView email={data.meta && data.meta.surveyor_email}/>}

    <ActionBar view={view} saving={saving} locked={!data.completed}
      onLocked={()=>{ setView('review'); scrollTop(); flash('Tap “Survey Complete” first to unlock Send & PDF'); }}
      onReview={()=>{setView('review'); scrollTop();}}
      onEdit={()=>{setView('main'); scrollTop();}}
      onExport={()=>{ if(view!=='review'){setView('review'); scrollTop(); setTimeout(()=>window.print(),350);} else window.print(); }}
      onSend={()=>sendToRep(data, flash)}/>

    <div className={"toast"+(toast?' show':'')}><span className="dot"></span>{toast}</div>
  </div>;
}

function scrollTop(){ window.scrollTo({top:0}); }

/* ---------- Header ---------- */
function Header({view, onBack, onMySurveys}){
  return <div className="appbar">
    <div className="appbar-inner">
      {view==='exterior'
        ? <button className="back-btn" onClick={onBack}><Icon name="back" size={16}/> Products</button>
        : view==='mysurveys'
        ? <button className="back-btn" onClick={onBack}><Icon name="back" size={16}/> Survey</button>
        : <div className="wordmark"><span className="mark"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3 L21 19 L3 19 Z" fill="#fff"/></svg></span><span className="fs">Site Survey</span></div>}
      <div className="appbar-title">
        <div className="t">{view==='exterior'?'Exterior Signs':view==='review'?'Review & Export':view==='mysurveys'?'My Surveys':'Site Survey'}</div>
        <div className="s">Measurement Form</div>
      </div>
      {view==='main' && <button className="back-btn" style={{marginLeft:'auto'}} onClick={onMySurveys}><Icon name="pdf" size={15}/> My Surveys</button>}
    </div>
  </div>;
}

/* ---------- Flat site-info header ---------- */
function InfoBlock({data, setMeta}){
  const sec = SURVEY.INFO;
  return <div className="section open infoblock" style={{marginTop:14}}>
    <div className="info-head">
      <span className="section-num">1</span>
      <span className="meta"><span className="ttl">{sec.title}</span></span>
    </div>
    <div className="section-body" style={{paddingTop:14}}>
      <FieldGrid fields={sec.fields} data={data.meta} onField={(k,v)=>setMeta(sec.id,k,v)}/>
    </div>
  </div>;
}

/* ---------- Universal collapsible section ---------- */
function UniSection({sec, data, open, onToggle, setMeta}){
  const filled = sec.fields.filter(f=>f.key && data.meta[f.key]!=null && data.meta[f.key]!=='' &&
    !(Array.isArray(data.meta[f.key]) && data.meta[f.key].length===0)).length;
  const reqKeys = sec.fields.filter(f=>f.req).map(f=>f.key);
  const reqDone = reqKeys.length>0 && reqKeys.every(k=>data.meta[k]);
  return <div className={"section "+(open?'open':'collapsed')}>
    <button className="section-head" onClick={onToggle}>
      <span className="section-num">{sec.num}</span>
      <span className="meta"><span className="ttl">{sec.title}</span><span className="sub">{sec.sub}</span></span>
      {reqDone ? <span className="pill done">Done</span> : filled>0 ? <span className="pill">{filled} filled</span> : <span className="pill opt">Tap to open</span>}
      <span className="chev"><Icon name="chevron"/></span>
    </button>
    <div className="section-body">
      <FieldGrid fields={sec.fields} data={data.meta} onField={(k,v)=>setMeta(sec.id,k,v)}/>
    </div>
  </div>;
}

/* ---------- Product item module ---------- */
function ItemModule({group, product, item, idx, onField, onRemove}){
  const labelVal = product.labelField ? item[product.labelField] : '';
  const title = labelVal ? labelVal : `${product.labelPrefix||product.itemName} ${idx+1}`;
  return <div className="item">
    <div className="item-head">
      <span className="ix">{idx+1}</span>
      <span className="nm">{title}</span>
      <button className="rm" onClick={onRemove}><Icon name="trash" size={15}/> Remove</button>
    </div>
    <div className="item-body">
      <FieldGrid fields={product.fields} data={item} onField={(k,v)=>onField(idx,k,v)}/>
    </div>
  </div>;
}

function ProductModules({group, product, list, addItem, removeItem, setItemField}){
  return <div className="modwrap">
    {product.note && <NoteBox noteType={product.note.type} text={product.note.text}/>}
    {list.map((it,i)=>(
      <ItemModule key={i} group={group} product={product} item={it} idx={i}
        onField={(idx,k,v)=>setItemField(group,product.id,idx,k,v)}
        onRemove={()=>removeItem(group,product.id,i)}/>
    ))}
    <button className="additem" onClick={()=>addItem(group,product.id)}><Icon name="plus" size={17}/> {product.addLabel}</button>
  </div>;
}

/* ---------- Product card ---------- */
function ProductCard({product, count, onClick, isExterior}){
  return <button className={"prodcard"+(count>0?' on':'')} onClick={onClick}>
    {count>0 && !isExterior && <span className="badge">{count}</span>}
    {isExterior && count>0 && <span className="badge">{count}</span>}
    {isExterior && count===0 && <span className="arrow"><Icon name="chevron" size={16}/></span>}
    <span className="ic"><Icon name={product.icon} size={20}/></span>
    <span className="nm">{product.name}</span>
    <span className="ds">{product.desc}</span>
  </button>;
}

/* ---------- Main view ---------- */
function MainView({data, setMeta, toggleOpen, items, addItem, removeItem, setItemField, toggleProduct, goExterior, extCount, setSignoff, onReset}){
  const activeRef = useRef({});
  const onCard = pid=>{
    toggleProduct('scope',pid);
    setTimeout(()=>{ const el=activeRef.current[pid]; if(el) el.scrollIntoView?.({behavior:'smooth',block:'start'}); },60);
  };
  return <div className="wrap">
    <div className="jobbar">
      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
        <div style={{flex:1,minWidth:0}}>
          <h1>Site Survey &amp; Measurements</h1>
          <p>Fill in the site details, then add each product you're measuring. Everything saves automatically.</p>
        </div>
        <button className="btn ghost sm" style={{flex:'none',minHeight:38,padding:'0 12px',fontSize:13}} onClick={onReset}>New site</button>
      </div>
    </div>

    {SURVEY && <InfoBlock data={data} setMeta={setMeta}/>}

    <div className="scope-intro">
      <div className="lbl">Section 2</div>
      <h2>Scope &amp; Measurements</h2>
      <p>Tap a product to add it. Add as many entries as you need within each.</p>
    </div>

    <div className="prodgrid">
      {SURVEY.PRODUCTS.map(p=>(
        <ProductCard key={p.id} product={p} count={items('scope',p.id).length} onClick={()=>onCard(p.id)}/>
      ))}
      <ProductCard product={{id:'exterior',name:'Exterior Signs',desc:'Window, channel, monument…',icon:'ext'}}
        count={extCount} isExterior onClick={goExterior}/>
    </div>

    {/* active product modules */}
    {SURVEY.PRODUCTS.map(p=>{
      const list = items('scope',p.id);
      if(!list.length) return null;
      return <div key={p.id} ref={el=>activeRef.current[p.id]=el} style={{marginTop:18}}>
        <div className="scope-intro" style={{margin:'6px 0 0'}}>
          <h2 style={{fontSize:17,display:'flex',alignItems:'center',gap:9}}>
            <span className="ic" style={{display:'inline-grid',placeItems:'center',width:30,height:30,borderRadius:8,background:'var(--red)',color:'#fff'}}>
              <Icon name={p.icon} size={17}/></span>{p.name}</h2>
        </div>
        <ProductModules group="scope" product={p} list={list}
          addItem={addItem} removeItem={removeItem} setItemField={setItemField}/>
      </div>;
    })}

    {extCount>0 && <div style={{marginTop:18}}>
      <div className="scope-intro" style={{margin:'6px 0 0'}}>
        <h2 style={{fontSize:17,display:'flex',alignItems:'center',gap:9}}>
          <span className="ic" style={{display:'inline-grid',placeItems:'center',width:30,height:30,borderRadius:8,background:'var(--red)',color:'#fff'}}>
            <Icon name="ext" size={17}/></span>Exterior Signs</h2>
      </div>
      <div className="empty-scope" style={{marginTop:10,cursor:'pointer'}} onClick={goExterior}>
        {extCount} exterior {extCount===1?'item':'items'} added — tap to edit
      </div>
    </div>}

    {/* Sign-off section */}
    <SignoffSection data={data} setSignoff={setSignoff}/>
  </div>;
}

function SignoffSection({data, setSignoff}){
  const sec = SURVEY.SIGNOFF;
  return <div className="section open" style={{marginTop:18}}>
    <div className="section-head" style={{cursor:'default'}}>
      <span className="section-num">3</span>
      <span className="meta"><span className="ttl">{sec.title}</span><span className="sub">{sec.sub}</span></span>
    </div>
    <div className="section-body">
      <FieldGrid fields={sec.fields} data={data.signoff} onField={setSignoff}/>
    </div>
  </div>;
}

/* ---------- Exterior view ---------- */
function ExteriorView({items, addItem, removeItem, setItemField}){
  const activeRef = useRef({});
  const onCard = pid=>{
    if(items('exterior',pid).length===0) addItem('exterior',pid);
    setTimeout(()=>{ const el=activeRef.current[pid]; if(el) el.scrollIntoView?.({behavior:'smooth',block:'start'}); },60);
  };
  return <div className="wrap">
    <div className="jobbar">
      <h1>Exterior Signs</h1>
      <p>Choose each exterior sign type on site. Add as many as you need, then head back to Products.</p>
    </div>
    <div className="prodgrid">
      {SURVEY.EXTERIOR.map(p=>(
        <ProductCard key={p.id} product={p} count={items('exterior',p.id).length} onClick={()=>onCard(p.id)}/>
      ))}
    </div>
    {SURVEY.EXTERIOR.map(p=>{
      const list = items('exterior',p.id);
      if(!list.length) return null;
      return <div key={p.id} ref={el=>activeRef.current[p.id]=el} style={{marginTop:18}}>
        <div className="scope-intro" style={{margin:'6px 0 0'}}>
          <h2 style={{fontSize:17,display:'flex',alignItems:'center',gap:9}}>
            <span className="ic" style={{display:'inline-grid',placeItems:'center',width:30,height:30,borderRadius:8,background:'var(--red)',color:'#fff'}}>
              <Icon name={p.icon} size={17}/></span>{p.name}</h2>
        </div>
        <ProductModules group="exterior" product={p} list={list}
          addItem={addItem} removeItem={removeItem} setItemField={setItemField}/>
      </div>;
    })}
  </div>;
}

/* ---------- My Surveys lookup ---------- */
function MySurveysView({email: prefillEmail}){
  const [email, setEmail] = React.useState(prefillEmail||'');
  const [state, setState] = React.useState({status:'idle'}); // idle | loading | done | error
  const [surveys, setSurveys] = React.useState([]);

  const search = async ()=>{
    const e = email.trim();
    if(!e){ setState({status:'error', msg:'Enter your email'}); return; }
    setState({status:'loading'});
    try{
      const res = await fetch('/.netlify/functions/list-surveys?email='+encodeURIComponent(e));
      if(!res.ok) throw new Error('Server '+res.status);
      const data = await res.json();
      setSurveys(data.surveys||[]);
      setState({status:'done'});
    }catch(err){
      setState({status:'error', msg:'Could not look up surveys — '+err.message});
    }
  };

  return <div className="wrap">
    <div className="jobbar">
      <h1>My Surveys</h1>
      <p>Enter your surveyor email to see every survey you&rsquo;ve filed to FASTSIGNS.</p>
    </div>
    <div className="section open" style={{marginTop:14}}>
      <div className="section-body" style={{paddingTop:14}}>
        <div className="fieldgrid">
          <div className="field col-1">
            <label className="flabel">Surveyor email</label>
            <input type="email" className="input" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="you@company.com" onKeyDown={e=>{ if(e.key==='Enter') search(); }}/>
          </div>
        </div>
        <button className="btn primary" style={{marginTop:12}} onClick={search} disabled={state.status==='loading'}>
          <Icon name="pdf" size={16}/> {state.status==='loading'?'Searching…':'Find my surveys'}
        </button>
        {state.status==='error' && <div className="sp-warn" style={{marginTop:12}}><Icon name="info" size={14}/> {state.msg}</div>}
      </div>
    </div>

    {state.status==='done' && <div className="section open" style={{marginTop:14}}>
      <div className="section-body" style={{paddingTop:14}}>
        {!surveys.length
          ? <p className="rev-empty">No filed surveys found for that email yet.</p>
          : <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {surveys.map((s,i)=>(
                <a key={i} href={s.htmlUrl} target="_blank" rel="noopener" className="item" style={{textDecoration:'none',color:'inherit',display:'block'}}>
                  <div className="item-head" style={{cursor:'pointer'}}>
                    <span className="nm">{s.siteCode||'Site'}</span>
                  </div>
                  <div className="item-body" style={{fontSize:13,color:'var(--ink-soft)'}}>
                    {s.address && <div>{s.address}</div>}
                    {s.surveyDate && <div>Survey date: {s.surveyDate}</div>}
                    {s.submittedAt && <div>Filed: {new Date(s.submittedAt).toLocaleString()}</div>}
                  </div>
                </a>
              ))}
            </div>}
      </div>
    </div>}
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
