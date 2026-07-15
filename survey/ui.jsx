/* ============ UI components & generic field renderer ============ */
const { useState, useRef, useEffect, useCallback } = React;

/* ---------- tiny icons ---------- */
function Icon({name, size=20}){
  const p = {width:size, height:size, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor',
    strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round'};
  const paths = {
    chevron:<path d="M6 9l6 6 6-6"/>,
    back:<path d="M15 18l-6-6 6-6"/>,
    plus:<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    trash:<><path d="M3 6h18"/><path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H6a1 1 0 01-1-1V6"/></>,
    x:<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    camera:<><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></>,
    pencil:<><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></>,
    undo:<><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></>,
    lock:<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
    check:<path d="M20 6L9 17l-5-5"/>,
    info:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
    warn:<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    pdf:<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    send:<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    // product icons
    dock:<><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></>,
    wall:<><rect x="2" y="4" width="20" height="16" rx="1"/><path d="M2 9h20M2 14h20M7 4v5m5 0v5m5-5v5M9 14v6"/></>,
    pod:<><rect x="3" y="3" width="18" height="18" rx="1"/><rect x="9" y="7" width="6" height="14"/><line x1="13" y1="14" x2="13" y2="15"/></>,
    vinyl:<><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 3l18 18"/></>,
    sign:<><rect x="4" y="5" width="16" height="11" rx="1"/><line x1="12" y1="16" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></>,
    ext:<><circle cx="12" cy="12" r="9"/><path d="M12 3a14 14 0 000 18M3 12h18"/></>,
    channel:<><path d="M4 7V5h16v2M9 19h6M12 5v14"/></>,
    monument:<><rect x="6" y="3" width="12" height="14" rx="1"/><path d="M5 17h14v3H5z"/></>,
    post:<><rect x="5" y="4" width="14" height="8" rx="1"/><line x1="12" y1="12" x2="12" y2="21"/></>,
    other:<><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
  };
  return <svg {...p}>{paths[name]||paths.other}</svg>;
}

/* ---------- conditional visibility ---------- */
function visible(field, data){
  if(!field.show) return true;
  const conds = Array.isArray(field.show) ? field.show : [field.show];
  return conds.every(c=>{
    const v = data[c.field];
    if(c.in) return c.in.includes(v);
    if(c.has) return Array.isArray(v) && v.includes(c.has);
    return true;
  });
}

/* ---------- field primitives ---------- */
function TextField({field, value, onChange}){
  const type = field.type==='email'?'email':field.type==='tel'?'tel':'text';
  return <input className="input" type={type} inputMode={field.type==='tel'?'tel':undefined}
    placeholder={field.placeholder||''} value={value||''} onChange={e=>onChange(e.target.value)} />;
}
function NumberField({field, value, onChange}){
  const unit = field.unit!==undefined ? field.unit : 'in';
  return <div className="input-unit">
    <input className="input" type="number" inputMode="decimal" step="any" placeholder="0"
      value={value??''} onChange={e=>onChange(e.target.value)} />
    {unit!=='' && <span className="unit">{unit}</span>}
  </div>;
}
function DateField({value, onChange}){
  return <input className="input" type="date" value={value||''} onChange={e=>onChange(e.target.value)} />;
}
function TextArea({field, value, onChange}){
  return <textarea className="textarea" placeholder={field.placeholder||''} value={value||''}
    onChange={e=>onChange(e.target.value)} />;
}
function Select({field, value, onChange}){
  return <select className="select" value={value||''} onChange={e=>onChange(e.target.value)}>
    <option value="">Select…</option>
    {field.options.map(o=><option key={o} value={o}>{o}</option>)}
  </select>;
}
function RadioGroup({field, value, onChange}){
  return <div className={"seg"+(field.options.length>3?' compact':'')}>
    {field.options.map(o=>{
      const on = value===o;
      const cls = on ? (o==='Yes'?'on yes':o==='No'?'on no':'on') : '';
      return <button key={o} type="button" className={"seg-opt "+cls} onClick={()=>onChange(on?'':o)}>{o}</button>;
    })}
  </div>;
}
function ChecksGroup({field, value, onChange}){
  const arr = Array.isArray(value)?value:[];
  const toggle = o => onChange(arr.includes(o)?arr.filter(x=>x!==o):[...arr,o]);
  return <div className={"checks"+(field.two?' two':'')}>
    {field.options.map(o=>{
      const on = arr.includes(o);
      return <div key={o} className={"check"+(on?' on':'')} onClick={()=>toggle(o)}>
        <span className="box">{on && <Icon name="check" size={15}/>}</span>{o}
      </div>;
    })}
  </div>;
}

/* ---------- photo capture (with compression) ---------- */
function compress(file){
  return new Promise(res=>{
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = ()=>{
      const max = 1400;
      let {width:w, height:h} = img;
      if(w>max||h>max){ const r=Math.min(max/w,max/h); w=Math.round(w*r); h=Math.round(h*r); }
      const c = document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg',0.72));
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); res(null); };
    img.src=url;
  });
}
function PhotoField({value, onChange}){
  const arr = Array.isArray(value)?value:[];
  const [editIdx, setEditIdx] = useState(-1);
  const onPick = async e=>{
    const files = [...e.target.files];
    e.target.value='';
    const out=[];
    for(const f of files){ const d=await compress(f); if(d) out.push(d); }
    onChange([...arr, ...out]);
  };
  const saveEdit = dataUrl=>{
    onChange(arr.map((s,i)=>i===editIdx?dataUrl:s));
    setEditIdx(-1);
  };
  return <div className="photos">
    {arr.map((src,i)=>(
      <div className="photo" key={i}>
        <img src={src} alt="" onClick={()=>setEditIdx(i)}/>
        <button type="button" className="mark" onClick={()=>setEditIdx(i)}><Icon name="pencil" size={13}/> Measure</button>
        <button type="button" className="del" onClick={()=>onChange(arr.filter((_,x)=>x!==i))}><Icon name="x" size={14}/></button>
      </div>
    ))}
    <label className="addphoto">
      <Icon name="camera" size={22}/>
      <span>Add photo</span>
      <input type="file" accept="image/*" multiple onChange={onPick}/>
    </label>
    {editIdx>-1 && <PhotoAnnotator src={arr[editIdx]} onCancel={()=>setEditIdx(-1)} onSave={saveEdit}/>}
  </div>;
}

/* ---------- photo annotator (draw measurements on a photo) ---------- */
const PEN_COLORS = [
  {name:'Overall', c:'#FF2D2D'},
  {name:'Panel', c:'#1E9BFF'},
  {name:'Detail', c:'#13C065'},
  {name:'Dark', c:'#111111'},
];
function PhotoAnnotator({src, onCancel, onSave}){
  const wrapRef = useRef(null);
  const baseRef = useRef(null);   // image canvas
  const drawRef = useRef(null);   // strokes canvas
  const [color, setColor] = useState(PEN_COLORS[0].c);
  const [width, setWidth] = useState(5);
  const strokes = useRef([]);     // [{color,width,pts:[{x,y}]}]
  const cur = useRef(null);
  const drawingRef = useRef(false);
  const dims = useRef({w:0,h:0,natW:0,natH:0});
  const [, force] = useState(0);

  // layout image to fit available area, size both canvases
  useEffect(()=>{
    const img = new Image();
    img.onload = ()=>{
      const wrap = wrapRef.current;
      const availW = wrap.clientWidth;
      const availH = wrap.clientHeight;
      const r = Math.min(availW/img.naturalWidth, availH/img.naturalHeight);
      const w = Math.round(img.naturalWidth*r), h = Math.round(img.naturalHeight*r);
      dims.current = {w, h, natW:img.naturalWidth, natH:img.naturalHeight};
      const dpr = window.devicePixelRatio||1;
      for(const canvas of [baseRef.current, drawRef.current]){
        canvas.style.width=w+'px'; canvas.style.height=h+'px';
        canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
        canvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0);
      }
      baseRef.current.getContext('2d').drawImage(img,0,0,w,h);
      redraw();
      force(n=>n+1);
    };
    img.src = src;
  },[src]);

  const redraw = ()=>{
    const ctx = drawRef.current.getContext('2d');
    const {w,h} = dims.current;
    ctx.clearRect(0,0,w,h);
    ctx.lineCap='round'; ctx.lineJoin='round';
    const all = cur.current ? [...strokes.current, cur.current] : strokes.current;
    for(const s of all){
      ctx.strokeStyle=s.color; ctx.lineWidth=s.width;
      ctx.beginPath();
      s.pts.forEach((p,i)=> i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
      if(s.pts.length===1){ ctx.lineTo(s.pts[0].x+0.1,s.pts[0].y+0.1); }
      ctx.stroke();
    }
  };

  const pos = e=>{
    const r = drawRef.current.getBoundingClientRect();
    const t = e.touches? e.touches[0]:e;
    return {x:t.clientX-r.left, y:t.clientY-r.top};
  };
  const start = e=>{ e.preventDefault(); drawingRef.current=true; cur.current={color,width,pts:[pos(e)]}; redraw(); };
  const move = e=>{ if(!drawingRef.current) return; e.preventDefault(); cur.current.pts.push(pos(e)); redraw(); };
  const end = e=>{ if(!drawingRef.current) return; e.preventDefault(); drawingRef.current=false; if(cur.current&&cur.current.pts.length){ strokes.current.push(cur.current);} cur.current=null; redraw(); force(n=>n+1); };

  const undo = ()=>{ strokes.current.pop(); redraw(); force(n=>n+1); };
  const clearAll = ()=>{ strokes.current=[]; redraw(); force(n=>n+1); };

  const save = ()=>{
    // composite at natural resolution
    const {w,h,natW,natH} = dims.current;
    const scale = natW/w;
    const out = document.createElement('canvas');
    out.width=natW; out.height=natH;
    const ctx = out.getContext('2d');
    const img = new Image();
    img.onload=()=>{
      ctx.drawImage(img,0,0,natW,natH);
      ctx.lineCap='round'; ctx.lineJoin='round';
      for(const s of strokes.current){
        ctx.strokeStyle=s.color; ctx.lineWidth=s.width*scale;
        ctx.beginPath();
        s.pts.forEach((p,i)=> i?ctx.lineTo(p.x*scale,p.y*scale):ctx.moveTo(p.x*scale,p.y*scale));
        if(s.pts.length===1){ ctx.lineTo(s.pts[0].x*scale+0.1,s.pts[0].y*scale+0.1); }
        ctx.stroke();
      }
      onSave(out.toDataURL('image/jpeg',0.8));
    };
    img.src=src;
  };

  const hasStrokes = strokes.current.length>0;
  return <div className="annot">
    <div className="annot-bar top">
      <button className="annot-btn" onClick={onCancel}><Icon name="x" size={18}/> Cancel</button>
      <div className="annot-title">Draw measurements</div>
      <button className="annot-btn save" onClick={save}><Icon name="check" size={18}/> Done</button>
    </div>
    <div className="annot-stage" ref={wrapRef}>
      <div className="annot-canvaswrap" style={{width:dims.current.w||'auto', height:dims.current.h||'auto'}}>
        <canvas ref={baseRef} className="annot-base"/>
        <canvas ref={drawRef} className="annot-draw"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}/>
      </div>
    </div>
    <div className="annot-bar bottom">
      <div className="pens">
        {PEN_COLORS.map(p=>(
          <button key={p.c} className={"pen"+(color===p.c?' on':'')} onClick={()=>setColor(p.c)} title={p.name}>
            <span className="dot" style={{background:p.c}}></span>
            <span className="pl">{p.name}</span>
          </button>
        ))}
      </div>
      <div className="pentools">
        <div className="widths">
          {[3,5,8].map(w=>(
            <button key={w} className={"wbtn"+(width===w?' on':'')} onClick={()=>setWidth(w)}>
              <span style={{width:w+2,height:w+2,borderRadius:'50%',background:'currentColor',display:'block'}}></span>
            </button>
          ))}
        </div>
        <button className="annot-btn ghost" onClick={undo} disabled={!hasStrokes}><Icon name="undo" size={16}/> Undo</button>
        <button className="annot-btn ghost" onClick={clearAll} disabled={!hasStrokes}>Clear</button>
      </div>
    </div>
  </div>;
}

/* ---------- signature pad ---------- */
function SignaturePad({value, onChange}){
  const ref = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const has = useRef(!!value);

  useEffect(()=>{
    const canvas = ref.current;
    const fit = ()=>{
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio||1;
      canvas.width = r.width*dpr; canvas.height = 160*dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr,dpr); ctx.lineWidth=2.4; ctx.lineCap='round'; ctx.strokeStyle='#16243B';
      if(value){ const img=new Image(); img.onload=()=>ctx.drawImage(img,0,0,r.width,160); img.src=value; }
    };
    fit();
  },[]);

  const pos = e=>{
    const r = ref.current.getBoundingClientRect();
    const t = e.touches? e.touches[0]:e;
    return {x:t.clientX-r.left, y:t.clientY-r.top};
  };
  const start = e=>{ e.preventDefault(); drawing.current=true; last.current=pos(e); };
  const move = e=>{
    if(!drawing.current) return; e.preventDefault();
    const ctx = ref.current.getContext('2d'); const p=pos(e);
    ctx.beginPath(); ctx.moveTo(last.current.x,last.current.y); ctx.lineTo(p.x,p.y); ctx.stroke();
    last.current=p; has.current=true;
  };
  const end = ()=>{ if(!drawing.current) return; drawing.current=false; if(has.current) onChange(ref.current.toDataURL('image/png')); };
  const clear = ()=>{ const c=ref.current; c.getContext('2d').clearRect(0,0,c.width,c.height); has.current=false; onChange(''); };

  return <div>
    <div className="sigpad">
      <canvas ref={ref}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}/>
      {!value && !has.current && <div className="ph">Sign here</div>}
      <button type="button" className="clr" onClick={clear}>Clear</button>
    </div>
    <div className="sigline"><span>✕</span><span>Customer signature</span></div>
  </div>;
}

/* ---------- panel repeater ---------- */
function PanelRepeater({field, value, onChange}){
  const cols = (field && field.cols) || [{key:'label',label:'Panel'},{key:'w',label:'Width'},{key:'h',label:'Height'}];
  const itemWord = (field && field.itemWord) || (cols[0].label) || 'Row';
  const rows = Array.isArray(value)?value:[];
  const set = (i,k,v)=>onChange(rows.map((r,x)=>x===i?{...r,[k]:v}:r));
  const add = ()=>onChange([...rows, {}]);
  const rm = i=>onChange(rows.filter((_,x)=>x!==i));
  const numCols = cols.slice(1); // first col is the text label
  return <div className="rep">
    {rows.map((r,i)=>(
      <div className="rep-row" key={i}>
        <div className="rep-top">
          <input className="input" placeholder={cols[0].label+' '+(i+1)} value={r[cols[0].key]||''}
            onChange={e=>set(i,cols[0].key,e.target.value)}/>
          <button type="button" className="rmp" onClick={()=>rm(i)}><Icon name="x" size={15}/></button>
        </div>
        <div className="rep-cells">
          {numCols.map(c=>(
            <label className="rep-cell" key={c.key}>
              <span className="rcl">{c.label}{c.key!=='qty'?' (in)':''}</span>
              <input className="input" type="number" inputMode="decimal" step="any" placeholder="0"
                value={r[c.key]||''} onChange={e=>set(i,c.key,e.target.value)}/>
            </label>
          ))}
        </div>
      </div>
    ))}
    <button type="button" className="additem" onClick={add} style={{minHeight:46}}>
      <Icon name="plus" size={16}/> Add {String(cols[0].label).toLowerCase()}
    </button>
  </div>;
}

/* ---------- image select (visual picker) ---------- */
function ImgSelect({field, value, onChange}){
  return <div className="imgsel">
    {field.options.map(o=>{
      const on = value===o.value;
      return <button type="button" key={o.value} className={"imgopt"+(on?' on':'')} onClick={()=>onChange(on?'':o.value)}>
        <span className="imgopt-art" dangerouslySetInnerHTML={{__html:o.svg}}/>
        <span className="imgopt-lbl">{o.label}</span>
        {on && <span className="imgopt-tick"><Icon name="check" size={13}/></span>}
      </button>;
    })}
  </div>;
}

/* ---------- inline reference image (tap to enlarge) ---------- */
function refSrc(src){
  if(!src) return src;
  const id = src.split('/').pop().replace(/\.[^.]+$/,'');
  if(typeof window!=='undefined' && window.__resources && window.__resources[id]) return window.__resources[id];
  return src;
}
function ReferenceImg({field}){
  const [open, setOpen] = useState(false);
  const src = refSrc(field.src);
  return <>
    <button type="button" className="refimg" onClick={()=>setOpen(true)}>
      <img src={src} alt={field.label}/>
      <span className="refimg-cap"><Icon name="info" size={14}/> {field.label} · tap to enlarge</span>
    </button>
    {open && <div className="reflightbox" onClick={()=>setOpen(false)}>
      <button className="annot-btn" style={{position:'absolute',top:'calc(12px + env(safe-area-inset-top))',right:12,zIndex:2}}><Icon name="x" size={18}/> Close</button>
      <img src={src} alt={field.label}/>
    </div>}
  </>;
}

/* ---------- note ---------- */
function NoteBox({noteType, text}){
  return <div className={"note"+(noteType==='info'?' info':'')}>
    <Icon name={noteType==='info'?'info':'warn'} size={16}/>
    <span>{text}</span>
  </div>;
}

/* ---------- generic field switch ---------- */
function Field({field, value, onChange, data}){
  if(field.type==='subhead') return <div className="field col-1" style={{marginTop:6}}>
    <div style={{fontSize:13,fontWeight:800,letterSpacing:'.03em',textTransform:'uppercase',color:'var(--muted-2)'}}>{field.label}</div>
  </div>;
  if(field.type==='note') return <div className="field col-1"><NoteBox noteType={field.noteType} text={field.text}/></div>;
  if(field.type==='reference') return <div className="field col-1"><ReferenceImg field={field}/></div>;

  const colCls = field.col==='1'?'col-1':field.col==='third'?'col-third':'col-half';
  let control;
  switch(field.type){
    case 'number': control=<NumberField field={field} value={value} onChange={onChange}/>; break;
    case 'select': control=<Select field={field} value={value} onChange={onChange}/>; break;
    case 'radio': control=<RadioGroup field={field} value={value} onChange={onChange}/>; break;
    case 'checks': control=<ChecksGroup field={field} value={value} onChange={onChange}/>; break;
    case 'textarea': control=<TextArea field={field} value={value} onChange={onChange}/>; break;
    case 'date': control=<DateField value={value} onChange={onChange}/>; break;
    case 'photos': control=<PhotoField value={value} onChange={onChange}/>; break;
    case 'panels': control=<PanelRepeater field={field} value={value} onChange={onChange}/>; break;
    case 'imgselect': control=<ImgSelect field={field} value={value} onChange={onChange}/>; break;
    case 'signature': control=<SignaturePad value={value} onChange={onChange}/>; break;
    default: control=<TextField field={field} value={value} onChange={onChange}/>;
  }
  const isReq = field.req || (field.reqIf && visible({show:field.reqIf}, data||{}));
  return <div className={"field "+colCls}>
    <label className="flabel">{field.label}{isReq && <span className="req">*</span>}</label>
    {field.hint && <div className="fhint">{field.hint}</div>}
    {control}
  </div>;
}

/* ---------- render a list of fields with conditional logic ---------- */
function FieldGrid({fields, data, onField}){
  return <div className="fieldgrid">
    {fields.map((f,i)=>{
      if(f.show && !visible(f,data)) return null;
      if(!f.key && f.type!=='subhead' && f.type!=='note' && f.type!=='reference') return null;
      return <Field key={f.key||('x'+i)} field={f} value={f.key?data[f.key]:undefined}
        onChange={v=>f.key && onField(f.key,v)} data={data} />;
    })}
  </div>;
}

Object.assign(window, { Icon, Field, FieldGrid, visible, SignaturePad, PhotoField, PanelRepeater, ImgSelect, ReferenceImg, NoteBox });
