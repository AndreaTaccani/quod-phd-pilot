'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const workspace = $('#workspace');
const modal = $('#modal');
const pilotLaunch=document.querySelector('meta[name="fieldnote-pilot-start"]')?.content||'';
const pilotInvite=new URLSearchParams(location.search).get('pilot')==='1';
const staticPilotHost=Boolean(document.querySelector('meta[name="quod-static-pilot"]'));
const STORE = staticPilotHost?'quod.phd-pilot.v1':'fieldnote.phd.v1'+(pilotLaunch?'.pilot.'+pilotLaunch:'');
const roles = ['Research','Teaching','Service','Personal'];
const taskStages = ['Next','Waiting','Done'];
const milestoneStages = ['Planned','In progress','Waiting','Done'];
const readStages = ['To skim','Deep read','Synthesize','Synthesized'];
const paperStages = ['Idea','Drafting','Co-author review','Submitted','Under review','Revise & resubmit','Published'];
const grantStages = ['Considering','Preparing','Waiting','Submitted','Awarded','Closed'];
const draftStages = ['Outline','First draft','Revision','Polishing','Complete'];
const cvKinds = ['Talk','Paper accepted','Guest lecture','Award','Other CV item'];
const logKinds = ['Effort','Learning','Negative result','Reflection','Task done','Focus','Writing','Reading','Shutdown','Milestone done','Chapter cleared',...cvKinds];
const pages = [
  ['WORKSPACE',[['today','Today','sun'],['tasks','Horizon','map'],['projects','Projects','columns'],['roadmap','Roadmap','checklist'],['focus','Focus & writing','timer']]],
  ['RESEARCH',[['reading','Reading & notes','book'],['pipeline','Academic pipeline','columns'],['advisor','Advisor meetings','people'],['log','Research log','journal']]],
  ['SUPPORT',[['room','Co-working room','people'],['wellbeing','Wellbeing','leaf'],['settings','Settings & export','settings']]]
];
const pageNames = Object.fromEntries(pages.flatMap(group => group[1].map(([key,label]) => [key,label])));
const icons = {
  brand:'<circle cx="11.5" cy="11" r="6.7"/><path d="m13.2 13.1 5.6 6.1"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  map:'<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',
  checklist:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m7 9 1 1 2-2m2 1h5m-10 6 1 1 2-2m2 1h5"/>',
  timer:'<circle cx="12" cy="13" r="8"/><path d="M9 2h6m-3 7v4l3 2m3-9 2-2"/>',
  book:'<path d="M12 6c-2.5-2-6-2.3-9-1v14c3-1.3 6.5-1 9 1 2.5-2 6-2.3 9-1V5c-3-1.3-6.5-1-9 1zm0 0v14"/>',
  columns:'<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M9 4v16m6-16v16"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M15 19v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m13-14a3 3 0 0 1 0 6m5 8v-2a4 4 0 0 0-3-3.9"/>',
  journal:'<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M5 7H3m2 5H3m2 5H3m6-9h7m-7 4h7m-7 4h5"/>',
  leaf:'<path d="M20 4c-9 0-15 2.7-15 8a5 5 0 0 0 5 5c5.3 0 8-4 10-13zM4 20c3.6-4.6 6.8-7.8 11-10"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.1m0 13.8V21M3 12h2.1m13.8 0H21M5.6 5.6l1.5 1.5m9.8 9.8 1.5 1.5m0-12.8-1.5 1.5m-9.8 9.8-1.5 1.5"/><circle cx="12" cy="12" r="7"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="m5 12 4 4 10-10"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  play:'<path d="m8 5 12 7-12 7z" fill="currentColor" stroke-width="0"/>',
  pause:'<path d="M9 5v14m6-14v14" stroke-width="2.5"/>',
  stop:'<rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor"/>',
  edit:'<path d="m13 6 5 5M4 20l5-.9L20 8l-4-4L5 15z"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  chevron:'<path d="m9 6 6 6-6 6"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  moon:'<path d="M20.7 14.7A8.8 8.8 0 0 1 9.3 3.3 9 9 0 1 0 20.7 14.7z"/>',
  maximize:'<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  flag:'<path d="M5 21V4m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  inbox:'<path d="M5 5h14l3 9v5H2v-5l3-9zM2 14h6l1 2h6l1-2h6"/>',
  link:'<path d="M9 15l6-6m-7 8-1.5 1.5a3.5 3.5 0 0 1-5-5L6 9a3.5 3.5 0 0 1 5 0m2 6a3.5 3.5 0 0 0 5 0l4.5-4.5a3.5 3.5 0 0 0-5-5L16 7"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  spark:'<path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
  wifi:'<path d="M3 9a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 3a4 4 0 0 1 6 0m-3 4h.01"/>'
};
const glyph = (name, large = false) => '<svg class="icon'+(large?' icon-lg':'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.flag)+'</svg>';
const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const frag = (...parts) => parts.map(encodeURIComponent).join('|');
const split = value => value.split('|').map(decodeURIComponent);
const attr = (name,value) => value === undefined || value === '' ? '' : ' '+name+'="'+e(value)+'"';
const button = (label, action, value='', kind='secondary', icon='') => '<button type="button" class="btn '+kind+'" data-action="'+action+'"'+attr('data-value',value)+'>'+(icon?glyph(icon):'')+e(label)+'</button>';
const iconButton = (label, icon, action, value='') => '<button type="button" class="icon-btn" aria-label="'+e(label)+'" title="'+e(label)+'" data-action="'+action+'"'+attr('data-value',value)+'>'+glyph(icon)+'</button>';
const edit = (collection,item) => iconButton('Edit '+item.title,'edit','edit',frag(collection,item.id));
const badge = (label, kind='') => '<span class="badge '+kind+'">'+e(label)+'</span>';
const txt = (value, style='meta') => value ? '<p class="'+style+'">'+e(value)+'</p>' : '';
const empty = message => txt(message,'empty');
const external = (label,url) => safeUrl(url) ? '<a class="inline-link" href="'+e(safeUrl(url))+'" target="_blank" rel="noopener noreferrer">'+e(label)+'</a>' : '';
const safeUrl = value => { try { const url=new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
const id = () => globalThis.crypto?.randomUUID?.() || (Date.now().toString(36)+Math.random().toString(36).slice(2));
const num = value => Math.max(0,Number(value)||0);
const lower = value => String(value).toLowerCase();
const arr = value => Array.isArray(value) ? value : [];
const localDate = (date=new Date()) => date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
const today = () => localDate();
const dateIn = value => new Date(value+'T12:00:00');
function shift(value,days) { const d=dateIn(value); d.setDate(d.getDate()+days); return localDate(d); }
const fromToday = days => shift(today(),days);
function displayDate(value, opts={month:'short',day:'numeric'}) {
  const d=dateIn(value);
  return value && Number.isFinite(+d) ? d.toLocaleDateString(undefined,opts) : '';
}
function startOfWeek(value=today()) { return shift(value,-((dateIn(value).getDay()+6)%7)); }
const thisWeek = date => date >= startOfWeek() && date <= today();
const dateOrder = (a,b) => (a.date||'9999').localeCompare(b.date||'9999');
const recentOrder = (a,b) => (b.date||'').localeCompare(a.date||'') || (b.created||0)-(a.created||0);
const minutesLabel = minutes => minutes >= 60 ? Math.floor(minutes/60)+'h'+(minutes%60?' '+minutes%60+'m':'') : minutes+'m';
const find = (collection,key) => state[collection].find(item=>item.id===key);
function focusDefaults() { return {preset:25, breakPreset:5, sessionPreset:0, mode:'focus', taskId:'', freeLabel:'', status:'idle', remaining:1500, elapsed:0, anchor:0, end:0}; }
function blank() {
  return {version:1,tasks:[],projects:[],milestones:[],reading:[],notes:[],pipeline:[],meetings:[],logs:[],drafts:[],rest:[],settings:{name:'',goal:750,shutdown:'17:00',weekends:true,...shieldDefaults()},focus:focusDefaults(),support:supportDefaults(),workHours:loadWorkHours(),sample:false};
}
function makeSample() {
  const s=blank();
  s.sample=true;
  s.milestones=[
    {id:'m0',title:'Coursework & qualifying exam',date:fromToday(-155),status:'Done',details:'Pass the oral exam and file the committee report.'},
    {id:'m1',title:'Chapter 2 · literature review',date:fromToday(28),status:'In progress',details:'Agree on the scope; circulate an outline and draft synthesis.'},
    {id:'m2',title:'Ethics approval',date:fromToday(110),status:'Planned',details:'Confirm consent and data management with the committee.'},
    {id:'m3',title:'Data collection',date:fromToday(275),status:'Planned',details:'Complete a pilot and record the inclusion criteria.'},
    {id:'m4',title:'Dissertation defense',date:fromToday(810),status:'Planned',details:'Check filing and committee scheduling requirements.'}
  ];
  s.tasks=[
    {id:'t1',title:'Outline the Chapter 2 argument',role:'Research',minutes:45,date:today(),status:'Next',milestone:'m1',today:true,planKind:'deep',
      details:'Draft three claims and add one source for each.',doneLooks:'Three bullet points state the chapter claims and each has a source.',
      obstacle:'I keep reading outside the scope of the chapter',response:'Write one question the next paper needs to answer'},
    {id:'t2',title:'Skim two papers on research methods',role:'Research',minutes:20,date:today(),status:'Next',milestone:'m1',today:true,planKind:'small'},
    {id:'t3',title:'Draft feedback for tutorial group',role:'Teaching',minutes:20,date:today(),status:'Next',today:true,repeat:'Weekly',planKind:'small'},
    {id:'t4',title:'Review pilot recruitment plan',role:'Research',minutes:25,status:'Waiting',waiting:'Advisor feedback',date:fromToday(2),milestone:'m2'}
  ];
  s.reading=[
    {id:'r1',title:'Effects of a Participation in a Structured Writing Retreat on Doctoral Mental Health',authors:'Vincent, Cynthia and Tremblay-Wragg, Émilie and Plante, Isabelle',year:'2023',stage:'To skim',doi:'10.3390/ijerph20206953',url:'https://www.mdpi.com/1660-4601/20/20/6953'},
    {id:'r2',title:'Work organization and mental health problems in PhD students',authors:'Levecque, Katia and Anseel, Frederik and De Beuckelaer, Alain and Van der Heyden, Johan and Gisle, Lydia',year:'2017',stage:'Deep read',doi:'10.1016/j.respol.2017.02.008',url:'https://doi.org/10.1016/j.respol.2017.02.008'}
  ];
  s.notes=[{id:'n1',title:'Workload and supervisory support',body:'Distinguish organizational conditions from individual work habits. Follow up on the survey measure and sampling.',paper:'r2',milestone:'m1',question:'What conditions support sustainable doctoral work?'}];
  s.pipeline=[
    {id:'p1',title:'Methods workshop abstract',kind:'Conference',status:'Idea',date:fromToday(24),details:'Check the word limit and ask about travel funding.'},
    {id:'p2',title:'Chapter 2 synthesis paper',kind:'Publication',status:'Co-author review',waiting:'Comments on the framing',date:fromToday(39)},
    {id:'p3',title:'Graduate research travel award',kind:'Fellowship',status:'Preparing',date:fromToday(59),prep:'42 | Request recommendation letters\n21 | Draft the narrative and budget\n7 | Ask a colleague to review the application'}
  ];
  s.meetings=[{id:'a1',title:'Chapter 2 check-in',date:fromToday(5),attendees:'Supervisor',questions:'What is in scope for the literature review?\nWhich decision should we make before the pilot?',materials:'Outline and pilot recruitment notes',notes:'',extracted:[]}];
  const prev=today()===startOfWeek()?today():fromToday(-1);
  s.logs=[
    {id:'l1',kind:'Writing',title:'Started the literature map',date:prev,words:420,draft:'d1',created:1},
    {id:'l2',kind:'Negative result',title:'Ruled out a search strategy',date:prev,minutes:45,details:'The query missed methods papers. Test a controlled-vocabulary search next.',created:2},
    {id:'l3',kind:'Focus',title:'Mapped themes for Chapter 2',date:prev,minutes:90,blockCompleted:true,created:3},
    {id:'l4',kind:'Learning',title:'Identified a gap in the methods section',date:today(),created:4}
  ];
  s.drafts=[{id:'d1',title:'Chapter 2 · literature review',status:'Outline',milestone:'m1'}];
  s.tasks=migrateTasks(s.tasks).map(t=>({...t,example:true}));
  s.focus.taskId='t1';
  return s;
}
const collections=['tasks','milestones','reading','notes','pipeline','meetings','logs','drafts','projects'];
function validated(data) {
  if (!data || data.version!==1 || !Array.isArray(data.rest)) throw Error('Choose a Quod JSON backup.');
  const records={projects:[],...data};
  if(!collections.every(key=>Array.isArray(records[key])&&records[key].every(item=>item&&typeof item==='object'&&typeof item.id==='string'&&typeof item.title==='string'))) throw Error('Choose a Quod JSON backup.');
  const config=data.settings||{};
  const focus={...focusDefaults(),...data.focus};
  if(!['idle','running','paused'].includes(focus.status)||!['focus','break'].includes(focus.mode)||!Number.isFinite(focus.remaining)||!Number.isFinite(focus.end)) Object.assign(focus,focusDefaults());
  return {...blank(),...Object.fromEntries(collections.map(key=>[key,records[key]])),tasks:migrateTasks(data.tasks),rest:data.rest.filter(validDay),sample:data.sample===true,settings:{name:String(config.name||'').slice(0,80),goal:num(config.goal),shutdown:validTime(config.shutdown)?config.shutdown:'17:00',weekends:config.weekends!==false,shield:config.shield===true,shieldWeekends:config.shieldWeekends!==false,resume:validTime(config.resume)?config.resume:'08:30'},focus,support:loadSupport(data.support),workHours:loadWorkHours(data.workHours)};
}
let stored=true,loadError=false,storageRaw=null,storageIssue='';
function loadState(){
  try {
    storageRaw=localStorage.getItem(STORE);
    if(storageRaw) return validated(JSON.parse(storageRaw));
    return validDay(pilotLaunch)?addChapterPilot(blank(),pilotLaunch):pilotInvite?blank():makeSample();
  } catch {
    loadError=true;stored=false;storageIssue='Saved data could not be read. Restore a backup or start a new workspace.';
    return makeSample();
  }
}
let state=loadState();
researchLock=state.support.researchLock;
function save(replace=false){
  try {
    refreshBoard(state);
    if(loadError&&!replace) return;
    const saved=localStorage.getItem(STORE);
    if(!replace&&saved!==storageRaw){
      stored=false;storageIssue='Saved data changed in another tab. Back up work from this tab before loading the saved workspace.';
      notify(storageIssue);return;
    }
    const next=JSON.stringify(state);
    if(next!==saved) localStorage.setItem(STORE,next);
    storageRaw=next;stored=true;loadError=false;storageIssue='';
  } catch {
    stored=false;storageIssue='Browser storage is unavailable. Download a backup before closing.';
    notify(storageIssue);
  }
}
let active='today';
let menuOpen=false;
let quiet=false;
let taskFilter={role:'All roles',stage:'All statuses'};
let readFilter='All';
let pipelineFilter='Publications & conferences';
let logFilter='All entries';
let zoteroAuth=null;
let toastHandle;
let focusReturn=null;
let dialogSession=0;
let pendingImport=null;

function notify(message) {
  const toast=$('#toast');
  toast.textContent=message;
  toast.hidden=false;
  clearTimeout(toastHandle);
  toastHandle=setTimeout(()=>{toast.hidden=true;},4600);
}
function nav() {
  return '<aside class="sidebar" aria-label="Workspace menu"><button class="brand" type="button" data-action="page" data-value="today"><span class="brand-mark">'+glyph('brand',true)+'</span><span><span class="brand-name">Quod</span><span class="brand-sub">PhD workspace</span></span></button><nav aria-label="Main navigation">'+
    pages.map(([label,links])=>'<div class="nav-group"><p class="nav-label">'+label+'</p>'+links.map(([key,name,icon])=>'<button type="button" class="nav-button'+(active===key?' active':'')+'" data-action="page" data-value="'+key+'"'+(active===key?' aria-current="page"':'')+'>'+glyph(icon)+e(name)+'</button>').join('')+'</div>').join('')+
    '</nav><div class="sidebar-bottom"><span class="status-dot'+(stored?'':' warn')+'"></span><span>'+ (stored ? 'Private · saved on this device' : 'Changes need a backup')+'</span></div></aside>';
}
function header() {
  return '<header class="topbar"><div class="crumb"><button type="button" class="icon-btn menu-toggle" aria-label="Toggle menu" aria-expanded="'+menuOpen+'" data-action="menu">'+glyph('menu')+'</button><span>My workspace</span>'+glyph('chevron')+'<strong>'+e(pageNames[active])+'</strong></div><div class="top-actions"><time class="top-date" datetime="'+today()+'">'+e(displayDate(today(),{weekday:'short',month:'short',day:'numeric'}))+'</time>'+button('Quick add','quick','','primary','plus')+'</div></header>';
}
function heading(title, subtitle, action='', kicker='') {
  return '<header class="page-head"><div>'+(kicker?'<p class="eyebrow date-heading">'+e(kicker)+'</p>':'')+'<h1 tabindex="-1">'+e(title)+'</h1>'+txt(subtitle,'')+'</div>'+action+'</header>';
}
function panel(title, content, options={}) {
  const {description='',action='',className='',mark=''}=options;
  return '<section class="panel '+className+'"><header class="panel-head"><div><div class="panel-title">'+(mark?'<span class="soft-icon">'+glyph(mark)+'</span>':'')+'<h2>'+e(title)+'</h2></div>'+txt(description,'')+'</div>'+action+'</header>'+content+'</section>';
}
function listRow(title, line='', actions='', visual='') {
  return '<div class="list-row">'+visual+'<div class="grow"><h4>'+e(title)+'</h4>'+line+'</div>'+(actions?'<div class="row-actions">'+actions+'</div>':'')+'</div>';
}
function filters(values, current, action) {
  return '<div class="filters">'+values.map(value=>'<button type="button" class="chip-button'+(current===value?' selected':'')+'" aria-pressed="'+(current===value)+'" data-action="'+action+'" data-value="'+e(value)+'">'+e(value)+'</button>').join('')+'</div>';
}
function taskRow(task, detail=false, showTime=false) {
  const completed=task.status==='Done';
  const milestone=find('milestones',task.milestone);
  const project=detail?taskProject(task):null;
  return '<div class="task-row'+(completed?' done':'')+'"><button type="button" class="task-check" aria-label="Done: '+e(task.title)+'" aria-pressed="'+completed+'" data-action="toggle-task" data-value="'+e(task.id)+'">'+(completed?glyph('check'):'')+'</button><div class="grow"><button class="task-title" type="button" data-action="edit" data-value="'+e(frag('tasks',task.id))+'">'+e(task.title)+'</button><div class="task-meta">'+badge(taskKind(task)==='reading'?'Reading':task.role||'Research',lower(task.role||''))+
    (task.status==='Waiting'?badge(task.waiting?'Waiting on '+task.waiting:'Waiting','wait'):'')+
    (detail&&milestone?badge(milestone.title,'neutral'):'')+
    (project?badge(project.title,'neutral'):'')+
    (detail&&task.repeat&&task.repeat!=='None'?badge(task.repeat,'neutral'):'')+taskSupportMeta(task,detail,showTime)+
    (detail&&task.date?'<span class="meta">'+e(displayDate(task.date,{month:'short',day:'numeric',year:'numeric'}))+'</span>':'')+'</div>'+
    ((detail||task.planDate===today())&&taskKind(task)==='deep'&&task.doneLooks?txt('Done when · '+task.doneLooks,'meta format'):'')+
    (detail?txt(task.details,'meta format')+obstacleLine(task):'')+
    ((detail||task.planDate===today())&&task.returnCue?txt('Return cue · '+task.returnCue,'meta format'):'')+'</div>'+
    (task.minutes?'<span class="task-time">'+glyph('clock')+e(task.minutes)+' min</span>':'')+
    (completed?'':'<div class="row-actions">'+iconButton('Plan '+task.title,'calendar','reset-plan',task.id)+(canWork(task)?iconButton('Focus on '+task.title,'play','focus-task',task.id):'')+'</div>')+'</div>';
}
function focusState() {
  const f=state.focus;
  return {...f, seconds: f.status==='running'? Math.max(0,Math.ceil((f.end-Date.now())/1000)):Math.ceil(num(f.remaining))};
}
function asClock(seconds) { return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'); }
function timerPanel(full=false) {
  const f=focusState(), selected=find('tasks',f.taskId);
  const task=f.status==='idle'&&!focusableTask(selected)?null:selected;
  const isBreak=f.mode==='break', running=f.status==='running', paused=f.status==='paused';
  const paper=!isBreak&&taskKind(task)==='reading'?find('reading',task.paper):null;
  const length=isBreak?f.breakPreset:(f.sessionPreset||f.preset);
  const options=[...new Set([...(isBreak?[3,5,10]:[5,15,25,45]),length])].sort((a,b)=>a-b);
  return '<section class="panel timer-panel"><div class="panel-head"><div class="timer-top"><span class="timer-header-icon">'+glyph(isBreak?'leaf':'timer')+'</span><h2>'+(isBreak?'Take a break':'Focus timer')+'</h2></div>'+
    (full?'':iconButton('Open distraction-free view','maximize','quiet'))+'</div>'+
    '<p class="timer-display" data-clock aria-label="Time remaining">'+asClock(f.seconds)+'</p><p class="timer-task">'+(isBreak?'Take a moment away from your work.': e(f.sessionTitle||task?.title||'Choose an action from Today.'))+'</p>'+(!isBreak?obstacleLine(task):'')+(f.status==='idle'&&!isBreak?'<div class="timer-row">'+button(task?'Change task':'Choose task','pick-focus',task?.id||'','ghost','checklist')+'</div>':'')+
    (paper?'<div class="timer-row">'+external('Open source',paper.url||(paper.doi?'https://doi.org/'+paper.doi:''))+'</div>':'')+
    '<div class="timer-options" aria-label="Timer duration">'+options.map(amount=>'<button type="button" class="chip-button'+(length===amount?' selected':'')+'" data-action="duration" data-value="'+amount+'" aria-pressed="'+(length===amount)+'"'+(f.status!=='idle'?' disabled':'')+'>'+amount+' min</button>').join('')+
    iconButton('Timer settings','settings','timer-settings')+'</div><div class="timer-row">'+button(running?'Pause':paused?'Resume':isBreak?'Start break':'Start focus',running?'pause':'start','','primary',running?'pause':'play')+
    (f.status==='idle' ? (isBreak?button('Skip break','skip-break','','ghost'):'') : iconButton(isBreak?'End break':'End and log session','stop','stop'))+'</div></section>';
}
function dash() {
  if(zoom==='week') return weekView();
  if(zoom!=='day') return planningZoom();
  const todayTasks=currentPlan();
  const next=nextPlanTask();
  const budget=researchBudget(today());
  const firstFree=plannedResearchMinutes(todayTasks)<budget?'deep':todayTasks.filter(t=>!researchBlock(t)).length<maintenanceLimit?'small':'';
  const finished=state.logs.some(item=>item.kind==='Shutdown'&&item.date===today());
  return heading(state.settings.name?'Welcome, '+state.settings.name+'.':'Today','Make room for the work that matters.', '',displayDate(today(),{weekday:'long',month:'long',day:'numeric'}))+zoomButtons()+
    '<section class="hero"><div class="hero-content"><p class="eyebrow">'+glyph('leaf')+' Daily focus</p><h2>Finish the work that matters.</h2><p>'+
    (next?'Next step · '+e(next.title):firstFree?'Choose the work you want to make room for.':'Today’s plan is complete.')+'</p>'+
    (next?button(state.focus.status==='idle'?'Start this focus':'Open focus timer','start-planned',next.id,'secondary','play')+button('Get unstuck','friction',next.id,'ghost','leaf'):
      firstFree?button(firstFree==='deep'?'Add research block':'Add a small task','new-slot',firstFree,'secondary','plus'):button('See what you finished','page','log','secondary','check'))+'</div></section>'+
    '<div class="grid dashboard-grid">'+panel('Today’s plan',slotRows()+decisionDrawer()+'<div class="section-rule"></div>'+
    '<div class="inline wrap-inline">'+button('Open Horizon','all-tasks','','ghost','map')+button('Quick capture','quick-capture','','ghost','plus')+(state.support.pilot?button('Pilot week','pilot-week','','ghost','calendar'):'')+'</div>',
    {description:researchPlanSummary(todayTasks,budget)})+
    '<div class="stack">'+timerPanel()+'<section class="panel warm shutdown-card"><span class="soft-icon">'+glyph('moon')+'</span><div><h3>'+ (finished?'Day closed':'Daily shutdown')+'</h3><p class="meta">'+ (finished?'Your next step is saved.': e(state.settings.shutdown)+' · Make a plan to return')+'</p></div>'+button(finished?'Review':'Close day','shutdown','','secondary')+'</section>'+workHoursPanel()+'</div></div>'+
    '<div class="section-gap">'+finishFeed()+'</div>';
}


function tasksView() {
  const filtered=state.tasks.filter(t=>!t.archivedAt&&(taskFilter.role==='All roles'||t.role===taskFilter.role)&&(taskFilter.stage==='All statuses'||t.status===taskFilter.stage));
  return heading('Horizon','Keep future work, dependencies, and ideas here until you choose a work date.',button('Add an action','new','tasks','primary','plus'))+
    filters(['All roles',...roles],taskFilter.role,'role-filter')+filters(['All statuses',...taskStages],taskFilter.stage,'task-filter')+
    (['Teaching','Service'].includes(taskFilter.role)?'<div class="flow-toolbar">'+button('Switch to deep research','research','','secondary','leaf')+'</div>':'')+
    '<div class="grid"><div class="stack">'+panel('Actions',filtered.length?filtered.map(t=>taskRow(t,true)).join(''):empty('No actions in this view.'))+archivePanel()+'</div>'+
    '<div class="stack">'+panel('Break down a goal',txt('Name the larger goal, then write the actions you can start in one sitting.','muted')+'<div class="compact">'+button('Break down a goal','decompose','','secondary','spark')+'</div>',{className:'subtle'})+
    decisionDrawer()+(planQueue()||'')+inboxMarkup()+panel('Waiting on',state.tasks.filter(t=>!t.archivedAt&&t.status==='Waiting').map(t=>listRow(t.title,txt(t.waiting||'Dependency unspecified')+txt(t.date?'Follow up '+displayDate(t.date):''),edit('tasks',t))).join('')||empty('No tasks are waiting.'))+'</div></div>';
}
function roadmapView() {
  const items=[...state.milestones].sort(dateOrder);
  const years=[...new Set(items.map(m=>m.date?.slice(0,4)||'Flexible'))];
  const content=years.map(year=>'<div class="road-row"><span class="year-label">'+e(year)+'</span><div class="grow">'+items.filter(m=>(m.date?.slice(0,4)||'Flexible')===year).map(m=>{
    const links=state.notes.filter(n=>n.milestone===m.id);
    const tasks=state.tasks.filter(t=>!t.archivedAt&&t.milestone===m.id);
    const project=find('projects',m.project);
    return listRow(m.title,'<div class="task-meta">'+badge(m.status,m.status==='Waiting'?'wait':'')+(m.date?'<time class="meta">'+e(displayDate(m.date))+'</time>':'')+
      (project?badge(project.title,'neutral'):'')+'</div>'+txt(m.question,'plan-question')+txt(m.purpose,'meta format')+txt(m.details,'meta format')+
      (links.length||tasks.length?'<div class="inline wrap-inline compact">'+
      (tasks.length?button(tasks.length+(tasks.length===1?' linked task':' linked tasks'),'milestone-tasks',m.id,'ghost','checklist'):'')+
      links.map(n=>button(n.title,'edit',frag('notes',n.id),'ghost','link')).join('')+'</div>':''),
      edit('milestones',m)+iconButton('Add task for '+m.title,'plus','milestone-task',m.id));
  }).join('')+'</div></div>').join('');
  return heading('Roadmap','Connect your long-range milestones to the work you can start today.',button('Add milestone','new','milestones','primary','plus'))+
    panel('Degree timeline','<div class="road-line">'+(content||empty('Start with a chapter, proposal, or another milestone that matters to you.'))+'</div>');
}
function readingView() {
  const items=state.reading.filter(item=>readFilter==='All'||item.stage===readFilter);
  const count=state.reading.filter(item=>item.stage==='Synthesized').length;
  const progress=state.reading.length?'<div class="synthesis-progress"><p class="meta">'+e(count)+' of '+e(state.reading.length)+' references synthesized</p><progress aria-label="References synthesized" value="'+count+'" max="'+state.reading.length+'"></progress></div>':'';
  const notes=[...state.notes].sort((a,b)=>a.title.localeCompare(b.title));
  const readingRows=items.map(item=>{
    const related=notes.filter(n=>n.paper===item.id);
    const citation=txt([item.authors,item.year].filter(Boolean).join(' · '));
    return '<div class="list-row"><div class="grow"><h4>'+e(item.title)+'</h4>'+citation+
    '<div class="inline wrap-inline compact">'+badge(item.stage,'neutral')+(item.zotero?badge('Zotero','neutral'):'')+
    external('Open source',item.url||(item.doi?'https://doi.org/'+item.doi:''))+
    button('Plan reading','plan-reading',item.id,'ghost','calendar')+
    (item.stage==='Synthesized'?(item.recallNote?button('Practice recall','review-paper',item.id,'ghost','book'):''):button('Mark read','recall-paper',item.id,'secondary','check'))+'</div>'+
    related.map(n=>'<div class="reading-note">'+button(n.title,'edit',frag('notes',n.id),'ghost','link')+'</div>').join('')+'</div>'+
    '<div class="row-actions">'+iconButton('Add linked note','link','paper-note',item.id)+edit('reading',item)+'</div></div>';
  }).join('');
  return heading('Reading & notes','Triage each source and connect useful ideas to your research.',button('Add reference','new','reading','primary','plus'))+
    '<div class="inline wrap-inline" style="margin-bottom:15px">'+button('Import BibTeX','bib-import','','secondary','download')+button('Zotero sync','zotero','','secondary','link')+'</div>'+
    filters(['All',...readStages],readFilter,'read-filter')+'<div class="grid">'+panel('Reading queue',progress+(readingRows||empty('Add or import a reference to start triage.')))+
    '<div class="stack">'+(reviewPanel()?panel('Papers to review',reviewPanel(),{className:'subtle'}):'')+panel('Linked notes',notes.length?notes.map(n=>{
      const linked=find('reading',n.paper), milestone=find('milestones',n.milestone);
      return listRow(n.title,txt(n.body,'format small')+txt(n.question?'Research question · '+n.question:'')+
        '<div class="inline wrap-inline">'+(linked?button(linked.title,'edit',frag('reading',linked.id),'ghost','book'):'')+
        (milestone?button(milestone.title,'edit',frag('milestones',milestone.id),'ghost','flag'):'')+'</div>',edit('notes',n));
    }).join(''):empty('Link a paper to a chapter, milestone, or research question.'),{action:button('Add note','new','notes','secondary','plus')})+'</div></div>';
}
const isGrant = item => ['Grant','Fellowship'].includes(item.kind);
function prepEntries(item) {
  if (!item.date||!isGrant(item)) return [];
  const steps=String(item.prep||'').split(/\r?\n/).map(line=>line.match(/^\s*(\d{1,4})\s*\|\s*(\S.*)$/)).filter(Boolean);
  const keyed=steps.map(([,days,title])=>({key:frag(Number(days),title.trim()),date:shift(item.date,-Number(days)),title:title.trim(),item}));
  return [...new Map(keyed.map(step=>[step.key,step])).values()].sort(dateOrder);
}
function deadlineEntries() {
  return state.pipeline.filter(item=>!['Published','Closed','Awarded'].includes(item.status)).flatMap(item=>{
    const dateLabel=item.status==='Waiting'?'Follow up':['Submitted','Under review'].includes(item.status)?'Check in':'Deadline';
    return [...(item.date?[{key:'deadline',date:item.date,title:dateLabel,item}]:[]),
      ...(['Submitted','Under review'].includes(item.status)?[]:prepEntries(item).filter(step=>!arr(item.prepDone).includes(step.key)))];
  }).sort(dateOrder);
}
function grantChecklist(key) {
  const item=find('pipeline',key);
  if(!item) return;
  const steps=prepEntries(item);
  dialog('Preparation checklist','<div class="form-grid">'+txt(item.title,'plan-question')+
    (steps.length?steps.map(step=>'<div class="inline"><div class="grow">'+txt(step.title,'')+txt(displayDate(step.date))+'</div>'+
      button(arr(item.prepDone).includes(step.key)?'Reopen':'Mark done','prep-toggle',frag(key,step.key),'secondary')).join(''):empty('Add a deadline and preparation steps to start your checklist.'))+
    '<div class="form-actions">'+cancel()+'</div></div>');
}
function pipelineView() {
  const grants=pipelineFilter==='Grants & fellowships';
  const stages=grants?grantStages:paperStages;
  const items=state.pipeline.filter(item=>isGrant(item)===grants);
  const entries=deadlineEntries();
  const upcoming=entries.filter(item=>item.date>=today()).slice(0,10);
  const review=entries.filter(item=>item.date<today()).slice(-6);
  return heading('Academic pipeline','Track submissions, funding applications, and the decisions you’re waiting for.',button('Add to pipeline','new','pipeline','primary','plus'))+
    filters(['Publications & conferences','Grants & fellowships'],pipelineFilter,'pipeline-filter')+
    '<div class="columns" aria-label="Pipeline board">'+stages.map(stage=>{
      const cards=items.filter(item=>item.status===stage);
      return '<section class="kanban-column" data-drop="'+e(stage)+'"><h3>'+e(stage)+' '+badge(cards.length,'neutral')+'</h3>'+cards.map(item=>
        '<article class="kanban-card" draggable="true" data-card="'+e(item.id)+'"><div class="inline"><h4 class="grow">'+e(item.title)+'</h4>'+edit('pipeline',item)+'</div>'+txt(item.kind+(item.date?' · '+displayDate(item.date):''))+
        (item.waiting?'<p class="compact">'+badge('Waiting on '+item.waiting,'wait')+'</p>':'')+
        (isGrant(item)&&prepEntries(item).length?button(prepEntries(item).filter(step=>arr(item.prepDone).includes(step.key)).length+'/'+prepEntries(item).length+' prep steps','grant-checklist',item.id,'ghost','checklist'):'')+
        '<select data-move="'+e(item.id)+'" aria-label="Move '+e(item.title)+'">'+options(stages,stage)+'</select></article>'
      ).join('')+'</section>';
    }).join('')+'</div>'+
    '<div class="grid section-gap">'+panel('Upcoming dates',upcoming.length?upcoming.map(x=>'<div class="rail-item"><time datetime="'+e(x.date)+'">'+e(displayDate(x.date))+'</time><div><h4>'+e(x.title)+'</h4>'+txt(x.item.title)+'</div></div>').join(''):empty('Dated deadlines and prep steps show up here.'),{action:button('Calendar reminders','calendar-export','','secondary','calendar')})+
    '<div class="stack">'+(review.length?panel('Dates to review',review.map(x=>listRow(x.title,txt(x.item.title+' · '+displayDate(x.date)),x.key==='deadline'?edit('pipeline',x.item):button('Checklist','grant-checklist',x.item.id,'ghost'))).join('')):'')+
    panel('Waiting on',state.pipeline.filter(item=>item.waiting&&!['Published','Closed','Awarded'].includes(item.status)).map(item=>listRow(item.title,txt(item.waiting),edit('pipeline',item))).join('')||empty('Add a dependency to any pipeline item.'))+'</div></div>';
}
function advisorView() {
  const ordered=[...state.meetings].sort(dateOrder);
  function section(meetings) {
    return meetings.map(m=>listRow(m.title,txt([displayDate(m.date,{month:'short',day:'numeric',year:'numeric'}),m.attendees].filter(Boolean).join(' · '))+
      (m.questions?'<p class="format small"><strong>Questions</strong><br>'+e(m.questions)+'</p>':'')+
      (m.materials?'<p class="format small"><strong>Materials</strong><br>'+e(m.materials)+'</p>':'')+
      (m.notes?'<p class="format small"><strong>Notes</strong><br>'+e(m.notes)+'</p>':'')+
      (m.notes?button('Convert notes to tasks','extract',m.id,'ghost','plus'):''),edit('meetings',m))).join('');
  }
  return heading('Advisor meetings','Keep questions, materials, decisions, and follow-ups in one place.',button('Plan meeting','new','meetings','primary','plus'))+
    '<div class="grid">'+panel('Upcoming meetings',section(ordered.filter(m=>!m.date||m.date>=today()))||empty('Plan a meeting or start a running list of questions.'))+
    '<div class="stack">'+panel('Weekly update',txt('Prepare a draft with completed tasks, writing, reading, and questions. Review and copy it when you’re ready.','muted')+button('Prepare digest','digest','','secondary','journal'),{className:'subtle'})+
    panel('Past meetings',section(ordered.filter(m=>m.date&&m.date<today()).reverse())||empty('Meeting records will appear here.'))+'</div></div>';
}
function stats(items) {
  const blocks=items.filter(x=>x.kind==='Focus'&&x.blockCompleted).length;
  const actions=items.filter(x=>x.kind==='Task done').length;
  const milestones=items.filter(x=>['Milestone done','Chapter cleared'].includes(x.kind)).length;
  return '<div class="stats">'+[[blocks,'Focus blocks finished'],[actions,'Actions completed'],[milestones,'Milestones and chapters finished']].map(([n,label])=>'<div class="stat"><strong>'+e(n)+'</strong><span>'+e(label)+'</span></div>').join('')+'</div>';
}
function logView() {
  const items=state.logs.filter(x=>logFilter==='All entries'||(logFilter==='CV'&&cvKinds.includes(x.kind))||(logFilter==='Learning & setbacks'&&['Learning','Negative result','Reflection'].includes(x.kind))||(logFilter==='Effort'&&num(x.minutes)>0)).sort(recentOrder);
  return heading('Research log','Keep a record of effort, findings, and achievements as they happen.',button('Add log entry','new','logs','primary','plus'))+
    stats(state.logs.filter(item=>thisWeek(item.date)))+
    filters(['All entries','Effort','Learning & setbacks','CV'],logFilter,'log-filter')+
    panel(logFilter==='CV'?'Academic CV':'Progress history',items.map(item=>listRow(item.title,'<div class="task-meta">'+badge(item.kind,item.kind==='Negative result'?'wait':'')+
      '<time class="meta">'+e(displayDate(item.date,{month:'short',day:'numeric',year:'numeric'}))+'</time>'+
      (item.minutes?'<span class="meta">'+e(minutesLabel(item.minutes))+'</span>':'')+(item.words?'<span class="meta">'+e(item.words)+' words</span>':'')+(item.private?badge('Private','neutral'):'')+
      '</div>'+txt(item.details,'format small'),edit('logs',item))).join('')||empty(logFilter==='CV'?'Log a talk, paper acceptance, guest lecture, award, or CV item to build your CV.':'Add an effort, learning, or result entry.'),{action:logFilter==='CV'?button('Export CV','cv-export','','secondary','download'):''});
}
function focusView() {
  const words=state.logs.filter(item=>item.kind==='Writing');
  const calendar=Array.from({length:7},(_,i)=>shift(startOfWeek(),i)).map(date=>{
    const n=words.filter(x=>x.date===date).reduce((s,x)=>s+num(x.words),0);
    const dow=dateIn(date).getDay();
    const rest=state.rest.includes(date)||(state.settings.weekends&&(dow===0||dow===6));
    const stateLabel=n?n+' words':rest?'Rest':'·';
    return '<div class="day'+(date===today()?' today':'')+(n?' written':rest?' rest':'')+'" title="'+e(displayDate(date)+': '+stateLabel)+'"><strong>'+e(displayDate(date,{weekday:'short'}))+'</strong>'+e(n?n:stateLabel)+'</div>';
  }).join('');
  if (quiet) return '<div class="focus-view">'+button('Exit quiet view','quiet','','secondary','close')+timerPanel(true)+'</div>';
  return heading('Focus & writing','Make time for the work and track what you put into it.',button('Log writing','writing','','primary','edit'))+
    '<div class="flow-toolbar inline wrap-inline">'+button('Deep research','research','','secondary','leaf')+button('Step away','incubation','','secondary','clock')+button('Co-working room','page','room','ghost','people')+'</div><div class="grid"><div class="stack">'+panel('Writing log',
    '<div class="calendar-strip">'+calendar+'</div><div class="inline wrap-inline">'+button(state.rest.includes(today())?'Remove today’s rest day':'Mark today as rest','rest','','secondary','leaf')+button('Other rest day','rest-date','','ghost')+'</div>'+
    txt('Rest days'+(state.settings.weekends?' and weekends':'')+' are marked on your calendar.','meta compact'),{action:button('Set goal','page','settings','ghost')})+
    panel('Drafts',state.drafts.map(d=>listRow(d.title,txt(d.status+(find('milestones',d.milestone)?' · '+find('milestones',d.milestone).title:'')),button('Recall papers','draft-review',d.id,'ghost','book')+edit('drafts',d))).join('')||empty('Add a draft to track its stage.'),{action:button('Add draft','new','drafts','secondary','plus')})+
    '</div><div class="stack">'+timerPanel()+panel('Recent focus sessions',state.logs.filter(item=>item.kind==='Focus').sort(recentOrder).slice(0,5).map(item=>listRow(item.title,txt(displayDate(item.date)+' · '+minutesLabel(item.minutes)),edit('logs',item))).join('')||empty('Saved sessions show up here.'),{action:button('Log effort','effort','','secondary','plus')})+'</div></div>';
}

const evidence=[
  {label:'Workload & supervision',title:'Make the dependency visible',finding:'A survey of 3,659 PhD students in Flanders linked mental health indicators with work–family conflict, job demands and control, and supervisors’ leadership. The study was cross-sectional.',design:'Separate academic roles and name what is waiting on someone else. Use meeting prep to ask what can move or be dropped.',author:'Levecque et al. (2017)',url:'https://eijc.fas.harvard.edu/sites/g/files/omnuum9146/files/eijc/files/levecque2017.pdf'},
  {label:'Impostor feelings',title:'Ask for explicit expectations',finding:'Interviews with 20 biology doctoral students at two US institutions described gatekeeping, peer comparison, and unwritten expectations as sources of impostor feelings.',design:'Record what counts as done on each milestone. Ask your supervisor or a peer to clarify expectations for your stage.',author:'Steele et al. (2026)',url:'https://doi.org/10.1187/cbe.24-11-0264'},
  {label:'Writing & connection',title:'Make time to write with someone',finding:'A randomized waitlist study of 100 doctoral researchers found better short-term self-reported wellbeing and less distress after a structured three-day writing retreat. The study evaluated the retreat as a whole.',design:'Reserve a short writing session, optionally with a peer. Keep a record of the work you put in.',author:'Vincent et al. (2023)',url:'https://www.mdpi.com/1660-4601/20/20/6953'},
  {label:'Breaks & productivity',title:'Choose a rhythm that suits the work',finding:'Student experiments found mixed effects on mood and concentration and no statistically significant advantage on measured task completion or productivity for any break schedule tested.',design:'Choose a work interval and adjust, skip, or take a break when it suits the task.',author:'Biwer et al. (2023)',url:'https://doi.org/10.1111/bjep.12593',second:['Smits et al. (2025)','https://www.mdpi.com/2076-328X/15/7/861']},
  {label:'Mental detachment',title:'Write down where to pick up tomorrow',finding:'In workplace research, planning when, where, and how to resume work helped employees who tended to struggle with mentally switching off. The result concerns employees in that study.',design:'Use the shutdown ritual to save a concrete next action and a cue for when to return.',author:'Smit (2016)',url:'https://doi.org/10.1111/joop.12137',second:['Gollwitzer & Brandstätter (1997)','https://sparq.stanford.edu/sites/g/files/sbiybj19021/files/media/file/gollwitzer_brandstatter_1997_-_implementation_intentions_effective_goal_pursuit.pdf']},
  {label:'Self-compassion & support',title:'Talk to yourself as you would to a colleague',finding:'In a doctoral-student study, a multiweek workshop group reported more support-seeking and lower work pressure at post-test than the waitlist. The estimate for change in pressure was uncertain.',design:'An optional private reflection asks what you would say to a colleague and who could help you clarify the next step.',author:'Solms et al. (2025)',url:'https://link.springer.com/article/10.1007/s10734-024-01257-3'}
];
function wellbeingView() {
  return heading('Wellbeing','Make room for rest, perspective, and support.')+
    '<div class="grid grid-even">'+panel('A moment to reset',txt('What would you say to a colleague in this situation? What could be made clearer or lighter?','muted')+'<div class="inline wrap-inline compact">'+button('Reflect privately','reflect','','secondary','leaf')+button('Close the day','shutdown','','secondary','moon')+'</div>',{className:'subtle'})+
    panel('Reach out for support',txt('If workload, supervision, or stress keeps wearing you down, consider a trusted colleague, graduate program contact, ombudsperson, or campus counselling service.','muted')+'<div class="compact">'+button('Prepare a conversation','new','meetings','secondary','people')+'</div>',{className:'warm'})+'</div>'+
    '<div class="section-gap"><h2>Research behind Quod</h2><p class="muted compact">These studies informed the design. Quod’s effects on wellbeing and productivity have yet to be evaluated.</p>'+
    (staticPilotHost?'<p class="compact"><a class="btn secondary" href="./research.html">Browse the full research library</a></p>':'')+'</div>'+
    '<div class="grid grid-even section-gap">'+[...goalEvidence,...evidence,...workflowEvidence].map(x=>'<article class="panel source-card"><span class="eyebrow muted">'+e(x.label)+'</span><h3>'+e(x.title)+'</h3><p class="small">'+e(x.finding)+'</p><p class="small muted">'+e(x.design)+'</p><div class="inline wrap-inline">'+external(x.author,x.url)+(x.second?external(...x.second):'')+'</div></article>').join('')+'</div>';
}
function settingsView() {
  return heading('Settings & export','Adjust your defaults and take a copy of your workspace with you.')+
    '<div class="grid grid-even">'+panel('Workspace preferences','<form class="form-grid" data-form="settings">'+
    field('Your name','name',state.settings.name,{placeholder:'Optional',maxLength:80})+
    '<div class="form-pair">'+field('Weekly word goal','goal',state.settings.goal,{type:'number',min:0,max:1000000})+field('Daily shutdown time','shutdown',state.settings.shutdown,{type:'time',required:true})+'</div>'+
    tick('weekends','Treat weekends as rest days for writing and work hours',state.settings.weekends)+
    '<div class="section-rule"></div>'+tick('shield','Enable the off-hours shield',state.settings.shield)+
    pair(field('Work resumes at','resume',state.settings.resume,{type:'time',required:true}),tick('shieldWeekends','Keep the shield on during weekends',state.settings.shieldWeekends))+
    '<div>'+button('Save preferences','submit','','primary')+'</div></form>')+
    panel('Research work hours',button('Work hours settings','work-hours','','secondary'))+
    panel('Back up & export',txt('Workspace data stays in this browser. Use a JSON backup to move it to another device, copy, or browser.','muted')+
    '<div class="inline wrap-inline section-gap">'+button('JSON backup','backup','','primary','download')+button('Restore backup','restore','','secondary')+button('Markdown','markdown-export','','secondary')+
    button('CSV','csv-export','','secondary')+button('BibTeX','bib-export','','secondary')+button('Calendar','calendar-export','','secondary')+button('Academic CV','cv-export','','secondary')+'</div>')+
    panel('Start with a template',txt('The starter data shows a chapter roadmap, micro-tasks, reading, and a supervisor meeting. A blank workspace has the same tools.','muted')+'<div class="inline wrap-inline section-gap">'+button('Start blank','reset','blank','secondary')+button('Load example workspace','reset','sample','secondary')+'</div>')+
    panel('One-week thesis pilot',txt('Try the workflow on a chapter with planned research, a draft, and a supervisor check-in.','muted')+
    '<div class="inline wrap-inline compact">'+button(state.support.pilot?'Open pilot week':'Add a pilot week','pilot-setup','','secondary','map')+pilotFeedbackLink()+'</div>')+
    panel('Off-hours & quick capture',txt('Keep ideas in the capture inbox during off-hours. Set a schedule in Workspace preferences.','muted')+
    '<div class="compact">'+button('Switch off now','shield-now','','secondary','moon')+'</div>')+panel('Offline & connections',txt('The downloaded HTML works offline. The web version is available offline after it loads and caches its files. Zotero sync and source links need a connection.','muted')+
    '<div class="compact">'+button('Zotero sync','zotero','','secondary','link')+'</div>')+'</div>';
}
const views={today:dash,tasks:tasksView,projects:projectsView,roadmap:roadmapView,reading:readingView,pipeline:pipelineView,advisor:advisorView,focus:focusView,log:logView,room:roomView,wellbeing:wellbeingView,settings:settingsView};
function render() {
  refreshBoard(state);
  const nextMode=availableMode();
  if(nextMode==='shield'&&viewMode!=='shield'){
    if(modal.open) closeDialog(true);
    if(room) leaveRoom(false);
    clearTimeout(toastHandle);$('#toast').hidden=true;
  }
  viewMode=nextMode;
  document.body.dataset.fieldnoteApp='true';
  const blockUntil=String(viewMode!=='shield'&&state.focus.status==='running'&&state.focus.mode==='focus'?state.focus.end:0);
  if(document.body.dataset.fieldnoteFocusUntil!==blockUntil) document.body.dataset.fieldnoteFocusUntil=blockUntil;
  document.body.classList.toggle('menu-open',menuOpen);
  document.body.classList.toggle('focus-mode',quiet);
  document.body.classList.toggle('restricted-mode',viewMode!=='normal');
  document.title=(viewMode==='shield'?'Off the clock':viewMode==='incubation'?'Stepping away':viewMode==='research'?'Deep research':pageNames[active])+' · Quod';
  if(viewMode!=='normal'){
    workspace.innerHTML='<main id="main" class="main">'+(viewMode==='shield'?shieldView():viewMode==='incubation'?incubationView(state.support.incubation):researchRoomView())+'</main>';
    return;
  }
  workspace.innerHTML='<div class="shell">'+nav()+'<div class="body">'+header()+
    (menuOpen?'<button class="side-scrim mobile-only" type="button" data-action="menu" aria-label="Close menu"></button>':'')+
    '<main id="main" class="main">'+(!stored?'<div class="callout warning storage-warning">'+e(storageIssue)+'<div class="inline wrap-inline compact">'+button('Download backup','backup','','secondary','download')+(storageRaw!==null&&!loadError?button('Load saved workspace','reload-storage','','secondary'):'')+'</div></div>':'')+views[active]()+'</main></div></div>';
}
function go(page) {
  if (!views[page]||shieldOn()||(researchLock&&page!=='focus')) return;
  active=page;
  menuOpen=false;
  quiet=false;
  render();
  window.scrollTo(0,0);
  $('h1',workspace)?.focus({preventScroll:true});
}
function commit(message,replace=false){save(replace);render();if(message&&stored)notify(message);}


function field(label,name,value='',opts={}) {
  const {type='text',required=false,placeholder='',min,max,maxLength=180,step}=opts;
  return '<label class="field">'+e(label)+'<input type="'+type+'" name="'+name+'"'+attr('value',value)+attr('placeholder',placeholder)+attr('min',min)+attr('max',max)+attr('step',step)+
    (['text','url','password','search','email'].includes(type)?attr('maxlength',maxLength):'')+(required?' required':'')+'></label>';
}
function area(label,name,value='',placeholder='',required=false,rows=3) {
  return '<label class="field">'+e(label)+'<textarea name="'+name+'" rows="'+rows+'" maxlength="20000"'+attr('placeholder',placeholder)+(required?' required':'')+'>'+e(value)+'</textarea></label>';
}
function options(choices,current) {
  return choices.map(choice=>{
    const [key,label]=Array.isArray(choice)?choice:[choice,choice];
    return '<option value="'+e(key)+'"'+(String(key)===String(current??'')?' selected':'')+'>'+e(label)+'</option>';
  }).join('');
}
const select = (label,name,choices,value='') => '<label class="field">'+e(label)+'<select name="'+name+'">'+options(choices,value)+'</select></label>';
const tick = (name,label,on=false) => '<label class="tick"><input type="checkbox" name="'+name+'"'+(on?' checked':'')+'><span>'+e(label)+'</span></label>';
const pair = (a,b) => '<div class="form-pair">'+a+b+'</div>';
const refs = collection => [['','None'],...state[collection].map(x=>[x.id,x.title])];
const submit = label => '<button class="btn primary" type="submit">'+e(label)+'</button>';
const cancel = () => button('Cancel','close','','secondary');
const form = (name,fields,label='Save',extra='',key='') => '<form class="form-grid" data-form="'+name+'"'+attr('data-key',key)+'>'+fields+
  '<p class="error-text" data-error role="alert" hidden></p><div class="form-actions">'+extra+cancel()+submit(label)+'</div></form>';
function dialog(title,body,{locked=false}={}) {
  dialogSession+=1;
  modal.toggleAttribute('data-locked',locked);
  modal.innerHTML='<div class="dialog-head"><h2 id="modal-title">'+e(title)+'</h2>'+(locked?'':iconButton('Close','close','close'))+'</div><div class="dialog-body">'+body+'</div>';
  if(!modal.open) modal.showModal();
  const target=$('input:not([type=checkbox]),textarea,select',modal)||$('.dialog-body button',modal)||$('button',modal);
  target?.focus();
}
function closeDialog(force=false) {
  if(modal.hasAttribute('data-locked')&&force!==true) return;
  const recallDraft=force!==true&&pendingRecall?.fromForm?pendingRecall:null;
  if(modal.open) modal.close();
  modal.removeAttribute('data-locked');document.body.classList.remove('recall-mode');
  dialogSession+=1;pendingImport=null;pendingRecall=null;
  if(recallDraft) editDialog('reading',find('reading',recallDraft.item.id)?.id||'',{...recallDraft.item,stage:recallDraft.previous||'Synthesize'},true);
}
function formError(target,message) {
  const where=$('[data-error]',target);
  if(where){where.textContent=message; where.hidden=false;}
  else notify(message);
}
const fieldNames={tasks:['task','Task'],projects:['project','Project'],milestones:['milestone','Milestone'],reading:['reference','Reference'],notes:['note','Note'],pipeline:['pipeline item','Pipeline item'],meetings:['meeting','Meeting'],logs:['log entry','Log entry'],drafts:['draft','Draft']};
const milestonePurposePrompt=project=>project?'How will this milestone move the project forward?':'Connect this milestone to the purpose of the thesis.';
const prepDefault='42 | Request recommendation letters\n21 | Draft the narrative and budget\n7 | Ask a colleague to review the application';
function editDialog(collection,key='',preset={},isDraft=false) {
  if(!fieldNames[collection]) return;
  const existing=key?find(collection,key):null;
  if(key&&!existing) return;
  const item=isDraft?{...existing,...preset}:{...preset,...existing};
  const [label,headingLabel]=fieldNames[collection];
  let fields=field(collection==='tasks'?'Concrete action':'Title','title',item.title,{required:true,placeholder:collection==='tasks'?'Chapter 2 · three claims to outline':''});
  if(collection==='tasks') fields+=
    pair(select('Role','role',researchLock?['Research']:roles,item.role||'Research'),field('Estimated minutes','minutes',item.minutes??45,{type:'number',min:1,max:720}))+
    (state.projects.length?select('Project','project',[['','Use the milestone’s project, if any'],...refs('projects').slice(1)],item.project):'')+
    taskPlanningFields(item)+
    '<details class="details-options"'+(item.date||item.status==='Waiting'||item.repeat&&item.repeat!=='None'?' open':'')+'><summary>Due dates, links and other details</summary><div class="form-grid">'+
    pair(select('Status','status',taskStages,item.status||'Next'),field('Due or follow-up date','date',item.date,{type:'date'}))+
    pair(select('Roadmap milestone','milestone',refs('milestones'),item.milestone),select('Repeat after completion','repeat',['None','Daily','Weekly','Monthly'],item.repeat||'None'))+
    pair(field('Waiting on','waiting',item.waiting,{placeholder:'Person, feedback, or decision'}),select('CV entry on completion','cvType',[['','None'],...cvKinds],item.cvType))+
    area('Next action or notes','details',item.details,'Open the draft and outline three claims')+'</div></details>'+
    (preset.fromCapture?'<input type="hidden" name="fromCapture" value="'+e(preset.fromCapture)+'">':'');
  if(collection==='projects') fields+=select('Status','status',milestoneStages,item.status||'Planned')+
    area('What do you want this project to produce?','outcome',item.outcome,'A preprint, a chapter draft, or a validated method');
  if(collection==='milestones') fields+=
    pair(field('Target date','date',item.date,{type:'date'}),select('Status','status',milestoneStages,item.status||'Planned'))+
    (state.projects.length?select('Project','project',refs('projects'),item.project):'')+
    select('Type','kind',['Milestone','Chapter'],item.kind||'Milestone')+
    field('Research question','question',item.question,{placeholder:'What are we trying to understand?',maxLength:300})+
    area('Why does this matter?','purpose',item.purpose,milestonePurposePrompt(item.project))+
    area('What counts as done?','details',item.details,'List the criteria, approvals, or deliverables.');
  if(collection==='reading') fields+=
    field('Authors','authors',item.authors,{placeholder:'Separate authors with “and”',maxLength:500})+
    pair(field('Year','year',item.year,{maxLength:20}),select('Triage stage','stage',readStages,item.stage||'To skim'))+
    field('DOI','doi',item.doi,{placeholder:'10.…',maxLength:250})+field('URL','url',item.url,{type:'url',maxLength:1000});
  if(collection==='notes') fields+=
    area('Note','body',item.body,'Claim, citation, limitation, or idea',true)+pair(select('Source paper','paper',refs('reading'),item.paper),select('Chapter or milestone','milestone',refs('milestones'),item.milestone))+
    field('Research question','question',item.question,{maxLength:300});
  if(collection==='pipeline') fields+=
    pair(select('Type','kind',['Publication','Conference','Grant','Fellowship'],item.kind||(pipelineFilter==='Grants & fellowships'?'Grant':'Publication')),
    select('Stage','status',isGrant(item)||(!item.kind&&pipelineFilter==='Grants & fellowships')?grantStages:paperStages,item.status))+
    pair(field('Deadline or follow-up','date',item.date,{type:'date'}),field('Waiting on','waiting',item.waiting,{placeholder:'Reviewers, advisor, or decision'}))+
    area('Notes','details',item.details)+
    '<div data-grant-fields'+(isGrant(item)||(!item.kind&&pipelineFilter==='Grants & fellowships')?'':' hidden')+'>'+area('Prep steps · days before deadline | action','prep',item.prep??prepDefault)+'</div>';
  if(collection==='meetings') fields+=
    pair(field('Date','date',item.date,{type:'date'}),field('Attendees','attendees',item.attendees))+
    area('Questions','questions',item.questions,'What should I prioritize? What counts as done?')+
    area('Materials and links','materials',item.materials,'Figures, drafts, or papers to bring')+
    area('Notes and next actions','notes',item.notes,'Use one line per action to convert it to a task.');
  if(collection==='logs') fields+=
    pair(select('Entry type','kind',logKinds,item.kind||'Effort'),field('Date','date',item.date||today(),{type:'date',required:true}))+
    pair(field('Minutes of effort','minutes',item.minutes,{type:'number',min:0,max:1440}),field('Words written','words',item.words,{type:'number',min:0,max:1000000}))+
    pair(select('Draft','draft',refs('drafts'),item.draft),select('Task','task',refs('tasks'),item.task))+
    select('Role for work hours','role',[['','Use linked task or Research'],...roles],item.role)+
    area('What happened or what did you learn?','details',item.details,'A result, a dead end, or something worth remembering')+
    tick('private','Keep this entry out of weekly digests and CV exports',item.private);
  if(collection==='drafts') fields+=
    pair(select('Stage','status',draftStages,item.status||'Outline'),select('Roadmap milestone','milestone',refs('milestones'),item.milestone))+
    area('Notes','details',item.details);
  const remove=existing?button('Delete','delete',frag(collection,key),'ghost danger'):'';
  const type=taskKind({...item,role:item.role||'Research'});
  const title=collection==='tasks'&&type!=='small'?(existing?'Edit ':'Plan ')+(type==='reading'?'a reading block':'a research block'):(existing?'Edit ':'Add ')+label;
  dialog(title,form('record',fields,'Save '+label,remove,frag(collection,key)));
  if(collection==='tasks')syncTaskGoal($('form',modal));
}
function confirm(title,message,action,value,label) {
  dialog(title,'<div class="form-grid">'+txt(message,'muted')+'<div class="form-actions">'+cancel()+button(label,action,value,'primary')+'</div></div>');
}
function selectedFocus(taskId, fromPlan=false) {
  const f=state.focus;
  if(f.status!=='idle'||state.support.park||state.support.incubation||(taskId&&!focusableTask(find('tasks',taskId)))) return false;
  f.mode='focus'; f.taskId=taskId; f.freeLabel=''; f.elapsed=0;
  const task=find('tasks',taskId);
  f.sessionPreset=task?.fiveMinute?5:fromPlan?num(task?.minutes):0;
  f.remaining=(f.sessionPreset||f.preset)*60;
  return true;
}
function pickFocus(taskId) {
  if(state.focus.status!=='idle') return notify('Finish the current session to change its tag.');
  dialog('Choose a focus task',form('focus-choice',
    select('Task','task',[[ '', 'Untagged focus session' ],...currentPlan().filter(focusableTask).map(t=>[t.id,t.title])],taskId),'Set focus'));
}
function timerSettings() {
  const f=state.focus;
  dialog('Timer settings',form('timer-config',pair(
    field('Focus minutes','preset',f.preset,{type:'number',min:1,max:180,required:true}),
    field('Break minutes','breakPreset',f.breakPreset,{type:'number',min:1,max:60,required:true}))+
    txt('Quiet view hides the workspace. The optional Quod Focus Blocker companion can pause access to sites you choose.','meta'),'Save timer settings'));
}
function startTimer() {
  const f=state.focus;
  if(f.status==='running'||shieldOn()||state.support.incubation) return;
  if(state.support.park) return closeParkDialog();
  const selected=find('tasks',f.taskId);
  if(f.status==='idle'&&f.mode==='focus'){
    if(selected&&!focusableTask(selected)) selectedFocus('');
    else if(selected&&!hasText(selected.title)) return resetPlanDialog(selected.id);
    else if(selected&&dueForReview(selected)) return frictionDialog(selected.id);
    const task=find('tasks',f.taskId);
    f.sessionTitle=task?.title||'Focus session';
    f.sessionRole=roleOfTask(task);
  }
  const now=Date.now();
  f.anchor=now; f.end=now+f.remaining*1000; f.status='running';
  commit();
}
function pauseTimer() {
  const f=state.focus;
  if(f.status!=='running') return;
  const now=Date.now();
  if(now>=f.end) return finishTimer(true);
  f.elapsed+=Math.max(0,now-f.anchor)/1000;
  f.remaining=Math.max(0,(f.end-now)/1000); f.status='paused'; f.anchor=0; f.end=0;
  commit();
}
function pristineTimer(mode) {
  const f=state.focus;
  Object.assign(f,{mode,status:'idle',sessionPreset:0,remaining:(mode==='break'?f.breakPreset:f.preset)*60,elapsed:0,anchor:0,end:0,sessionTitle:'',sessionRole:''});
}
function finishTimer(auto=false) {
  const f=state.focus;
  if(f.status==='idle') return;
  const elapsed=f.elapsed+(f.status==='running'?Math.max(0,Math.min(f.end,Date.now())-f.anchor)/1000:0);
  const isBreak=f.mode==='break';
  if(!isBreak&&elapsed>0) {
    const task=find('tasks',f.taskId);
    const log={id:id(),kind:'Focus',title:f.sessionTitle||task?.title||f.freeLabel||'Focus session',
      date:auto&&f.end?localDate(new Date(f.end)):today(),minutes:Math.max(1,Math.round(elapsed/60)),seconds:elapsed,
      task:f.taskId,role:f.sessionRole||roleOfTask(task),private:(f.sessionRole||roleOfTask(task))==='Personal',
      blockCompleted:!!(auto||f.status==='running'&&Date.now()>=f.end),created:Date.now()};
    state.logs.push(log);
    state.support.park={id:log.id,task:f.taskId};
  }
  pristineTimer(isBreak?'focus':'break');
  commit(isBreak?'Break finished.':elapsed>0?'Focus session saved.':'Focus timer reset.');
  if(state.support.park&&!modal.open&&!shieldOn()) closeParkDialog();
}
function timerTick() {
  const f=focusState();
  if(f.status==='running'&&!f.seconds){finishTimer(true);return;}
  const clock=$('[data-clock]',workspace);
  if(clock&&clock.textContent!==asClock(f.seconds)) clock.textContent=asClock(f.seconds);
}
function nextOccurrence(date,repeat,repeatDay) {
  if(repeat==='Daily') return shift(date,1);
  if(repeat==='Weekly') return shift(date,7);
  const d=dateIn(date), original=repeatDay||d.getDate();
  d.setDate(1); d.setMonth(d.getMonth()+1);
  const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  d.setDate(Math.min(original,last));
  return localDate(d);
}
function setTaskStatus(t,status,previous,announce=true) {
  touchTask(t);
  if(status==='Done')clearDecision(t);
  if(status==='Done'&&previous!=='Done'){
    t.doneDate=today();
    if(t.planDate&&t.planDate!==t.doneDate){t.previousPlanDate=t.planDate;t.planDate='';t.primaryDay='';}
    t.completedEstimate=t.minutes;
    t.completedTag=t.tag||'';
    t.statusBeforeDone=previous==='Waiting'?'Waiting':'Next';
    const record={id:id(),kind:'Task done',title:t.title,date:today(),task:t.id,created:Date.now()};
    t.completion=record.id;
    state.logs.push(record);
    if(cvKinds.includes(t.cvType)) {
      t.cvEntry=id();
      state.logs.push({id:t.cvEntry,kind:t.cvType,title:t.title,date:today(),details:t.details,task:t.id,created:Date.now()});
    }
    if(t.repeat&&t.repeat!=='None'&&!find('tasks',t.spawned)) {
      const scheduled=t.date&&t.date>=today()?t.date:today();
      const repeatDay=t.repeat==='Monthly'?(t.repeatDay||dateIn(scheduled).getDate()):undefined;
      const next={...t,id:id(),status:'Next',date:nextOccurrence(scheduled,t.repeat,repeatDay),repeatDay,planDate:'',startTime:'',primaryDay:'',reviewedDue:'',spawnedFrom:t.id};
      delete next.completion; delete next.cvEntry; delete next.doneDate; delete next.updated; delete next.spawned;
      delete next.actualMinutes;delete next.completedEstimate;delete next.completedTag;delete next.statusBeforeDone;
      t.spawned=next.id;
      state.tasks.push(next);
    }
    if(announce) notify('Completed and added to your research log.');
  }
  if(status!=='Done'&&previous==='Done') {
    state.logs=state.logs.filter(l=>l.id!==t.completion&&l.id!==t.cvEntry);
    delete t.cvEntry;
    const next=find('tasks',t.spawned);
    if(next&&next.spawnedFrom===t.id&&next.status==='Next'&&!next.updated) state.tasks=state.tasks.filter(x=>x.id!==next.id);
    if(!find('tasks',t.spawned)) delete t.spawned;
    delete t.doneDate;delete t.completion;delete t.completedEstimate;delete t.completedTag;delete t.statusBeforeDone;
  }
  t.status=status;
}
function setReadStage(item, previous) {
  if(item.stage==='Synthesized'&&previous!=='Synthesized') {
    const log={id:id(),kind:'Reading',title:item.title,date:today(),paper:item.id,created:Date.now()};
    item.readLog=log.id;
    state.logs.push(log);
  }
  if(previous==='Synthesized'&&item.stage!=='Synthesized') {
    state.logs=state.logs.filter(l=>l.id!==item.readLog);
    delete item.readLog;
  }
}
function grantPrepValid(value) {
  return value.split(/\r?\n/).filter(line=>line.trim()).every(line=>/^\s*\d{1,4}\s*\|\s*\S.*$/.test(line));
}
function saveRecord(formElement,data) {
  const [collection,key]=split(formElement.dataset.key);
  const current=key?find(collection,key):null;
  if(collection==='tasks') requireActionText(data.title);
  else if(!hasText(data.title)) throw Error('Enter a title.');
  const item={...current,...data,id:key||id(),title:data.title.trim(),updated:Date.now()};
  if(collection==='tasks'){
    item.minutes=num(item.minutes);
    item.actualMinutes=num(data.actualMinutes);
    const completedSlot=current?.status==='Done'&&item.status==='Done'&&current.planDate;
    if(completedSlot)Object.assign(item,{planDate:current.planDate,planKind:taskKind(current),role:current.role});
    if(item.planDate&&item.planDate!==current?.planDate&&!validDay(item.planDate)) throw Error('Choose a valid work date.');
    if(taskKind(item)!=='small'&&!researchBlock(item)) throw Error('Choose a maintenance task for this role.');
    if(!current&&taskKind(item)==='deep')checkGoalPlan(item);
    if(item.planDate&&!completedSlot){
      ensureSlot(item,item.planDate);
    }
    if(Boolean(item.obstacle)!==Boolean(item.response)) throw Error('Complete both parts of the if–then plan or clear them.');
    if(item.planDate!==current?.planDate) item.primaryDay='';
    if(item.date!==current?.date) item.reviewedDue='';
    if(item.status==='Next'&&current?.status==='Waiting') item.waiting='';
    if(item.status==='Waiting'&&!item.waiting) throw Error('Name the dependency in “Waiting on”.');
    if(item.status==='Waiting'||item.planDate)clearDecision(item);
    if(item.planDate&&item.date&&item.date<today())item.reviewedDue=item.date;
    if(item.fromCapture){
      const capture=state.support.captures.find(n=>n.id===item.fromCapture);
      if(capture) Object.assign(capture,{archived:true,task:item.id});
      delete item.fromCapture;
    }
    setTaskStatus(item,item.status,current?.status,false);
  }
  if(collection==='milestones')recordMilestone(item,current);
  if(collection==='reading'){
    if(item.url&&!safeUrl(item.url)) throw Error('Enter an HTTP or HTTPS link.');
    if(item.stage==='Synthesized'&&current?.stage!=='Synthesized') return recallDialog(item,current?.stage||'',true);
    setReadStage(item,current?.stage);
  }
  if(collection==='pipeline'){
    const statuses=isGrant(item)?grantStages:paperStages;
    if(!statuses.includes(item.status)) throw Error('Choose a valid stage.');
    if(isGrant(item)&&item.prep&&!grantPrepValid(item.prep)) throw Error('Each prep step needs “days | action”, such as “42 | Request letters”.');
    if(!isGrant(item)){delete item.prep;delete item.prepDone;}
    else if(Array.isArray(item.prepDone)&&item.date) item.prepDone=item.prepDone.filter(key=>prepEntries(item).some(step=>step.key===key));
  }
  if(collection==='logs'){
    item.minutes=num(item.minutes); item.words=num(item.words); item.private=data.private==='on'; item.created=current?.created||Date.now();
    if(item.minutes!==num(current?.minutes)) delete item.seconds;
  }
  if(current) state[collection]=state[collection].map(x=>x.id===key?item:x);
  else state[collection].push(item);
  closeDialog();
  commit(fieldNames[collection][1]+' saved.');
}
function openDecompose(milestone='') {
  dialog('Break down a goal',form('decompose',field('Larger goal','goal',find('milestones',milestone)?.title,{required:true,placeholder:'Write Chapter 2 literature review'})+
    pair(select('Roadmap milestone','milestone',refs('milestones'),milestone),select('Role','role',roles,'Research'))+
    area('One next action per line','steps','','Open the outline and list three claims\nSummarize the first paper in two sentences',true)+
    pair(field('Minutes for each step','minutes',45,{type:'number',min:1,max:180,required:true}),field('First step work date','date','',{type:'date'}))+
    tick('today','Put the first step in today’s plan',false)+
    select('Block type for the first step','planKind',dayKinds,'deep')+
    goalFields({},{title:'Goal setup when planning a research block'}),'Save actions to Horizon'));
  syncTaskGoal($('form',modal));
}
function shutdownDialog() {
  if(state.support.park) return closeParkDialog();
  if(state.focus.mode==='focus'&&state.focus.status!=='idle'){
    go('focus');
    return notify('Finish and park the focus session before closing the day.');
  }
  const last=state.logs.find(item=>item.kind==='Shutdown'&&item.date===today());
  const previousReturn=state.logs.filter(l=>l.date===today()&&l.kind==='Focus'&&l.returnTask).sort(recentOrder)
    .map(l=>find('tasks',l.returnTask)).find(t=>t?.status==='Next'&&!t.archivedAt);
  const savedReturn=find('tasks',last?.returnTask);
  const candidate=savedReturn?.status==='Next'&&!savedReturn.archivedAt?savedReturn:previousReturn;
  dialog('Close the day',form('shutdown',txt('Leave yourself an easy place to begin when you return.','muted')+
    area('What moved or what did you learn?','progress',last?.progress,'Even a path you ruled out counts.')+
    (candidate?txt('Your parked return plan is ready to reuse.','meta'):'')+returnOptions(candidate,candidate?.id||'')+
    field('What’s the next small step?','next',candidate?.title||last?.next,{placeholder:'Open the introduction and mark the paragraph to revise',required:true})+
    pair(field('Return date','date',candidate?.planDate>=today()?candidate.planDate:suggestedReturnDay(),{type:'date',required:true}),field('Return time','time',candidate?.startTime||suggestedReturnTime(),{type:'time',required:true}))+
    field('Where or how will you return?','cue',candidate?.returnCue||last?.cue,{placeholder:'At my desk with the notebook open'})+
    parkedGoalFields(candidate,null)+tick('switchOff','Switch to quick capture for the rest of the day',false),last?'Save shutdown':'Finish for today'));
}
function reflectionDialog() {
  dialog('Reflect privately',form('reflection',txt('Take a moment if it would help. You can leave either prompt blank.','muted')+
    area('What would you say to a colleague here?','perspective','','Name one thing they’ve learned or already tried.')+
    area('Who could help clarify the next step?','support','','A peer, advisor, or someone in your program.'),'Save reflection'));
}
function digest(period='') {
  const prior=period==='last-week';
  const start=prior?shift(startOfWeek(),-7):startOfWeek();
  const end=prior?shift(startOfWeek(),-1):today();
  const week=state.logs.filter(x=>x.date>=start&&x.date<=end&&!x.private);
  const words=week.reduce((sum,x)=>sum+num(x.words),0);
  const reads=week.filter(x=>x.kind==='Reading');
  const tasks=week.filter(x=>x.kind==='Task done'&&find('tasks',x.task)?.role!=='Personal');
  const pending=state.tasks.filter(t=>!t.archivedAt&&t.status==='Waiting'&&t.role!=='Personal');
  const meeting=[...state.meetings].sort(dateOrder).find(m=>m.date>=today());
  const content=['Weekly research update · '+displayDate(start,{month:'long',day:'numeric',year:'numeric'}),
    '', 'Hi,','', (prior?'Last week I worked on the following.':'This week I worked on the following.'),'',
    ...tasks.map(t=>'- Completed '+t.title),
    ...week.filter(l=>['Milestone done','Chapter cleared'].includes(l.kind)).map(l=>'- '+l.kind+' · '+l.title),
    ...(words?['- Wrote '+words.toLocaleString()+' words.']:[]),
    ...reads.map(r=>'- Synthesized '+r.title),
    ...(pending.length?['','Waiting on',...pending.map(t=>'- '+t.title+(t.waiting?' · '+t.waiting:''))]:[]),
    ...(meeting?.questions?['','Questions for our next meeting',meeting.questions]:[]),'','Best,',state.settings.name].join('\n');
  dialog('Weekly progress digest','<div class="form-grid">'+txt('Review this draft before sharing. Edit the text or copy it into an email.','muted')+
    '<div class="inline wrap-inline">'+button('This week','digest','','secondary')+button('Last week','digest','last-week','secondary')+'</div>'+area('Draft update','digest-copy',content,'',false,14)+'<div class="form-actions">'+cancel()+button('Copy update','copy-digest','','primary','check')+'</div></div>');
}
function actionLines(notes) {
  return notes.split(/\r?\n/).map(line=>line.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)?(?:\[[ xX]\]\s*)?/,'').trim()).filter(Boolean);
}
function extractDialog(key) {
  const m=find('meetings',key);
  const lines=[...new Set(actionLines(m.notes))].filter(line=>!arr(m.extracted).includes(line));
  if(!lines.length) return notify('All note lines have already been converted into tasks.');
  dialog('Convert meeting notes',form('extract',txt('Select the lines to turn into tasks. You can edit them afterward.','muted')+
    lines.map((line,i)=>tick('line-'+i,line,false)).join(''),'Create tasks','',key));
}


function download(name,content,type='text/plain;charset=utf-8') {
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url; link.download=name; document.body.append(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
const exportName = suffix => 'quod-'+today()+suffix;
const markdownLine = text => String(text??'').replace(/\r?\n/g,' ').trim();
function markdownExport() {
  const sections=[['Projects','projects'],['Roadmap','milestones'],['Tasks','tasks'],['Reading queue','reading'],['Linked notes','notes'],['Academic pipeline','pipeline'],['Advisor meetings','meetings'],['Research log','logs'],['Drafts','drafts'],['Quick captures','captures']];
  const titleMap={project:'projects',milestone:'milestones',task:'tasks',paper:'reading',draft:'drafts'};
  const labels={details:'Notes',doneDate:'Completed',rest:'Rest',url:'URL',doi:'DOI'};
  const ignored=new Set(['id','title','created','updated','completion','spawned','spawnedFrom','readLog','cvEntry','bib','zotero','extracted','progress','next','cue']);
  const lines=['# Quod workspace','', 'Exported '+today(), '', 'Weekly word goal · '+state.settings.goal,
    'Shutdown · '+state.settings.shutdown, 'Writing rest days · '+state.rest.join(', '), ''];
  for(const [title,collection] of sections) {
    lines.push('## '+title,'');
    for(const item of (collection==='captures'?state.support.captures:state[collection])){
      lines.push('### '+markdownLine(item.title),'');
      for(const [key,value] of Object.entries(item)) {
        if(ignored.has(key)||value===''||value===undefined||value===null||value===false||value===0) continue;
        const actual=titleMap[key]?find(titleMap[key],value)?.title||value:value;
        const label=labels[key]||key[0].toUpperCase()+key.slice(1);
        lines.push('**'+label+'**', '', String(actual), '');
      }
    }
  }
  download(exportName('.md'),lines.join('\n'),'text/markdown;charset=utf-8');
}
function csvExport() {
  function csv(value) {
    const raw=String(value??'');
    const safe=/^[\s\uFEFF]*[=+\-@]/.test(raw)||/^[\t\r\n]/.test(raw)?"'"+raw:raw;
    return '"'+safe.replaceAll('"','""')+'"';
  }
  const rows=[];
  for(const collection of collections) for(const item of state[collection]) {
    rows.push({collection,...Object.fromEntries(Object.entries(item).filter(([key])=>key!=='zotero').map(([key,value])=>[key,typeof value==='object'?JSON.stringify(value):value]))});
  }
  for(const item of state.support.captures) rows.push({collection:'captures',...item});
  for(const date of state.rest) rows.push({collection:'rest',date});
  const columns=[...new Set(['collection','id','title','date','kind','status','role','minutes','words',...rows.flatMap(Object.keys)])];
  download(exportName('.csv'),'\uFEFF'+[columns.map(csv).join(','),...rows.map(row=>columns.map(key=>csv(row[key])).join(','))].join('\r\n'),'text/csv;charset=utf-8');
}
function cvExport() {
  const lines=['# '+(state.settings.name?markdownLine(state.settings.name)+' · ':'')+'Academic CV',''];
  for(const kind of cvKinds) {
    const entries=state.logs.filter(x=>x.kind===kind&&!x.private).sort(recentOrder);
    if(entries.length) lines.push('## '+kind,'',...entries.map(x=>'- '+markdownLine(x.title)+' ('+x.date+')'+(x.details?' · '+markdownLine(x.details):'')),'');
  }
  download(exportName('-cv.md'),lines.join('\n'),'text/markdown;charset=utf-8');
}
function calendarExport() {
  const entries=deadlineEntries().filter(x=>x.date>=today());
  if(!entries.length) return notify('There are no upcoming deadlines or prep steps to export.');
  const escape=value=>String(value).replace(/[\\,;]/g,'\\$&').replace(/\r?\n/g,'\\n');
  function fold(line) {
    let count=0, out='';
    for(const char of line) {
      const bytes=new TextEncoder().encode(char).length;
      if(count+bytes>75){out+='\r\n ';count=1;}
      out+=char; count+=bytes;
    }
    return out;
  }
  const stamp=new Date().toISOString().replace(/[-:]|\.\d{3}/g,'');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Quod//PhD workspace//EN','CALSCALE:GREGORIAN'];
  for(const x of entries) {
    const title=escape(x.title+' · '+x.item.title);
    lines.push('BEGIN:VEVENT','UID:'+escape(encodeURIComponent(x.item.id)+'-'+encodeURIComponent(x.key))+'@fieldnote.local','DTSTAMP:'+stamp,
      'DTSTART;VALUE=DATE:'+x.date.replaceAll('-',''),'SUMMARY:'+title,
      'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+title,'TRIGGER:-PT15H','END:VALARM','END:VEVENT');
  }
  lines.push('END:VCALENDAR','');
  download(exportName('-reminders.ics'),lines.map(fold).join('\r\n'),'text/calendar;charset=utf-8');
  notify('Import the calendar file to enable reminders in your calendar app.');
}
function parseBib(text) {
  const results=[], preamble=[];
  let index=0;
  while(index<text.length) {
    if(/^\s*%/.test(text.slice(index,index+200))&&text[index]!=='@'){
      const end=text.indexOf('\n',index); if(end<0) break; index=end+1; continue;
    }
    const match=/(?<!\S)@([A-Za-z]+)\s*([({])/g;
    match.lastIndex=index;
    const entry=match.exec(text);
    if(!entry) break;
    const start=entry.index;
    const lineStart=text.lastIndexOf('\n',start-1)+1;
    if(text.slice(lineStart,start).trimStart().startsWith('%')) {
      index=text.indexOf('\n',start)+1;
      if(!index) break;
      continue;
    }
    const type=lower(entry[1]), close=entry[2]==='{'?'}':')';
    let depth=0, quoted=false, end=match.lastIndex;
    for(;end<text.length;end+=1) {
      const ch=text[end];
      if(ch==='\\'){end+=1;continue;}
      if(ch==='"'&&depth===0) quoted=!quoted;
      if(ch==='{') depth+=1;
      if(!quoted&&ch===close&&depth===0) break;
      if(ch==='}') depth-=1;
    }
    if(end>=text.length) throw Error('A BibTeX entry is missing its closing bracket.');
    const raw=text.slice(start,end+1), body=text.slice(match.lastIndex,end);
    index=end+1;
    if(['string','preamble','comment'].includes(type)){if(type!=='comment')preamble.push(raw);continue;}
    const first=body.indexOf(',');
    if(first===-1) continue;
    const key=body.slice(0,first).trim();
    const fields={};
    let cursor=first+1;
    while(cursor<body.length){
      const found=/^[\s,]*([a-zA-Z][\w:-]*)\s*=\s*/.exec(body.slice(cursor));
      if(!found) break;
      cursor+=found[0].length;
      const startValue=cursor;
      let braces=0,inQuote=false;
      for(;cursor<body.length;cursor+=1){
        const ch=body[cursor];
        if(ch==='\\'){cursor+=1;continue;}
        if(ch==='"'&&braces===0) inQuote=!inQuote;
        if(ch==='{') braces+=1;
        if(ch==='}') braces-=1;
        if(ch===','&&braces===0&&!inQuote) break;
      }
      fields[lower(found[1])]=body.slice(startValue,cursor).trim();
      cursor+=1;
    }
    function plain(value='') {
      const trimmed=value.replace(/^\s*[{"]|[}"]\s*$/g,'');
      return trimmed.replace(/(?<!\\)[{}]/g,'').replace(/\\([&_%#$])/g,'$1').replace(/\s+/g,' ').trim();
    }
    results.push({id:id(),title:plain(fields.title)||key||'Untitled reference',authors:plain(fields.author),year:plain(fields.year),doi:plain(fields.doi),url:plain(fields.url),stage:'To skim',bib:{key,type,fields,preamble}});
  }
  return results;
}
function bibExport() {
  const seen=new Set();
  const macros=new Set();
  const encode=value=>String(value).replace(/[\\{}%&_$#]/g,ch=>ch==='\\'?'\\textbackslash{}':'\\'+ch).replace(/\r?\n/g,' ');
  const standard={title:'title',authors:'author',year:'year',doi:'doi',url:'url'};
  const entries=state.reading.map(r=>{
    for(const line of arr(r.bib?.preamble)) macros.add(line);
    const stem=(r.bib?.key||r.title.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,20)+(r.year||'')).replace(/[^a-zA-Z0-9_:./-]/g,'')||'reference';
    let key=stem;
    for(let n=2;seen.has(lower(key));n+=1) key=stem+n;
    seen.add(lower(key));
    const fields={...r.bib?.fields};
    for(const [property,fieldName] of Object.entries(standard)) {
      if(r.bib&&Object.hasOwn(fields,fieldName)&&r.bib.initial?.[property]===r[property]) continue;
      if(r[property]) fields[fieldName]='{'+encode(r[property])+'}';
      else delete fields[fieldName];
    }
    const type=/^[a-z]+$/i.test(r.bib?.type||'')?r.bib.type:'misc';
    return '@'+type+'{'+key+',\n'+Object.entries(fields).filter(([name])=>/^[a-z][\w:-]*$/i.test(name)).map(([name,value])=>'  '+name+' = '+value).join(',\n')+'\n}';
  });
  download(exportName('.bib'),[...macros,...entries].join('\n\n')+'\n','application/x-bibtex;charset=utf-8');
}
function importBib(text) {
  const entries=parseBib(text);
  if(!entries.length) throw Error('No references were found in this BibTeX file.');
  const byKey=new Set(state.reading.filter(r=>r.bib?.key).map(r=>lower(r.bib.key)));
  const byDoi=new Set(state.reading.map(r=>lower(r.doi||'')).filter(Boolean));
  const byTitle=new Set(state.reading.map(r=>lower(r.title).trim()));
  let imported=0;
  for(const entry of entries) {
    const title=lower(entry.title).trim(), doi=lower(entry.doi||''), key=lower(entry.bib.key);
    if((doi&&byDoi.has(doi))||(key&&byKey.has(key))||byTitle.has(title)) continue;
    entry.bib.initial=Object.fromEntries(['title','authors','year','doi','url'].map(k=>[k,entry[k]]));
    state.reading.push(entry); imported+=1;
    if(key)byKey.add(key);
    if(doi)byDoi.add(doi);
    byTitle.add(title);
  }
  return imported;
}
function fileDialog(kind) {
  const bib=kind==='bib';
  dialog(bib?'Import BibTeX':'Restore a backup',form(bib?'bib-load':'restore-load',
    txt(bib?'Import references exported by a reference manager. Existing matches are skipped.':'Choose a Quod JSON backup. You’ll review before replacing your workspace.','muted')+
    '<label class="field">'+(bib?'BibTeX file':'Backup file')+'<input type="file" name="file" accept="'+(bib?'.bib,text/plain':'.json,application/json')+'" required></label>',
    bib?'Import references':'Review backup'));
}
function zoteroDialog() {
  const local=state.reading.filter(r=>!r.zotero).length;
  dialog('Zotero sync',form('zotero',
    txt('Enter your Zotero user ID and an API key for your personal library. The key stays in memory until you reload or disconnect.','muted')+
    field('Numeric Zotero user ID','user',zoteroAuth?.user,{required:true})+
    field('Zotero API key','key',zoteroAuth?.key,{type:'password',required:true,maxLength:180})+
    '<div>'+external('Manage Zotero API keys','https://www.zotero.org/settings/keys')+'</div>'+
    txt('Pull updates citation records from Zotero. Send triage writes only Quod stage tags to linked items. Add unlinked references creates new items.','meta')+
    '<div class="inline wrap-inline">'+button('Send triage','zotero-push','','secondary','link')+
    (local?button('Add unlinked references ('+local+')','zotero-create','','secondary','plus'):'')+
    (zoteroAuth?button('Disconnect','zotero-disconnect','','ghost'):'')+'</div>',
    'Pull from Zotero'));
}
function getZoteroAuth(data) {
  if(!/^\d+$/.test(data.user)||!data.key) throw Error('Enter a numeric Zotero user ID and an API key.');
  return {user:data.user,key:data.key};
}
async function zoteroRequest(auth,path, opts={}) {
  const {headers={},...rest}=opts;
  let response;
  try {
    response=await fetch('https://api.zotero.org/users/'+auth.user+path,{...rest,headers:{'Zotero-API-Version':'3','Zotero-API-Key':auth.key,...headers},signal:AbortSignal.timeout(25000)});
  } catch {throw Error('Couldn’t reach Zotero. Check your connection and try again.');}
  if(response.status===401||response.status===403) throw Error('Zotero denied access. Check the account and key permissions.');
  if(response.status===412) return response;
  if(!response.ok) throw Error('Zotero returned HTTP '+response.status+'. Try again later.');
  return response;
}
const zotPrefix='Quod: ';
const zotPrefixes=[zotPrefix,'Fieldnote: '];
function remoteStage(tags) {
  for(const prefix of zotPrefixes) {
    const stage=arr(tags).map(x=>String(x.tag||'')).filter(tag=>tag.startsWith(prefix)).map(tag=>tag.slice(prefix.length)).find(tag=>readStages.includes(tag));
    if(stage)return stage;
  }
  return '';
}
function zoteroFields(data) {
  return {title:data.title,authors:arr(data.creators).map(c=>c.name||[c.lastName,c.firstName].filter(Boolean).join(', ')).filter(Boolean).join(' and '),
    year:(String(data.date||'').match(/\b\d{4}\b/)||[])[0]||'',doi:data.DOI||'',url:safeUrl(data.url)};
}
async function pullZotero(auth) {
  const workspaceState=state, remote=[];
  for(let start=0;;start+=100) {
    const resp=await zoteroRequest(auth,'/items/top?format=json&limit=100&start='+start);
    const batch=await resp.json();
    if(!Array.isArray(batch)) throw Error('Zotero returned an unexpected library response.');
    remote.push(...batch.filter(x=>x.data?.title&&!['note','attachment','annotation'].includes(x.data.itemType)));
    if(batch.length<100) break;
  }
  if(state!==workspaceState) throw Error('The workspace changed while Zotero was loading. Try again.');
  let imported=0, updated=0, conflicts=0;
  for(const x of remote){
    const fields=zoteroFields(x.data), stage=remoteStage(x.data.tags);
    let local=state.reading.find(r=>r.zotero?.user===auth.user&&r.zotero?.key===x.key);
    const wasLinked=Boolean(local);
    if(!local) local=state.reading.find(r=>!r.zotero&&(fields.doi?lower(r.doi||'')===lower(fields.doi):lower(r.title)===lower(fields.title)));
    if(!local) {
      local={...fields,id:id(),stage:'To skim'};
      state.reading.push(local); imported+=1;
    } else updated+=1;
    const old=local.stage, base=local.zotero?.base||'';
    if(stage&&wasLinked&&stage!==base&&old!==stage&&old!==base) conflicts+=1;
    else if(stage&&(!wasLinked||stage!==base)) local.stage=stage;
    Object.assign(local,fields,{zotero:{user:auth.user,key:x.key,version:x.version,base:stage}});
    setReadStage(local,old);
  }
  return imported+' imported, '+updated+' updated'+(conflicts?', '+conflicts+' conflicting remote stages kept local':'')+'.';
}
async function writeZotero(auth, create) {
  const queue=state.reading.filter(r=>create?!r.zotero:r.zotero?.user===auth.user&&r.stage!==r.zotero.base);
  let updated=0, conflicts=0;
  for(const r of queue) {
    if(create){
      const token=Array.from(crypto.getRandomValues(new Uint8Array(16)),byte=>byte.toString(16).padStart(2,'0')).join('');
      const payload={itemType:'journalArticle',title:r.title,date:r.year||'',DOI:r.doi||'',url:r.url||'',tags:[{tag:zotPrefix+r.stage}],
        creators:String(r.authors||'').split(/\s+and\s+/i).map(author=>author.trim()).filter(Boolean).map(author=>{
          const comma=author.indexOf(',');
          return comma<0?{creatorType:'author',name:author}:{creatorType:'author',lastName:author.slice(0,comma).trim(),firstName:author.slice(comma+1).trim()};
        })};
      const response=await zoteroRequest(auth,'/items',{method:'POST',headers:{'Content-Type':'application/json','Zotero-Write-Token':token},body:JSON.stringify([payload])});
      const result=await response.json(), item=result.successful?.['0'];
      if(!item?.key) throw Error('Zotero couldn’t add “'+r.title+'”. '+(result.failed?.['0']?.message||''));
      r.zotero={user:auth.user,key:item.key,version:item.version,base:r.stage};
    } else {
      const path='/items/'+encodeURIComponent(r.zotero.key);
      const response=await zoteroRequest(auth,path+'?format=json');
      const item=await response.json(), remote=remoteStage(item.data.tags);
      if(remote!==r.zotero.base&&remote!==r.stage){conflicts+=1;continue;}
      if(remote!==r.stage){
        const tags=arr(item.data.tags).filter(x=>!zotPrefixes.some(prefix=>String(x.tag).startsWith(prefix)&&readStages.includes(String(x.tag).slice(prefix.length))));
        const write=await zoteroRequest(auth,path,{method:'PATCH',headers:{'If-Unmodified-Since-Version':String(item.version),'Content-Type':'application/json'},body:JSON.stringify({tags:[...tags,{tag:zotPrefix+r.stage}]})});
        if(write.status===412){conflicts+=1;continue;}
      }
      r.zotero.base=r.stage;
    }
    updated+=1;
    save();
  }
  return updated+' '+(create?'added to Zotero':'triage tags synced')+(conflicts?', '+conflicts+' conflicts skipped. Pull to review before sending again.':'.');
}
async function zoteroOperation(formElement, operation) {
  const data=readForm(formElement), auth=getZoteroAuth(data), session=dialogSession;
  const controls=[...formElement.querySelectorAll('button')];
  controls.forEach(control=>{control.disabled=true;});
  formError(formElement,'Working with Zotero…');
  try {
    const message=operation==='pull'?await pullZotero(auth):await writeZotero(auth,operation==='create');
    if(session===dialogSession&&modal.open){zoteroAuth=auth;closeDialog();}
    commit(message);
  } catch(error) {
    if(session===dialogSession&&modal.open) formError(formElement,error.message);
    else notify(error.message);
    render();
  } finally {controls.forEach(control=>{control.disabled=false;});}
}


function readForm(element) {
  return Object.fromEntries([...new FormData(element)].map(([key,value])=>[key,typeof value==='string'?value.trim():value]));
}
async function handleSubmit(target) {
  const method=target.dataset.form;
  const data=readForm(target);
  if(await quodSubmit(method,target,data)) return;
  if(await supportSubmit(method,target,data)) return;
  if(method==='record') return saveRecord(target,data);
  if(method==='work-hours'||method==='work-day') return saveWorkHours(method,target,data);
  if(method==='settings'){
    if(data.shield==='on'&&data.shutdown===data.resume) throw Error('Choose different shield and resume times.');
    state.settings={name:data.name,goal:num(data.goal),shutdown:data.shutdown,weekends:data.weekends==='on',shield:data.shield==='on',resume:data.resume,shieldWeekends:data.shieldWeekends==='on'};
    if(shieldOn()) leaveRoom(false);
    return commit('Preferences saved.');
  }
  if(method==='decompose'){
    const steps=actionLines(data.steps);
    if(!steps.length) throw Error('Add at least one next action.');
    if(steps.length>50) throw Error('Use up to 50 steps at a time.');
    const date=data.date||(data.today==='on'?today():'');
    const actions=steps.map((title,index)=>({id:id(),title:title.slice(0,180),details:'Part of: '+data.goal,minutes:num(data.minutes),
      role:data.role,milestone:data.milestone,status:'Next',planDate:index===0?date:'',lastTouched:today(),
      planKind:data.planKind,...(index===0?{doneLooks:data.doneLooks,obstacle:data.obstacle,response:data.response}:{})}));
    ensureSlot(actions[0],date);
    state.tasks.push(...actions);
    closeDialog();
    return commit('Actions saved.');
  }
  if(method==='focus-choice'){
    const task=find('tasks',data.task);
    if(task&&!canWork(task)){resetPlanDialog(task.id);return;}
    if(task&&dueForReview(task)){frictionDialog(task.id);return;}
    if(task&&!hasText(task.title)){resetPlanDialog(task.id);return;}
    if(!selectedFocus(data.task,true)) throw Error('Finish the current session to change its tag.');
    closeDialog(); return commit('Focus selected.');
  }
  if(method==='timer-config'){
    const f=state.focus;
    f.preset=num(data.preset); f.breakPreset=num(data.breakPreset);
    if(f.status==='idle') pristineTimer(f.mode);
    closeDialog();return commit('Timer settings saved.');
  }
  if(method==='shutdown'){
    const last=state.logs.find(x=>x.kind==='Shutdown'&&x.date===today());
    const details=[data.progress,data.next?'Next step · '+data.next:'',data.cue?'Return cue · '+data.cue:''].filter(Boolean).join('\n');
    const task=scheduleReturn(data,null);
    const item={id:last?.id||id(),kind:'Shutdown',title:'Daily shutdown',date:today(),details,progress:data.progress,next:data.next,cue:data.cue,returnTask:task.id,returnDate:data.date,returnTime:data.time,returnInHorizon:!task.planDate,created:last?.created||Date.now(),private:true};
    if(last) Object.assign(last,item); else state.logs.push(item);
    closeDialog();
    if(data.switchOff==='on'){manualShield();return;}
    return commit(task.planDate?'Day closed.':'Day closed. Return cue saved in Horizon.');
  }
  if(method==='reflection'){
    const details=[data.perspective,data.support?'Support · '+data.support:''].filter(Boolean).join('\n\n');
    if(!details) throw Error('Write a thought or close the reflection.');
    state.logs.push({id:id(),kind:'Reflection',title:'Private reflection',date:today(),details,private:true,created:Date.now()});
    closeDialog();return commit('Reflection saved privately.');
  }
  if(method==='extract'){
    const m=find('meetings',target.dataset.key);
    const lines=[...new Set(actionLines(m.notes))].filter(line=>!arr(m.extracted).includes(line));
    const chosen=lines.filter((_,i)=>data['line-'+i]==='on');
    if(!chosen.length) throw Error('Select at least one line.');
    for(const title of chosen) state.tasks.push({id:id(),title:title.slice(0,180),role:'Research',status:'Next',minutes:30,lastTouched:today(),details:'From advisor meeting · '+m.title});
    m.extracted=[...arr(m.extracted),...chosen];
    closeDialog();return commit('Meeting actions saved in Horizon.');
  }
  if(method==='rest-date'){
    if(!state.rest.includes(data.date)) state.rest.push(data.date);
    closeDialog();return commit('Rest day saved.');
  }
  if(method==='zotero') return performZotero(target,'pull');
  if(method==='bib-load'||method==='restore-load'){
    if(!data.file?.size) throw Error('Choose a file to continue.');
    if(data.file.size>25_000_000) throw Error('Choose a file smaller than 25 MB.');
    const session=dialogSession;
    const contents=(await data.file.text()).replace(/^\uFEFF/,'');
    if(session!==dialogSession||!modal.open) return;
    if(method==='bib-load'){
      const added=importBib(contents);
      closeDialog();return commit(added?added+' '+(added===1?'reference':'references')+' imported.':'These references are already in your queue.');
    }
    const backup=validated(JSON.parse(contents));
    confirm('Replace this workspace?','This backup has '+backup.tasks.length+' tasks, '+backup.reading.length+' references, and '+backup.logs.length+' log entries. Replacing will remove the data you currently see.','restore-confirm','','Restore workspace');
    pendingImport=backup;
  }
}
document.addEventListener('submit',event=>{
  const target=event.target;
  if(!target.matches('[data-form]')) return;
  event.preventDefault();
  const notice=$('[data-error]',target);
  if(notice) notice.hidden=true;
  clearGoalError(target);
  handleSubmit(target).catch(error=>{
    if(error instanceof GoalPlanError&&showGoalError(target,error)) return;
    formError(target,error.message||'Could not save this change.');
  });
});
document.addEventListener('input',event=>{
  const input=event.target;
  if(input.matches('[aria-describedby="goal-field-error"]')&&hasText(input.value)) clearGoalError(input.form);
});
async function copyDigest() {
  const field=$('[name="digest-copy"]',modal);
  try{await navigator.clipboard.writeText(field.value);}
  catch{
    field.select();
    if(!document.execCommand('copy')){notify('The draft is selected. Use your device’s copy command.');return;}
  }
  notify('Weekly update copied.');
}
function toggleTask(key) {
  const task=find('tasks',key);
  if(task&&!task.archivedAt) {
    const old=task.status;
    const next=old==='Done'?(task.statusBeforeDone==='Waiting'&&task.waiting?'Waiting':'Next'):'Done';
    setTaskStatus(task,next,old,false);
    commit(task.status==='Done'?'Completed and added to your research log.':'Task reopened.');
  }
}
function moveCard(key,status) {
  const item=find('pipeline',key);
  if(item&&(isGrant(item)?grantStages:paperStages).includes(status)) {
    item.status=status;
    item.updated=Date.now();
    commit(item.title+' moved to '+status+'.');
  }
}
let zoteroBusy=false;
function performZotero(element,operation){
  if(!element||zoteroBusy) return;
  zoteroBusy=true;
  zoteroOperation(element,operation).catch(error=>formError(element,error.message)).finally(()=>{zoteroBusy=false;});
}
function quick() {
  const choices=[['Task','tasks','plus'],['Milestone','milestones','flag'],['Reference','reading','book'],['Linked note','notes','link'],['Pipeline item','pipeline','columns'],['Advisor meeting','meetings','people'],['Log entry','logs','journal'],['Draft','drafts','edit']];
  dialog('Quick add','<div class="stats">'+choices.map(([label,name,icon])=>button(label,'new',name,'secondary',icon)).join('')+'</div>');
}
const actions={
  ...quodActions,
  ...supportActions,
  page:go,
  menu:()=>{menuOpen=!menuOpen;render();$('.menu-toggle',workspace)?.focus();},
  quick,
  new:value=>editDialog(value),
  edit:value=>editDialog(...split(value)),
  close:closeDialog,
  submit:(_value,buttonElement)=>buttonElement.closest('form')?.requestSubmit(),
  'role-filter':value=>{taskFilter.role=value;render();},
  'task-filter':value=>{taskFilter.stage=value;render();},
  'read-filter':value=>{readFilter=value;render();},
  'pipeline-filter':value=>{pipelineFilter=value;render();},
  'log-filter':value=>{logFilter=value;render();},
  'pick-focus':pickFocus,
  'focus-task':openFocusTask,
  'toggle-task':toggleTask,
  'project-milestone':value=>editDialog('milestones','',{project:value}),
  'project-action':value=>editDialog('tasks','',{project:value}),
  'work-hours':workHoursDialog,
  'work-day':workDayDialog,
  'milestone-task':value=>editDialog('tasks','',{milestone:value}),
  'milestone-tasks':value=>{
    const milestone=find('milestones',value);
    dialog(milestone.title,state.tasks.filter(t=>!t.archivedAt&&t.milestone===value).map(t=>taskRow(t,true)).join(''));
  },
  'paper-note':value=>editDialog('notes','',{paper:value}),
  'plan-reading':key=>{
    const paper=find('reading',key);
    if(paper) editDialog('tasks','',{title:paper.title.slice(0,180),role:'Research',planKind:'reading',minutes:defaultBlockMinutes(today(),30),planDate:today(),paper:key,milestone:paper.reviewMilestone});
  },
  decompose:openDecompose,
  shutdown:shutdownDialog,
  reflect:reflectionDialog,
  digest,
  'copy-digest':copyDigest,
  extract:extractDialog,
  'grant-checklist':grantChecklist,
  'prep-toggle':value=>{
    const [key,step]=split(value), item=find('pipeline',key);
    if(!item||!prepEntries(item).some(row=>row.key===step)) return;
    const done=arr(item.prepDone);
    item.prepDone=done.includes(step)?done.filter(x=>x!==step):[...done,step];
    commit();grantChecklist(key);
  },
  'timer-settings':timerSettings,
  'rest-date':()=>dialog('Mark a rest day', form('rest-date',field('Date','date',today(),{type:'date',required:true}),'Save rest day')),
  rest:()=>{
    const date=today();
    const had=state.rest.includes(date);
    state.rest=had?state.rest.filter(x=>x!==date):[...state.rest,date];
    commit(had?'Rest day removed.':'Rest day saved.');
  },
  writing:()=>editDialog('logs','',{kind:'Writing'}),
  effort:()=>editDialog('logs','',{kind:'Effort'}),
  duration:value=>{
    const f=state.focus;
    if(f.status!=='idle') return;
    const key=f.mode==='break'?'breakPreset':'preset';
    f[key]=Number(value);f.remaining=f[key]*60;
    if(f.mode!=='break') f.sessionPreset=0;
    commit();
  },
  start:startTimer,
  pause:pauseTimer,
  stop:()=>finishTimer(),
  'skip-break':()=>{pristineTimer('focus');commit();},
  quiet:()=>{
    if(quiet){const returnTo=focusReturn||'focus';focusReturn=null;go(returnTo);}
    else{focusReturn=active;active='focus';quiet=true;menuOpen=false;render();window.scrollTo(0,0);$('.focus-view button',workspace)?.focus();}
  },
  delete:value=>{
    const [collection,key]=split(value), item=find(collection,key);
    if(item) confirm('Delete '+fieldNames[collection][0]+'?',collection==='projects'?'Delete '+item.title+'? Its milestones and actions will stay in your workspace.':item.title+' will be removed from this workspace.','delete-confirm',value,'Delete');
  },
  'delete-confirm':value=>{
    const [collection,key]=split(value);
    const milestoneProject=collection==='milestones'?find('milestones',key)?.project:'';
    state[collection]=state[collection].filter(x=>x.id!==key);
    if(collection==='tasks'&&state.focus.taskId===key&&state.focus.status==='idle') state.focus.taskId='';
    if(milestoneProject) for(const task of state.tasks) if(task.milestone===key&&!task.project) task.project=milestoneProject;
    if(collection==='milestones') for(const x of [...state.tasks,...state.notes,...state.drafts]) if(x.milestone===key) x.milestone='';
    if(collection==='projects') for(const x of [...state.tasks,...state.milestones]) if(x.project===key) x.project='';
    if(collection==='reading') for(const x of [...state.notes,...state.tasks]) if(x.paper===key) x.paper='';
    if(collection==='drafts') for(const x of state.logs) if(x.draft===key) x.draft='';
    closeDialog();commit('Item deleted.');
  },
  backup:()=>download(exportName('.json'),JSON.stringify(state,null,2),'application/json;charset=utf-8'),
  'markdown-export':markdownExport,
  'csv-export':csvExport,
  'bib-export':bibExport,
  'cv-export':cvExport,
  'calendar-export':calendarExport,
  'bib-import':()=>fileDialog('bib'),
  restore:()=>fileDialog('restore'),
  'restore-confirm':()=>{
    if(zoteroBusy) return notify('Wait for the Zotero sync to finish before restoring.');
    if(!pendingImport) return;
    leaveRoom(false);researchLock=false;zoom='day';
    state=pendingImport;researchLock=state.support.researchLock;closeDialog();commit('Workspace restored.',true);
  },
  reset:value=>confirm('Replace this workspace?', 'Your current records will be replaced. Export a JSON backup first if you want to keep them.','reset-confirm',value,value==='blank'?'Start blank':'Load example'),
  'reset-confirm':value=>{
    if(zoteroBusy) return notify('Wait for the Zotero sync to finish before restarting.');
    leaveRoom(false);researchLock=false;zoom='day';
    state=value==='blank'?blank():makeSample();closeDialog();commit(value==='blank'?'Blank workspace ready.':'Example workspace loaded.',true);
  },
  zotero:zoteroDialog,
  'zotero-push':(_value,element)=>performZotero(element.closest('form'),'push'),
  'zotero-create':(_value,element)=>performZotero(element.closest('form'),'create'),
  'zotero-disconnect':()=>{zoteroAuth=null;closeDialog();notify('Zotero disconnected.');}
};
document.addEventListener('click',event=>{
  const target=event.target.closest('[data-action]');
  if(!target) return;
  const action=target.dataset.action;
  try {
    actions[action]?.(target.dataset.value||'',target);
    if(['role-filter','task-filter','read-filter','pipeline-filter','log-filter','toggle-task','duration','pause','start','stop'].includes(action)){
      [...workspace.querySelectorAll('[data-action]')].find(el=>el.dataset.action===action&&el.dataset.value===target.dataset.value)?.focus({preventScroll:true});
    }
  } catch(error){notify(error.message||'This action could not be completed.');}
});
modal.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!modal.open) {
    if(researchLock&&!shieldOn()&&!state.support.incubation) supportActions['exit-research']();
    else if(quiet&&!shieldOn()) actions.quiet();
    else if(menuOpen) actions.menu();
  }
});
document.addEventListener('change',event=>{
  const target=event.target;
  supportChange(target);
  if(target.name==='role'&&target.value!=='Research'){
    const form=target.closest('form');
    const kind=form&&$('[name=planKind]',form);
    if(kind)kind.value='small';
    if(form)syncTaskGoal(form);
  }
  if((target.name==='planKind'||target.name==='returnKind')&&target.form)syncTaskGoal(target.form);
  if(target.matches('[data-move]')) moveCard(target.dataset.move,target.value);
  const parent=target.closest('[data-form="record"]');
  if(parent?.dataset.key?.startsWith('milestones|')&&target.name==='project'){
    $('textarea[name=purpose]',parent).placeholder=milestonePurposePrompt(target.value);
  }
  if(parent?.dataset.key?.startsWith('pipeline|')&&target.name==='kind'){
    const is=isGrant({kind:target.value});
    const stage=$('[name=status]',parent);
    stage.innerHTML=options(is?grantStages:paperStages,stage.value);
    $('[data-grant-fields]',parent).hidden=!is;
  }
});
let dragging='';
document.addEventListener('dragstart',event=>{
  const card=event.target.closest('[data-card]');
  if(card){dragging=card.dataset.card;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',dragging);}
});
document.addEventListener('dragover',event=>{
  const column=event.target.closest('[data-drop]');
  if(column&&dragging){event.preventDefault();column.classList.add('over');}
});
document.addEventListener('dragleave',event=>{
  const column=event.target.closest('[data-drop]');
  if(column&&!column.contains(event.relatedTarget)) column.classList.remove('over');
});
document.addEventListener('drop',event=>{
  const column=event.target.closest('[data-drop]');
  if(column&&dragging){event.preventDefault();moveCard(dragging,column.dataset.drop);dragging='';}
});
document.addEventListener('dragend',()=>{
  dragging='';
  document.querySelectorAll('.over').forEach(el=>el.classList.remove('over'));
});
let lastDate=today(), reminderDate='';
function clockTick() {
  timerTick();
  supportTick();
  const date=today(), now=new Date();
  if(lastDate!==date&&!modal.open){lastDate=date;commit();}
  const current=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  if(!document.hidden&&viewMode==='normal'&&active==='today'&&!modal.open&&current===state.settings.shutdown&&reminderDate!==date&&!state.logs.some(x=>x.kind==='Shutdown'&&x.date===date)){
    reminderDate=date;
    notify('Time to close the day if you’re ready.');
  }
}
const roomLink=lower(new URLSearchParams(location.search).get('room')||'');
if(roomPattern.test(roomLink)&&location.protocol!=='file:'){roomCodeDraft=roomLink;active='room';}
if(pilotLaunch&&state.support.pilot&&(today()<state.support.pilot.start||today()>shift(state.support.pilot.start,6))){
  weekStart=state.support.pilot.start;
  zoom='week';
}
window.addEventListener('pagehide',()=>leaveRoom(false));
window.addEventListener('storage',event=>{
  if(event.key!==STORE&&event.key!==null) return;
  if(event.newValue===storageRaw) return;
  if(event.newValue&&stored&&!modal.open&&JSON.stringify(state)===storageRaw){
    try{state=validated(JSON.parse(event.newValue));researchLock=state.support.researchLock;storageRaw=event.newValue;render();return;}
    catch{}
  }
  stored=false;storageIssue='Saved data changed in another tab. Back up work from this tab before loading the saved workspace.';
  render();
});
render();
if(loadError) notify('Your saved workspace could not be read. Restore a JSON backup from Settings.');
else {save(); if(!stored) render();}
clockTick();
if(pilotInvite&&!modal.open&&!loadError&&viewMode==='normal')joinPilotDialog();
setInterval(clockTick,500);
if(location.protocol!=='file:'&&'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
