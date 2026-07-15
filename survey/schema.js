/* ============ Site Survey schema ============
   Field types: text, tel, email, number(inches), select, radio, checks, textarea,
   date, photos, panels(repeater), signature, imgselect, reference, note, subhead
   Layout: col-1 (full), col-half, col-third
   show: {field, in:[...]} | {field, has:'x'}  conditional visibility within an item/group
   reqIf: {field, in:[...]}  marks field required (shows *) only when condition is met
   panels cols: [{key,label,ph}]   (numeric unless key==='label')
*/
(function(){
  const YN = ['Yes','No'];
  const YNNA = ['Yes','No','N/A'];
  const wallMakeup = ['Drywall','Concrete','Brick','Other'];

  /* ---------- dock door type schematics (visual picker) ----------
     Real doors are ~5-panel sectional; the meaningful variation is the vision window. */
  const door = (inner)=>`<svg viewBox="0 0 80 92" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="6" width="64" height="80" rx="2" fill="#F2F5F9" stroke="#33425C" stroke-width="2.4"/>${inner}</svg>`;
  // 5-panel sectional divisions
  const PANELS5 = [22,38,54,70];
  const panelLines = (ys)=>ys.map(y=>`<line x1="8" y1="${y}" x2="72" y2="${y}" stroke="#33425C" stroke-width="1.6"/>`).join('');
  const base = panelLines(PANELS5);
  const lite = (x,w)=>`<rect x="${x}" y="58.5" width="${w}" height="7" rx="2.5" fill="#243244" stroke="#11202E" stroke-width="1.4"/>`;
  const DOOR_TYPES = [
    {value:'Sectional — no window', label:'No window',
      svg:door(base)},
    {value:'Sectional — vision lite, left', label:'Lite · left',
      svg:door(base+lite(18,22))},
    {value:'Sectional — vision lite, center', label:'Lite · center',
      svg:door(base+lite(29,22))},
    {value:'Sectional — full-width vision panel', label:'Full glass band',
      svg:door(base+`<rect x="8" y="55.5" width="64" height="13" fill="#BFE0F7" stroke="#1B75BC" stroke-width="1.8"/><line x1="29" y1="55.5" x2="29" y2="68.5" stroke="#1B75BC" stroke-width="1.4"/><line x1="51" y1="55.5" x2="51" y2="68.5" stroke="#1B75BC" stroke-width="1.4"/>`)},
    {value:'Sectional — two vision lites', label:'Two lites',
      svg:door(base+lite(15,21)+lite(44,21))},
    {value:'Other / not sure', label:'Other',
      svg:door(`<text x="40" y="54" font-size="34" font-family="sans-serif" font-weight="800" fill="#8A93A2" text-anchor="middle">?</text>`)},
  ];

  // ---------- Flat site-info header (replaces old sections 1–3) ----------
  const INFO = {
    id:'info', title:'Site Information',
    fields:[
      {key:'site_code', label:'Site Code', type:'text', col:'half', req:true},
      {key:'survey_date', label:'Survey Date', type:'date', col:'half', req:true},
      {key:'street', label:'Street Address', type:'text', col:'1'},
      {key:'surveyor', label:'Surveyor Name / Company', type:'text', col:'1'},
      {key:'surveyor_email', label:'Surveyor Email', type:'email', col:'1', req:true, hint:'A confirmation copy of the survey is sent here, and it\u2019s how you look up your past surveys.'},
    ]
  };

  // ---------- reusable clusters ----------
  const DRAW_NOTE = 'You can draw measurements right on each photo in the app — tap a photo to mark it up.';
  const photoNotes = (hint)=>[
    {key:'photos', label:'Photos', type:'photos', col:'1', hint:(hint?hint+' ':'Capture each location & any obstacles. ')+DRAW_NOTE},
    {key:'notes', label:'Notes', type:'textarea', col:'1'},
  ];
  const winCols = [{key:'label',label:'Window'},{key:'w',label:'Width'},{key:'h',label:'Height'},{key:'qty',label:'Qty'}];

  // ---------- Products (Scope) ----------
  const PRODUCTS = [
    {
      id:'dockDoors', name:'STG Dock Doors', icon:'dock', addLabel:'Add dock door', itemName:'Dock door',
      desc:'Safe To Go door vinyl', labelField:'door_no', labelPrefix:'Door',
      fields:[
        {type:'note', noteType:'info', text:'Measure the dock door from one interior edge to the other. Do not include the metal edges — when measuring the panels, only include the panel itself, not the aluminum trim. Note any damage to the door that will impede installation.'},
        {type:'reference', key:'_ref', src:'survey/assets/dock_reference.jpg', label:'Measurement reference — overall, panel heights & window', col:'1'},
        {key:'door_no', label:'Door / Dock #', type:'text', col:'half', placeholder:'e.g. 101'},
        {key:'door_type', label:'Door type / reference', type:'imgselect', col:'1', options:DOOR_TYPES,
          hint:'Tap the door style that matches what you see on site.'},
        {key:'meas_w', label:'Door width (edge to edge)', type:'number', col:'half', req:true},
        {key:'meas_h', label:'Door height (edge to edge)', type:'number', col:'half', req:true},
        {key:'has_window', label:'Is there a window?', type:'radio', options:YN, col:'1'},
        {key:'win_w', label:'Window width', type:'number', col:'third', req:true, show:{field:'has_window', in:['Yes']}},
        {key:'win_h', label:'Window height', type:'number', col:'third', req:true, show:{field:'has_window', in:['Yes']}},
        {key:'win_from_left', label:'Window from left edge', type:'number', col:'third', show:{field:'has_window', in:['Yes']}},
        {key:'win_from_bottom', label:'Window from bottom edge', type:'number', col:'half', show:{field:'has_window', in:['Yes']}},
        {key:'panels', label:'Panel heights (top → bottom)', type:'panels', req:true, col:'1',
          cols:[{key:'label',label:'Panel'},{key:'h',label:'Height'}],
          hint:'Required. Add each panel from top to bottom with its height. Measure the panel only — exclude the aluminum trim between panels.'},
        {key:'metal_bars', label:'Does the door have horizontal metal bars?', type:'radio', options:YN, col:'1'},
        {key:'bar_measurements', label:'Bar measurements', type:'panels', col:'1',
          cols:[{key:'label',label:'Bar'},{key:'diameter',label:'Diameter'},{key:'spacing',label:'Spacing to next'}],
          hint:'One row per bar, top to bottom.', reqIf:{field:'metal_bars', in:['Yes']}},
        {key:'metal_bars_removable', label:'Are the bars removable?', type:'radio', options:YN, col:'1', show:{field:'metal_bars', in:['Yes']}},
        {key:'multi_same', label:'Are multiple doors the same style?', type:'radio', options:YN, col:'1'},
        {key:'multi_door_nos', label:'List all door numbers with this style', type:'textarea', col:'1', placeholder:'e.g. 101, 102, 103, 110…', hint:'One entry covers them all — list every door / dock # that matches.', show:{field:'multi_same', in:['Yes']}},
        {key:'damage', label:'Any damage that will impede installation?', type:'radio', options:YN, col:'1'},
        {key:'damage_desc', label:'Describe the damage', type:'textarea', col:'1', show:{field:'damage', in:['Yes']}},
        ...photoNotes('Photo each dock door straight-on plus the door # plate.'),
      ]
    },
    {
      id:'wellnessWalls', name:'STG Wellness Walls', icon:'wall', addLabel:'Add wall', itemName:'Wall',
      desc:'Wall wrap vinyl', labelField:'label', labelPrefix:'Wall',
      note:{type:'info', text:'Large wraps are paneled due to material width. Measure overall wall, then break out each panel face (front + side returns) and any door opening.'},
      fields:[
        {type:'reference', key:'_ref', src:'survey/assets/wall_reference.jpg', label:'Reference — overall wall, door opening & window in door', col:'1'},
        {key:'label', label:'Wall location / name', type:'text', col:'1', placeholder:'e.g. Wellness Center — front wall'},
        {key:'ov_w', label:'Overall wall width', type:'number', col:'half', req:true},
        {key:'ov_h', label:'Overall wall height', type:'number', col:'half', req:true},
        {type:'note', noteType:'warn', text:'If there is trim, it must be counted against the overall wall height.'},
        {key:'makeup', label:'Wall makeup', type:'radio', options:wallMakeup, col:'1'},
        {key:'makeup_other', label:'Describe wall makeup', type:'text', col:'1', show:{field:'makeup', in:['Other']}},
        {key:'painted', label:'Date wall last painted', type:'date', col:'half', hint:'Vinyl needs a 30-day cure after fresh paint.'},
        {key:'painted_over3', label:'If exact date unknown', type:'checks', options:['Painted over 3 months ago'], col:'half'},
        {key:'has_door', label:'Door opening in wall?', type:'radio', options:YN, col:'half'},
        {key:'door_w', label:'Door width', type:'number', col:'third', show:{field:'has_door', in:['Yes']}},
        {key:'door_h', label:'Door height', type:'number', col:'third', show:{field:'has_door', in:['Yes']}},
        {key:'header_h', label:'Header above door', type:'number', col:'third', show:{field:'has_door', in:['Yes']}},
        {key:'door_left', label:'Door from left', type:'number', col:'half', show:{field:'has_door', in:['Yes']}},
        {key:'kickplate_h', label:'Kickplate height', type:'number', col:'half', show:{field:'has_door', in:['Yes']}},
        {key:'kickplate_w', label:'Kickplate width', type:'number', col:'half', show:{field:'has_door', in:['Yes']}},
        {key:'door_glass', label:'Glass / window in door?', type:'radio', options:YN, col:'1', show:{field:'has_door', in:['Yes']}},
        {key:'door_glass_w', label:'Window width', type:'number', col:'third', show:{field:'door_glass', in:['Yes']}},
        {key:'door_glass_h', label:'Window height', type:'number', col:'third', show:{field:'door_glass', in:['Yes']}},
        {key:'door_glass_from_top', label:'Window from top', type:'number', col:'third', show:{field:'door_glass', in:['Yes']}},
        {key:'door_glass_from_bottom', label:'Window from bottom', type:'number', col:'third', show:{field:'door_glass', in:['Yes']}},
        {key:'door_glass_from_left', label:'Window from left', type:'number', col:'third', show:{field:'door_glass', in:['Yes']}},
        {key:'door_glass_from_right', label:'Window from right', type:'number', col:'third', show:{field:'door_glass', in:['Yes']}},
        {key:'panels', label:'Panel-by-panel measurements', type:'panels', col:'1', hint:'Add a row for each printed panel face (front, left return, right return…).'},
        ...photoNotes('Photo the full wall straight-on, plus each corner.'),
      ]
    },
    {
      id:'wellnessPods', name:'STG Wellness Pods', icon:'pod', addLabel:'Add pod face / wall', itemName:'Pod face',
      desc:'Pod wrap vinyl', labelField:'label', labelPrefix:'Face',
      note:{type:'info', text:'A pod has several faces. Add one entry per face. Measure overall W×H, the door & vision window, then every panel segment (left wall, header above door, side returns).'},
      fields:[
        {type:'reference', key:'_ref', src:'survey/assets/pod_reference.jpg', label:'Reference — pod face with door, glass in door & side panels', col:'1'},
        {key:'label', label:'Pod face / wall name', type:'text', col:'1', placeholder:'e.g. Front — Wellness Area'},
        {key:'ov_w', label:'Overall face width', type:'number', col:'half', req:true},
        {key:'ov_h', label:'Overall face height', type:'number', col:'half', req:true},
        {key:'has_door', label:'Door on this face?', type:'radio', options:YN, col:'1'},
        {key:'door_w', label:'Door width', type:'number', col:'third', show:{field:'has_door', in:['Yes']}},
        {key:'door_h', label:'Door height', type:'number', col:'third', show:{field:'has_door', in:['Yes']}},
        {key:'header_h', label:'Header above door', type:'number', col:'third', show:{field:'has_door', in:['Yes']}},
        {key:'door_glass', label:'Glass / window in door?', type:'radio', options:YN, col:'1', show:{field:'has_door', in:['Yes']}},
        {key:'door_glass_w', label:'Door glass width', type:'number', col:'third', show:{field:'door_glass', in:['Yes']}},
        {key:'door_glass_h', label:'Door glass height', type:'number', col:'third', show:{field:'door_glass', in:['Yes']}},
        {key:'door_glass_from_top', label:'Glass from door top', type:'number', col:'third', show:{field:'door_glass', in:['Yes']}},
        {key:'has_window', label:'Is there a window on this face?', type:'radio', options:YN, col:'1'},
        {key:'win_w', label:'Window width', type:'number', col:'half', show:{field:'has_window', in:['Yes']}},
        {key:'win_h', label:'Window height', type:'number', col:'half', show:{field:'has_window', in:['Yes']}},
        {key:'has_metal_frame', label:'Metal bar / frame on this face?', type:'radio', options:YN, col:'1'},
        {key:'frame_w', label:'Frame width', type:'number', col:'third', show:{field:'has_metal_frame', in:['Yes']}},
        {key:'frame_h', label:'Frame height', type:'number', col:'third', show:{field:'has_metal_frame', in:['Yes']}},
        {key:'frame_thickness', label:'Frame / bar thickness', type:'number', col:'third', show:{field:'has_metal_frame', in:['Yes']}},
        {key:'panels', label:'Panel-by-panel measurements', type:'panels', col:'1', hint:'One row per panel segment. Label each (e.g. left wall, door header, right return).'},
        ...photoNotes('Photo each face straight-on with a tape for scale.'),
      ]
    },
    {
      id:'vinyl', name:'Vinyl — Wall or Window', icon:'vinyl', addLabel:'Add vinyl area', itemName:'Vinyl area',
      desc:'Interior wall / window', labelField:'label', labelPrefix:'Area',
      fields:[
        {key:'vtype', label:'Surface', type:'radio', options:['Wall','Window'], col:'1'},
        {key:'label', label:'Location / name', type:'text', col:'1'},
        {type:'reference', key:'_ref', src:'survey/assets/wall_vinyl_reference.jpg', label:'Reference — capture overall wall, then each window/opening (W×H & sq ft)', col:'1', show:{field:'vtype', in:['Wall']}},
        // ---- WALL ----
        {key:'makeup', label:'Wall makeup', type:'radio', options:wallMakeup, col:'1', show:{field:'vtype', in:['Wall']}},
        {key:'makeup_other', label:'Describe wall makeup', type:'text', col:'1', show:{field:'makeup', in:['Other']}},
        {key:'painted', label:'Date wall last painted', type:'date', col:'half', hint:'30-day cure after fresh paint.', show:{field:'vtype', in:['Wall']}},
        {key:'painted_over3', label:'If exact date unknown', type:'checks', options:['Painted over 3 months ago'], col:'half', show:{field:'vtype', in:['Wall']}},
        {key:'w', label:'Wall width', type:'number', col:'half', show:{field:'vtype', in:['Wall']}},
        {key:'h', label:'Wall height', type:'number', col:'half', show:{field:'vtype', in:['Wall']}},
        {type:'note', noteType:'warn', text:'If there is trim, it must be counted against the overall wall height.', key:'_trimnote', show:{field:'vtype', in:['Wall']}},
        {key:'wall_has_door', label:'Doors or openings in this wall?', type:'radio', options:YN, col:'1', show:{field:'vtype', in:['Wall']}},
        {key:'openings', label:'Door / opening dimensions', type:'panels', col:'1',
          cols:[{key:'label',label:'Opening'},{key:'w',label:'Width'},{key:'h',label:'Height'},{key:'from_left',label:'From L'},{key:'dist_next',label:'Dist. to next opening'}],
          hint:'Add each door, window or opening — label it, note where it sits, and if the wall has multiple openings capture the distance to the next one.', show:{field:'wall_has_door', in:['Yes']}},
        {key:'wall_items', label:'Non-removable wall-mounted items', type:'panels', col:'1',
          cols:[{key:'label',label:'Item'},{key:'w',label:'Width'},{key:'h',label:'Height'},{key:'from_left',label:'From L'},{key:'from_floor',label:'From floor'}],
          hint:'Anything fixed to the wall the vinyl must work around (outlet, panel, conduit, mounted sign). Note size & position.', show:{field:'vtype', in:['Wall']}},
        // ---- WINDOW ----
        {type:'reference', key:'_ref_win', src:'survey/assets/window_interior_reference.jpg', label:'Reference — interior window / door-glass perf (capture each opening W×H)', col:'1', show:{field:'vtype', in:['Window']}},
        {key:'windows', label:'Window measurements', type:'panels', col:'1', cols:winCols,
          hint:'Add each distinct window size in this area. Note mullion width if panes are split.', show:{field:'vtype', in:['Window']}},
        {key:'mullions', label:'Mullion width (if split panes)', type:'number', col:'half', show:{field:'vtype', in:['Window']}},
        ...photoNotes(),
      ]
    },
    {
      id:'wallSigns', name:'Wall Signs', icon:'sign', addLabel:'Add wall sign', itemName:'Wall sign',
      desc:'Rigid interior sign', labelField:'desc', labelPrefix:'Sign',
      fields:[
        {key:'desc', label:'Sign description', type:'text', col:'1'},
        {key:'makeup', label:'Wall makeup', type:'radio', options:wallMakeup, col:'1'},
        {key:'w', label:'Width', type:'number', col:'half'},
        {key:'h', label:'Height', type:'number', col:'half'},
        {key:'install_h', label:'Install height (highest pt)', type:'number', col:'half'},
        {key:'qty', label:'Quantity', type:'number', col:'half', unit:''},
        {key:'access', label:'Access method', type:'text', col:'1', placeholder:'Ladder, lift, etc.'},
        ...photoNotes(),
      ]
    },
  ];

  // ---------- Exterior sign sub-types ----------
  const EXTERIOR = [
    {
      id:'extWindow', name:'Exterior Window Vinyl', icon:'vinyl', addLabel:'Add window area', itemName:'Window area',
      desc:'Storefront glass', labelField:'label', labelPrefix:'Area',
      fields:[
        {type:'reference', key:'_ref', src:'survey/assets/ext_window_reference.jpg', label:'Reference — storefront set: each pane W×H, mullion width, door opening', col:'1'},
        {key:'label', label:'Location / name', type:'text', col:'1', placeholder:'e.g. East lower set 5'},
        {key:'windows', label:'Window / pane measurements', type:'panels', col:'1', cols:winCols,
          hint:'Add each distinct pane size in this set — add as many as needed.'},
        {key:'mullions', label:'Mullion width', type:'number', col:'half', hint:'Width of the bars between panes (e.g. 2″).'},
        {key:'has_door', label:'Door in this set?', type:'radio', options:YN, col:'half'},
        {key:'door_w', label:'Door opening width', type:'number', col:'third', show:{field:'has_door', in:['Yes']}},
        {key:'door_h', label:'Door opening height', type:'number', col:'third', show:{field:'has_door', in:['Yes']}},
        ...photoNotes(),
      ]
    },
    {
      id:'channel', name:'Channel Letter Sign', icon:'channel', addLabel:'Add channel letter sign', itemName:'Channel letters',
      desc:'Dimensional letters', labelField:'desc', labelPrefix:'Set',
      fields:[
        {key:'job_type', label:'Is this a sign face fix or a new / replacement sign?', type:'radio', options:['Face fix','New / replacement'], col:'1'},

        /* ---------- FACE FIX ---------- */
        {type:'reference', key:'_ref_fix', src:'survey/assets/channel_face_reference.png', label:'Reference — face dimensions, returns, height & access notes', col:'1', show:{field:'job_type', in:['Face fix']}},
        {key:'fix_desc', label:'Description of faces to fix', type:'text', col:'1', show:{field:'job_type', in:['Face fix']}},
        {key:'fix_faces', label:'Face measurements', type:'panels', col:'1',
          cols:[{key:'label',label:'Letter / face'},{key:'w',label:'Width'},{key:'h',label:'Height'}],
          hint:'One row per letter or face needing a new face.', show:{field:'job_type', in:['Face fix']}},
        {key:'fix_return_depth', label:'Return depth', type:'number', col:'third', show:{field:'job_type', in:['Face fix']}},
        {key:'fix_mount_h', label:'Mount height from grade', type:'number', col:'third', show:{field:'job_type', in:['Face fix']}},
        {key:'fix_access', label:'Access method', type:'text', col:'third', placeholder:'Ladder, lift, etc.', show:{field:'job_type', in:['Face fix']}},
        {key:'fix_illum', label:'Illuminated?', type:'radio', options:YN, col:'half', show:{field:'job_type', in:['Face fix']}},
        {key:'fix_face_material', label:'Face material', type:'text', col:'half', placeholder:'e.g. 3/16″ acrylic, polycarbonate', show:{field:'fix_illum', in:['Yes']}, req:false},
        {key:'fix_lighting_specs', label:'Lighting specs', type:'textarea', col:'1', placeholder:'LED module type/count, voltage, color temp, etc.', show:{field:'fix_illum', in:['Yes']}},

        /* ---------- NEW / REPLACEMENT ---------- */
        {type:'reference', key:'_ref', src:'survey/assets/channel_reference.jpg', label:'Reference — frontage, each wall segment (length × height) & access notes', col:'1', show:{field:'job_type', in:['New / replacement']}},
        {key:'desc', label:'Copy / description', type:'text', col:'1', show:{field:'job_type', in:['New / replacement']}},
        {key:'existing_sign', label:'Existing sign?', type:'radio', options:YN, col:'half', show:{field:'job_type', in:['New / replacement']}},
        {key:'illum', label:'Illuminated?', type:'radio', options:YN, col:'half', show:{field:'job_type', in:['New / replacement']}},
        {key:'power_existing', label:'Existing power to sign location?', type:'radio', options:YN, col:'1', show:{field:'illum', in:['Yes']}},
        {key:'frontage', label:'Total building frontage', type:'number', col:'half', unit:'ft', hint:'Total length of the building face the signage spans.', show:{field:'job_type', in:['New / replacement']}},
        // existing sign → capture its dimensions
        {key:'ov_w', label:'Sign overall width', type:'number', col:'half', show:{field:'existing_sign', in:['Yes']}},
        {key:'ov_h', label:'Sign overall height', type:'number', col:'half', show:{field:'existing_sign', in:['Yes']}},
        {key:'letter_h', label:'Letter height', type:'number', col:'half', show:{field:'existing_sign', in:['Yes']}},
        // no existing sign → capture overall building area instead
        {key:'building_w', label:'Overall sign install area width', type:'number', col:'half', show:{field:'existing_sign', in:['No']}},
        {key:'building_h', label:'Overall sign install area height', type:'number', col:'half', show:{field:'existing_sign', in:['No']}},
        {key:'mount_h', label:'Mount height from grade', type:'number', col:'half', show:{field:'job_type', in:['New / replacement']}},
        {key:'makeup', label:'Wall / fascia makeup', type:'radio', options:['EIFS','Brick','Metal','Concrete','Other'], col:'1', show:{field:'job_type', in:['New / replacement']}},
        {key:'wall_measurements', label:'Additional wall measurements', type:'panels', col:'1',
          cols:[{key:'label',label:'Wall / segment'},{key:'w',label:'Length'},{key:'h',label:'Height'}],
          hint:'Add each wall segment or elevation — label it (e.g. front — 26′, return — 27′) with its length & height. Lengths often in feet; note units if so.', show:{field:'job_type', in:['New / replacement']}},
        {key:'access', label:'Access notes', type:'textarea', col:'1', hint:'How the wall is reached — lift, roof, behind-wall access, parking/setback for equipment, power source.', show:{field:'job_type', in:['New / replacement']}},
        ...photoNotes('Photo fascia, power source, full elevation & the access path.'),
      ]
    },
    {
      id:'monument', name:'Monument Sign', icon:'monument', addLabel:'Add monument sign', itemName:'Monument',
      desc:'Ground / freestanding', labelField:'desc', labelPrefix:'Monument',
      fields:[
        {key:'desc', label:'Description', type:'text', col:'1'},
        {key:'job_type', label:'Is this a face fix / replacement, or a new monument?', type:'radio', options:['Face fix / replacement','New monument'], col:'1'},

        /* ---------- FACE FIX / FACE REPLACEMENT ---------- */
        {type:'reference', key:'_ref_fix', src:'survey/assets/monument_face_reference.png', label:'Reference — cabinet opening, face dimensions & retainer/frame details', col:'1', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_faces', label:'Face measurements', type:'panels', col:'1',
          cols:[{key:'label',label:'Face'},{key:'w',label:'Width'},{key:'h',label:'Height'}],
          hint:'One row per face needing a new panel — measure the visible face opening.', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_face_material', label:'Existing face material', type:'text', col:'half', placeholder:'e.g. acrylic, polycarbonate, aluminum', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_retainer', label:'Retainer / frame system', type:'text', col:'half', placeholder:'e.g. snap frame, routed cabinet, clips', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_illum', label:'Illuminated?', type:'radio', options:YN, col:'half', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_lighting_specs', label:'Lighting specs', type:'textarea', col:'1', placeholder:'LED module type/count, voltage, color temp, etc.', show:{field:'fix_illum', in:['Yes']}},
        {key:'fix_condition', label:'Cabinet / structure condition', type:'textarea', col:'1', hint:'Note any damage, fading, corrosion or repair needed to the cabinet, frame or base beyond the face itself.', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_access', label:'Access method', type:'text', col:'1', placeholder:'Ladder, lift, etc.', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_dimensional', label:'Dimensional elements (raised letters/logo)?', type:'radio', options:YN, col:'1', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_dimensional_measurements', label:'Dimensional element measurements', type:'panels', col:'1',
          cols:[{key:'label',label:'Element'},{key:'w',label:'Width'},{key:'h',label:'Height'},{key:'depth',label:'Depth / std-off'}],
          hint:'One row per raised letter, logo or graphic.', show:[{field:'job_type', in:['Face fix / replacement']},{field:'fix_dimensional', in:['Yes']}]},

        /* ---------- NEW MONUMENT ---------- */
        {type:'reference', key:'_ref_new', src:'survey/assets/monument_new_reference.png', label:'Reference — location, setback & obstructions', col:'1', show:{field:'job_type', in:['New monument']}},
        {key:'illum', label:'Illuminated?', type:'radio', options:YN, col:'1', show:{field:'job_type', in:['New monument']}},
        {key:'setback', label:'Farthest setback distance', type:'number', col:'half', unit:'ft', hint:'Farthest the sign can sit back from the road / curb.', show:{field:'job_type', in:['New monument']}},
        {key:'obstructions', label:'Obstructions near location', type:'textarea', col:'1', hint:'Trees, utilities, hydrants, sightlines or anything else affecting placement.', show:{field:'job_type', in:['New monument']}},
        {key:'base', label:'Base / footing notes', type:'text', col:'1', show:{field:'job_type', in:['New monument']}},
        {type:'subhead', label:'Installation requirements', show:{field:'job_type', in:['New monument']}},
        {key:'equipment_required', label:'Equipment required', type:'text', col:'1', placeholder:'e.g. auger, crane, concrete mixer', show:{field:'job_type', in:['New monument']}},
        {key:'footing_requirements', label:'Footing requirements', type:'textarea', col:'1', hint:'Soil conditions, known utilities/lines, footing size or depth needed.', show:{field:'job_type', in:['New monument']}},
        {type:'subhead', label:'Photos', show:{field:'job_type', in:['New monument']}},
        {key:'photos_location', label:'Required photos', type:'photos', col:'1', hint:'Capture the exact placement spot, full surrounding area (both directions), the ground/surface, and any obstructions. '+DRAW_NOTE, show:{field:'job_type', in:['New monument']}},
        {key:'notes', label:'Notes', type:'textarea', col:'1'},
      ]
    },
    {
      id:'directional', name:'Directional Post & Panel', icon:'post', addLabel:'Add post & panel sign', itemName:'Post & panel',
      desc:'Wayfinding', labelField:'desc', labelPrefix:'Sign',
      fields:[
        {key:'desc', label:'Description', type:'text', col:'1'},
        {key:'job_type', label:'Is this a face fix / replacement, or a new sign?', type:'radio', options:['Face fix / replacement','New sign'], col:'1'},

        /* ---------- FACE FIX / REPLACEMENT ---------- */
        {type:'reference', key:'_ref_fix', src:'survey/assets/postpanel_face_reference.png', label:'Reference — panel opening, dimensions & retainer/frame details', col:'1', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_faces', label:'Face measurements', type:'panels', col:'1',
          cols:[{key:'label',label:'Face'},{key:'w',label:'Width'},{key:'h',label:'Height'}],
          hint:'One row per face needing a new panel — measure the visible face opening.', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_face_material', label:'Existing face material', type:'text', col:'half', placeholder:'e.g. acrylic, aluminum composite', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_retainer', label:'Retainer / mounting system', type:'text', col:'half', placeholder:'e.g. snap frame, routed panel, clips', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_condition', label:'Post / structure condition', type:'textarea', col:'1', hint:'Note any damage or repair needed to the post, base or frame beyond the face itself.', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_access', label:'Access method', type:'text', col:'1', placeholder:'Ladder, lift, etc.', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_sided', label:'Faces', type:'radio', options:['Single-sided','Double-sided'], col:'half', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_qty', label:'Quantity', type:'number', col:'half', unit:'', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_dimensional', label:'Dimensional elements (raised letters/logo)?', type:'radio', options:YN, col:'1', show:{field:'job_type', in:['Face fix / replacement']}},
        {key:'fix_dimensional_measurements', label:'Dimensional element measurements', type:'panels', col:'1',
          cols:[{key:'label',label:'Element'},{key:'w',label:'Width'},{key:'h',label:'Height'},{key:'depth',label:'Depth / std-off'}],
          hint:'One row per raised letter, logo or graphic.', show:[{field:'job_type', in:['Face fix / replacement']},{field:'fix_dimensional', in:['Yes']}]},

        /* ---------- NEW SIGN ---------- */
        {type:'reference', key:'_ref_new', src:'survey/assets/postpanel_new_reference.png', label:'Reference — location, setback & obstructions', col:'1', show:{field:'job_type', in:['New sign']}},
        {key:'qty', label:'Quantity', type:'number', col:'half', unit:'', show:{field:'job_type', in:['New sign']}},
        {key:'sided', label:'Faces', type:'radio', options:['Single-sided','Double-sided'], col:'half', show:{field:'job_type', in:['New sign']}},
        {key:'setback', label:'Farthest setback distance', type:'number', col:'half', unit:'ft', hint:'Farthest the sign can sit back from the road / curb.', show:{field:'job_type', in:['New sign']}},
        {key:'obstructions', label:'Obstructions near location', type:'textarea', col:'1', hint:'Trees, utilities, hydrants, sightlines or anything else affecting placement.', show:{field:'job_type', in:['New sign']}},
        {key:'location_concerns', label:'Location concerns', type:'textarea', col:'1',
          hint:'Important for brand-new signs — note landscaping, slope, permitting or anything else affecting placement.', show:{field:'job_type', in:['New sign']}},
        {key:'existing_sign', label:'Existing sign in this location?', type:'radio', options:YN, col:'1', show:{field:'job_type', in:['New sign']}},
        {key:'existing_removal', label:'Does the existing sign need to be removed?', type:'radio', options:YN, col:'half', show:[{field:'job_type', in:['New sign']},{field:'existing_sign', in:['Yes']}]},
        {key:'existing_panel_w', label:'Existing panel width', type:'number', col:'third', show:[{field:'job_type', in:['New sign']},{field:'existing_sign', in:['Yes']}]},
        {key:'existing_panel_h', label:'Existing panel height', type:'number', col:'third', show:[{field:'job_type', in:['New sign']},{field:'existing_sign', in:['Yes']}]},
        {key:'existing_overall_h', label:'Existing overall height (incl. post)', type:'number', col:'third', show:[{field:'job_type', in:['New sign']},{field:'existing_sign', in:['Yes']}]},
        {key:'existing_photos', label:'Photos of existing sign', type:'photos', col:'1', hint:DRAW_NOTE, show:[{field:'job_type', in:['New sign']},{field:'existing_sign', in:['Yes']}]},
        {type:'subhead', label:'Installation requirements', show:{field:'job_type', in:['New sign']}},
        {key:'equipment_required', label:'Equipment required', type:'text', col:'1', placeholder:'e.g. auger, post driver, concrete mixer', show:{field:'job_type', in:['New sign']}},
        {key:'footing_requirements', label:'Footing requirements', type:'textarea', col:'1', hint:'Soil conditions, known utilities/lines, footing size or depth needed.', show:{field:'job_type', in:['New sign']}},
        {type:'subhead', label:'Photos', show:{field:'job_type', in:['New sign']}},
        {key:'photos_location', label:'Required photos', type:'photos', col:'1', hint:'Capture the exact placement spot, full surrounding area (both directions), the ground/surface, and any obstructions. '+DRAW_NOTE, show:{field:'job_type', in:['New sign']}},
        {key:'notes', label:'Notes', type:'textarea', col:'1'},
      ]
    },
    {
      id:'extOther', name:'Other', icon:'other', addLabel:'Add item', itemName:'Item',
      desc:'Anything else', labelField:'desc', labelPrefix:'Item',
      fields:[
        {key:'desc', label:'Describe the sign / scope', type:'textarea', col:'1'},
        {key:'w', label:'Width', type:'number', col:'half'},
        {key:'h', label:'Height', type:'number', col:'half'},
        ...photoNotes(),
      ]
    },
  ];

  // ---------- Photo documentation & sign-off ----------
  const SIGNOFF = {
    id:'signoff', title:'Photos & Sign-Off', sub:'Documentation & signature',
    fields:[
      {key:'photo_checklist', label:'Photo documentation captured', type:'checks', col:'1',
        options:['Each sign location with surroundings','Any obstacles or clearance concerns','Photos of all dock door types']},
      {key:'site_photos', label:'General site photos', type:'photos', col:'1', hint:'You can draw measurements right on each photo in the app — tap a photo to mark it up.'},
      {key:'general_notes', label:'General site notes', type:'textarea', col:'1'},
      {type:'subhead', label:'Customer confirmation'},
      {type:'note', noteType:'info', text:'By signing, the customer confirms the information is accurate and authorizes FASTSIGNS to conduct a site survey and/or installation.'},
      {key:'cust_name', label:'Customer name', type:'text', col:'half'},
      {key:'sign_date', label:'Date', type:'date', col:'half'},
      {key:'signature', label:'Customer signature', type:'signature', col:'1'},
    ]
  };

  window.SURVEY = { INFO, PRODUCTS, EXTERIOR, SIGNOFF };
})();
