'use strict';

const supportDefaults=()=>({captures:[],pilot:null,park:null,incubation:null,researchLock:false,manualOffUntil:0,openUntil:0});
const shieldDefaults=()=>({shield:false,shieldWeekends:true,resume:'08:30'});
const validDay=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(+dateIn(value))&&localDate(dateIn(value))===value;
const validTime=value=>typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const namedTask=t=>typeof t?.id==='string'&&typeof t.title==='string';
let zoom='day';
let researchLock=false;
let pendingRecall=null;
let bufferUntil=0;
let viewMode='';
let room=null;
let roomGeneration=0;

function loadSupport(raw) {
  const s={...supportDefaults(),...raw};
  s.captures=arr(s.captures).filter(namedTask);
  if(typeof s.pilot?.id!=='string'||!validDay(s.pilot.start)) s.pilot=null;
  if(typeof s.park?.id!=='string') s.park=null;
  if(!Number.isFinite(s.incubation?.until)) s.incubation=null;
  s.researchLock=s.researchLock===true;
  s.manualOffUntil=num(s.manualOffUntil);
  s.openUntil=num(s.openUntil);
  return s;
}
function migrateTasks(tasks) {
  return tasks.map(task=>{
    const {today:pinned,...record}=task;
    record.planDate=validDay(record.planDate)?record.planDate:pinned&&task.status!=='Done'?today():'';
    return record;
  });
}
function actionText(value) {
  const title=String(value||'').trim();
  const words=title.match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu)||[];
  const actions=/^(?:add|align|analyse|analyze|annotate|answer|apply|archive|ask|audit|book|build|calculate|capture|check|cite|clean|close|code|collect|commence|compare|compile|complete|confirm|contact|convert|copy|count|create|cut|define|derive|design|develop|document|draft|draw|edit|email|estimate|evaluate|export|extract|file|fill|filter|find|finish|fit|fix|flag|format|generate|grade|group|highlight|identify|import|inspect|install|interpret|interview|invert|label|leave|list|log|make|map|mark|measure|merge|model|move|name|normalize|note|open|organize|outline|parse|paste|plot|polish|prepare|print|prove|pull|read|record|recreate|refactor|register|remove|rename|replace|replicate|report|request|rerun|resend|resolve|respond|resume|review|revise|rewrite|run|save|schedule|search|select|send|set|share|skim|sort|spot-check|start|submit|summarize|synthesize|tag|test|trace|transcribe|translate|trim|update|upload|validate|verify|write)$/i;
  const broad=/^(?:analyse|analyze|write|review|finish|start|complete|revise|read|clean)\s+(?:(?:the|my|a)\s+)?(?:thesis|dissertation|paper|dataset|chapter\s+\d+|literature review)$/i;
  return words.length>=2&&(actions.test(words[0])||/^(?:bound|diagonalize|differentiate|discretize|integrate|linearize|reply)$/i.test(words[0]))&&!broad.test(title.replace(/[.!?]+$/,''));
}
const actionHint='Name a concrete action and object, such as “Outline three claims for Chapter 2.”';
function suggestedReturnDay(){
  let date=fromToday(1);
  if(state.settings.shield&&state.settings.shieldWeekends) while([0,6].includes(dateIn(date).getDay())) date=shift(date,1);
  return date;
}
const suggestedReturnTime=()=>state.settings.shield?state.settings.resume:'09:00';
function validatePlan(title) {if(!actionText(title)) throw Error(actionHint);}
const dueForReview=t=>!t.archivedAt&&t.status!=='Done'&&Boolean(t.decisionReason||t.date&&t.date<today()&&t.date!==t.reviewedDue);
const roleOfTask=t=>roles.includes(t?.role)?t.role:'Research';
function currentPlan() {
  return state.tasks.filter(t=>onBoard(t)&&t.planDate===today()).sort((a,b)=>
    (a.status==='Done')-(b.status==='Done')||Number(taskKind(b)==='deep')-Number(taskKind(a)==='deep')||
    Number(Boolean(b.primaryDay===today()))-Number(Boolean(a.primaryDay===today()))||
    (a.startTime||'99:99').localeCompare(b.startTime||'99:99'));
}
function nextPlanTask() {
  return currentPlan().find(t=>t.status==='Next');
}
function zoomButtons() {
  return '<div class="plan-zoom" aria-label="Planning horizon">'+[['day','Daily'],['week','Week'],['quarter','Quarterly'],['thesis','Thesis']].map(([key,label])=>
    '<button type="button" class="chip-button'+(key===zoom?' selected':'')+'" aria-pressed="'+(key===zoom)+'" data-action="zoom" data-value="'+key+'">'+label+'</button>').join('')+'</div>';
}
function quarterOf(date) {const d=dateIn(date);return 'Q'+(Math.floor(d.getMonth()/3)+1)+' '+d.getFullYear();}
function planningZoom() {
  const horizon=shift(today(),90);
  const milestones=[...state.milestones].filter(m=>zoom==='thesis'||!m.date||(m.status!=='Done'&&m.date<=horizon)).sort(dateOrder);
  const groups=[...new Set(milestones.map(m=>m.date?(zoom==='quarter'?quarterOf(m.date):m.date.slice(0,4)):'Flexible'))];
  const sections=groups.map(group=>panel(group,milestones.filter(m=>(m.date?(zoom==='quarter'?quarterOf(m.date):m.date.slice(0,4)):'Flexible')===group).map(m=>{
    const linked=state.tasks.filter(t=>!t.archivedAt&&t.milestone===m.id);
    const next=linked.filter(t=>t.status==='Next');
    return '<article class="plan-branch"><div class="inline plan-branch-title"><h3 class="grow">'+e(m.title)+'</h3>'+edit('milestones',m)+'</div>'+
      '<div class="inline wrap-inline">'+badge(m.status,m.status==='Waiting'?'wait':'')+txt(m.date?displayDate(m.date,{month:'long',day:'numeric',year:'numeric'}):'Flexible timing')+'</div>'+
      txt(m.question||'','plan-question')+txt(m.purpose||'','muted format')+
      '<div class="plan-linked">'+txt(linked.length?linked.filter(t=>t.status==='Done').length+' of '+linked.length+' linked actions completed':'No actions linked yet','meta')+
      next.slice(0,4).map(t=>'<div class="inline plan-next-row"><span class="grow">'+e(t.title)+'</span>'+button('Plan','reset-plan',t.id,'ghost','calendar')+'</div>').join('')+
      '<div class="inline wrap-inline">'+button('Break into actions','decompose',m.id,'secondary','plus')+
      (linked.length?button('All linked work','milestone-tasks',m.id,'ghost'):'')+'</div></div></article>';
  }).join(''),{className:'plan-cluster'})).join('');
  return heading(zoom==='quarter'?'Quarterly view':'Thesis view',zoom==='quarter'?'Unresolved milestones through the next 90 days, plus flexible work.':'Follow the connection from your research questions to concrete actions.')+
    zoomButtons()+'<div class="stack">'+(sections||panel('Shape the roadmap',empty('Add a milestone and the research question it answers.'),{action:button('Add milestone','new','milestones','secondary','plus')}))+'</div>';
}
function resetPlanDialog(key) {
  const t=find('tasks',key);
  if(!t||t.archivedAt||t.status==='Done') return;
  if(t.status==='Waiting') {
    dialog('Review follow-up',form('reset-plan',field('Follow-up date','date',t.date>=today()?t.date:fromToday(1),{type:'date',required:true})+
      txt('Follow up with '+(t.waiting||'the person you’re waiting on')+'.','muted'),'Set follow-up','',t.id));
    return;
  }
  dialog('Plan a next action',form('reset-plan',field('Concrete next action','title',t.title,{required:true,placeholder:'Plot the distribution of variable X'})+
    pair(field('Work date','date',t.planDate>=today()?t.planDate:today(),{type:'date',required:true}),field('Start time','startTime',t.startTime||'',{type:'time'}))+
    select('Slot','planKind',t.role==='Research'?dayKinds:[dayKinds[1]],taskKind(t))+
    (haveGoalPlan(t)?'<details class="details-options"><summary>Goal setup</summary>'+goalFields(t,{open:taskKind(t)==='deep'})+'</details>':goalFields(t,{open:taskKind(t)==='deep'}))+
    tick('primary','Make this the next step on that day',Boolean(t.primaryDay&&t.primaryDay===t.planDate))+
    (t.date?tick('moveDeadline','Also move the due date',false):'')+
    '<div class="inline wrap-inline">'+button('Take off the daily plan','unplan',t.id,'ghost')+button('Get unstuck','friction',t.id,'ghost','leaf')+'</div>','Save plan','',t.id));
  syncTaskGoal($('form',modal));
}
function rescheduleWork(t,data) {
  if(!validDay(data.date)||data.date<today()) throw Error('Choose today or a future date.');
  if(t.status==='Waiting'){t.date=data.date;touchTask(t);clearDecision(t);return;}
  const candidate={...t,title:data.title,planDate:data.date,startTime:data.startTime||'',updated:Date.now(),planKind:data.planKind,
    doneLooks:data.doneLooks,obstacle:data.obstacle,response:data.response};
  ensureSlot(candidate,data.date);
  Object.assign(t,candidate);
  touchTask(t);clearDecision(t);
  if(data.moveDeadline==='on') {t.date=data.date; t.reviewedDue='';}
  else if(t.date&&t.date<today()) t.reviewedDue=t.date;
  if(data.primary==='on'){
    for(const other of state.tasks) if(other.primaryDay===data.date) other.primaryDay='';
    t.primaryDay=data.date;
  } else t.primaryDay='';
}
function planQueue() {
  const review=state.tasks.filter(dueForReview);
  const due=state.tasks.filter(t=>!t.archivedAt&&t.status!=='Done'&&t.date===today()&&t.planDate!==today());
  const combined=[...new Map([...due,...review].map(t=>[t.id,t])).values()];
  if(!combined.length) return '';
  return panel('Dates to review','<div>'+combined.slice(0,6).map(t=>listRow(t.title,txt(
    t.status==='Waiting'?'Follow up · '+displayDate(t.date):t.date&&t.date<=today()?'Due date · '+displayDate(t.date):'Previous plan · '+displayDate(t.planDate)),button('Reset date','reset-plan',t.id,'secondary'))).join('')+'</div>',
    {description:'Make a fresh plan for dates that need your attention.',action:combined.length>6?button('See tasks','page','tasks','ghost'):''});
}

const frictions=[
  ['vague','Too vague','Open the materials and write one question this task should answer.'],
  ['judgment','Fear of judgment','Open the draft and write one private, rough sentence.'],
  ['tired','Exhausted','Open the workspace and leave one short note about where to resume.'],
  ['boring','Bored or avoiding it','Open the file and complete one small, repeatable part.'],
  ['blocked','Missing information','Write one question to ask the person who can help.']
];
function frictionDialog(key) {
  const t=find('tasks',key);
  if(!t||t.archivedAt||t.status==='Done') return;
  dialog('Friction check-in',form('friction',txt(t.title,'plan-question')+
    txt('It’s understandable if this feels hard to start. Pick a smaller step you could try for five minutes.','muted')+
    select('What feels difficult?','frictionType',frictions.map(([value,label])=>[value,label]),'vague')+
    field('Five-minute action','smallStep',actionText(t.response)?t.response:frictions[0][2],{required:true})+
    select('Slot','planKind',t.role==='Research'?dayKinds:[dayKinds[1]],taskKind(t))+
    goalFields(t,{open:taskKind(t)==='deep'})+
    '<div class="inline wrap-inline">'+button('Reset the date','reset-plan',t.id,'ghost','calendar')+'</div>',
    'Save five-minute action','',t.id));
  syncTaskGoal($('form',modal));
}
const tagKey=value=>String(value||'').normalize('NFKC').trim().replace(/^#+/,'').toLowerCase();
function effortFor(taskId) {
  return state.logs.filter(l=>l.task===taskId&&['Focus','Effort','Writing','Negative result','Learning'].includes(l.kind))
    .reduce((sum,l)=>sum+(Number.isFinite(l.seconds)?num(l.seconds):num(l.minutes)*60),0)/60;
}
function historicalEstimate(tag,exclude) {
  const key=tagKey(tag);
  if(!key) return [];
  return state.tasks.filter(t=>!t.example&&t.status==='Done'&&t.id!==exclude&&tagKey(t.completedTag||t.tag)===key)
    .map(t=>[num(t.completedEstimate||t.minutes),num(t.actualMinutes)||effortFor(t.id)])
    .filter(([estimate,actual])=>estimate>0&&actual>0)
    .map(([estimate,actual])=>actual/estimate).sort((a,b)=>a-b);
}
function estimateHint(tag,minutes,current) {
  if(!tagKey(tag)) return '';
  const ratios=historicalEstimate(tag,current?.id);
  if(ratios.length<3) return txt('Estimates appear after three completed tasks with this tag and recorded effort.','meta');
  if(!num(minutes)) return '';
  const middle=Math.floor(ratios.length/2);
  const median=ratios.length%2?ratios[middle]:(ratios[middle-1]+ratios[middle])/2;
  const adjusted=Math.min(720,Math.max(5,Math.round(num(minutes)*median/5)*5));
  return '<div class="callout forecast">'+txt('Typical effort was '+median.toFixed(1)+'× the estimate across '+ratios.length+' completed tasks.','')+
    (adjusted!==num(minutes)?button('Use '+adjusted+' min','apply-estimate',String(adjusted),'secondary'):'')+'</div>';
}
function taskPlanningFields(item) {
  const date=item.planDate??'';
  return select('Slot type','planKind',dayKinds,taskKind({...item,role:item.role||'Research'}))+
    goalFields(item,{open:taskKind({...item,role:item.role||'Research'})==='deep'})+
    '<details class="details-options" open><summary>Planning and timing</summary><div class="form-grid">'+
    pair(field('Planned work date','planDate',date,{type:'date'}),field('Planned start time','startTime',item.startTime,{type:'time'}))+
    pair(field('Work tag','tag',item.tag,{placeholder:'Drafting or DataCleaning',maxLength:48}),field('Actual total minutes','actualMinutes',item.actualMinutes,{type:'number',min:1,max:10080}))+
    '<div data-estimate-hint>'+estimateHint(item.tag,item.minutes??45,item)+'</div></div></details>';
}
function taskSupportMeta(t,detail,showTime=false) {
  return ((showTime||t.planDate===today())&&t.startTime?badge(t.startTime,'neutral'):'')+
    (t.primaryDay===today()&&t.status==='Next'?badge('Next step'):'')+
    (detail&&t.tag?badge('#'+t.tag.replace(/^#+/,''),'neutral'):'')+
    (t.obstacle?badge('If–then plan','neutral'):'');
}
function obstacleLine(t) {
  return t?.obstacle&&t.response?'<p class="obstacle-line"><strong>If</strong> '+e(t.obstacle)+'<br><strong>Then</strong> '+e(t.response)+'</p>':'';
}
function openFocusTask(key) {
  const task=find('tasks',key);
  if(!task||task.archivedAt||task.status!=='Next') return;
  if(!canWork(task)) return resetPlanDialog(key);
  if(!actionText(task.title)) return resetPlanDialog(key);
  if(state.focus.status!=='idle') return notify('Finish the current session to change its task.');
  if(!focusableTask(task)) return;
  if(dueForReview(task)) return frictionDialog(key);
  if(selectedFocus(key,true)){go('focus');commit('Focus selected.');}
}
function startPlanned(key){
  const task=find('tasks',key);
  if(!canWork(task)) return;
  if(state.focus.status!=='idle'){go('focus');return;}
  if(!actionText(task.title)) return resetPlanDialog(key);
  if(dueForReview(task)) return frictionDialog(key);
  if(selectedFocus(key,true)){go('focus');startTimer();}
}

function returnOptions(reference, selected=''){
  const role=roleOfTask(reference);
  const candidates=state.tasks.filter(t=>!t.archivedAt&&t.status==='Next'&&actionText(t.title)&&t.role===role&&
    (!researchLock||taskKind(t)==='deep')&&(!t.planDate||t.planDate>=today()));
  candidates.sort((a,b)=>Number(b.milestone===reference?.milestone)-Number(a.milestone===reference?.milestone)||
    (a.planDate||'9999').localeCompare(b.planDate||'9999')||(a.startTime||'99:99').localeCompare(b.startTime||'99:99'));
  const chosen=find('tasks',selected);
  const options=candidates.slice(0,18);
  if(chosen&&!options.includes(chosen)&&chosen.status==='Next') options.push(chosen);
  return select('Existing action','reuse',[['','Schedule a new action'],...options.map(t=>[t.id,(t.planDate?displayDate(t.planDate)+' · ':'')+t.title])],selected);
}
function closeParkDialog() {
  const park=state.support.park;
  if(!park) return;
  const task=find('tasks',park.task);
  const log=find('logs',park.id);
  dialog('Research parking lot',form('parking',txt('Before you close this session, leave one concrete action for your next workday.','muted')+
    (task?txt(task.title,'plan-question'):'')+obstacleLine(task)+returnOptions(task)+
    txt('Reuse an action as written, or change the wording to create a new one.','meta')+
    field('What will you do next?','next','',{required:true,placeholder:'Open Table 2 and check the p-values'})+
    pair(field('Return date','date',suggestedReturnDay(),{type:'date',required:true}),field('Return time','time',suggestedReturnTime(),{type:'time',required:true}))+
    field('Where or how will you return?','cue','',{placeholder:'At my desk, with the analysis notebook open'})+
    parkedGoalFields(task)+
    (task?.status==='Next'?tick('completeTask','Mark the current action complete',false):'')+
    (log?txt('Saved effort · '+minutesLabel(log.minutes||0),'meta'):''),'Schedule and close','',''),
    {locked:true});
}
function scheduleReturn(data, reference) {
  validatePlan(data.next);
  if(!validDay(data.date)||data.date<today()||!validTime(data.time)) throw Error('Choose a return date and time.');
  const planDate=data.horizon==='on'?'':data.date;
  if(data.reuse) {
    const existing=find('tasks',data.reuse);
    if(existing?.status!=='Next'||existing.archivedAt) throw Error('Choose an action that is still open.');
    if(reference&&existing.role!==roleOfTask(reference)) throw Error('Choose an action within the current role.');
    if(existing.title===data.next){
      const goal=taskKind(existing)==='deep'?{
        doneLooks:data.returndoneLooks??existing.doneLooks,
        obstacle:data.returnobstacle??existing.obstacle,
        response:data.returnresponse??existing.response
      }:{};
      ensureSlot({...existing,...goal},planDate);
      if(existing.primaryDay!==planDate) existing.primaryDay='';
      Object.assign(existing,goal,{planDate,previousPlanDate:planDate?'':data.date,startTime:data.time,returnCue:data.cue,updated:Date.now()});
      touchTask(existing);clearDecision(existing);
      return existing;
    }
    reference=reference||existing;
  }
  const next={id:id(),title:data.next,role:roleOfTask(reference),status:'Next',minutes:15,planDate,startTime:data.time,
    planKind:data.returnKind||taskKind(reference||{role:'Research'}),doneLooks:data.returndoneLooks||reference?.doneLooks,
    obstacle:data.returnobstacle||reference?.obstacle,response:data.returnresponse||reference?.response,
    previousPlanDate:planDate?'':data.date,lastTouched:today(),
    returnCue:data.cue,milestone:reference?.milestone||'',parent:reference?.id||'',pilotId:reference?.pilotId||''};
  ensureSlot(next,planDate);
  state.tasks.push(next);
  return next;
}
function enterResearch() {
  if(state.focus.status!=='idle') return notify('Close your current session before switching contexts.');
  const last=[...state.logs].filter(l=>l.kind==='Focus').sort(recentOrder)[0];
  const source=last?.role||find('tasks',last?.task)?.role;
  const selected=find('tasks',state.focus.taskId);
  if((source&&source!=='Research')||(selected&&selected.role!=='Research')||(active==='tasks'&&['Teaching','Service'].includes(taskFilter.role))){
    bufferUntil=Date.now()+120000;
    dialog('Transition to research',form('transition',txt('Leave a brief note about where to resume the previous work. Take two minutes to clear the context.','muted')+
      area('What should I come back to?','returnPoint','','The next action or open question')+
      '<p class="buffer-time" data-buffer aria-live="off">2:00</p>','Start deep research'));
    updateBuffer();
    return;
  }
  lockResearch();
}
function lockResearch() {
  const selected=find('tasks',state.focus.taskId);
  if(selected&&taskKind(selected)!=='deep') selectedFocus('');
  researchLock=true;state.support.researchLock=true;active='focus';menuOpen=false;quiet=false;
  commit();window.scrollTo(0,0);
}
function updateBuffer() {
  const timer=$('[data-buffer]',modal);
  if(!timer) return;
  const remaining=Math.max(0,Math.ceil((bufferUntil-Date.now())/1000));
  timer.textContent=remaining?asClock(remaining):'Ready to switch';
  const submitButton=$('[data-form="transition"] button[type=submit]',modal);
  if(submitButton) submitButton.disabled=remaining>0;
}
function researchRoomView() {
  const tasks=currentPlan().filter(focusableTask);
  return '<div class="mode-frame"><header class="mode-heading"><span class="soft-icon">'+glyph('leaf',true)+'</span><div class="grow"><h1>Deep research</h1><p class="muted">Research tasks and your timer.</p></div>'+button('Exit research mode','exit-research','','secondary','close')+'</header>'+
    '<div class="stack">'+timerPanel(true)+panel('Research actions',tasks.length?tasks.map(t=>taskRow(t,true)).join(''):empty('Add a research action to give this block a next step.'),
    {action:button('Add research task','research-add','','secondary','plus')})+'</div></div>';
}
function incubationDialog(){
  if(state.focus.status!=='idle') return notify('Close your current session before stepping away.');
  dialog('Step away from the problem',form('incubation',txt('Pick a short screen-free break. Walk without audio, stretch, or do a simple household task.','muted')+
    pair(select('Minutes','minutes',[['15','15 minutes'],['20','20 minutes']],'15'),field('Question to revisit','question','',{placeholder:'What alternative would explain this result?'})),
    'Begin break'));
}
function incubationView(s) {
  return '<div class="mode-frame mode-centered"><section class="panel subtle mode-card"><span class="soft-icon">'+glyph('leaf',true)+'</span>'+
    '<h1>Stepping away</h1><p class="muted">Try a short walk, stretching, or a simple task away from the screen.</p>'+
    '<p class="timer-display" data-incubation aria-label="Time remaining">'+asClock(Math.max(0,Math.ceil((s.until-Date.now())/1000)))+'</p>'+
    button('Return early','insight','','secondary')+'</section></div>';
}
function insightDialog() {
  const s=state.support.incubation;
  if(!s) return;
  dialog('Capture an insight',form('insight',txt('Did a new angle come to mind? You can also end the break here.','muted')+
    txt(s.question,'plan-question')+area('What did you notice?','insight','','An alternative explanation, question, or next experiment'),
    'Return to workspace'),{locked:true});
}


const recallIntervals=[3,7,14,30,60];
const recallQuestions=[
  ['claim','What is the core claim or finding?'],
  ['limitation','What is the biggest limitation?'],
  ['relevance','How does it support or challenge your project?']
];
function recallDialog(item,previous=item.stage,fromForm=false) {
  pendingRecall={item,previous,fromForm};
  document.body.classList.add('recall-mode');
  const content=form('recall',txt(item.title,'plan-question')+
    txt('Answer briefly from memory. Write what you still need to verify if you’re unsure.','muted')+
    recallQuestions.map(([name,label])=>area(label,name,'','One or two sentences',true,2)).join('')+
    select('Link to a milestone','milestone',refs('milestones'),item.reviewMilestone||''),'Save synthesis');
  dialog('Recall from memory',fromForm?content.replace('>Cancel</button>','>Back to reference</button>'):content);
}
function acceptRecall(data) {
  if(!pendingRecall) throw Error('Open a paper to start recall.');
  for(const [key] of recallQuestions) if(!data[key]?.trim()) throw Error('Answer each prompt, even if you need to flag uncertainty.');
  const {item,previous}=pendingRecall;
  const existing=find('reading',item.id);
  const note={id:id(),title:'Synthesis · '+item.title,body:recallQuestions.map(([key,label])=>label+'\n'+data[key]).join('\n\n'),
    paper:item.id,milestone:data.milestone,recall:true};
  Object.assign(item,{stage:'Synthesized',reviewDue:shift(today(),recallIntervals[0]),reviewLevel:0,recallNote:note.id,reviewMilestone:data.milestone});
  setReadStage(item,previous);
  if(existing) state.reading=state.reading.map(r=>r.id===item.id?item:r);
  else state.reading.push(item);
  state.notes.push(note);
  pendingRecall=null;
  closeDialog();
  commit('Synthesis saved. Review scheduled for '+displayDate(item.reviewDue)+'.');
}
function reviewCandidates(milestone='') {
  return state.reading.filter(r=>r.stage==='Synthesized'&&find('notes',r.recallNote)&&
    (!milestone||r.reviewMilestone===milestone||state.notes.some(n=>n.paper===r.id&&n.milestone===milestone)))
    .sort((a,b)=>(a.reviewDue||'9999').localeCompare(b.reviewDue||'9999'));
}
function reviewPanel(milestone='') {
  const papers=reviewCandidates(milestone).filter(r=>milestone||r.reviewDue<=today());
  return papers.slice(0,6).map(r=>listRow(r.title,txt(r.reviewDue?'Review from '+displayDate(r.reviewDue):''),button('Recall','review-paper',r.id,'secondary','book'))).join('');
}
function reviewPaper(id) {
  const paper=find('reading',id);
  if(!paper||!find('notes',paper.recallNote)) return;
  document.body.classList.add('recall-mode');
  dialog('Practice recall','<div class="form-grid">'+txt(paper.title,'plan-question')+
    '<ol class="recall-list">'+recallQuestions.map(([,q])=>'<li>'+e(q)+'</li>').join('')+'</ol>'+
    area('Optional rough notes','practice','','Answer from memory before revealing your synthesis.')+
    '<div class="form-actions">'+cancel()+button('Reveal synthesis','reveal-paper',id,'primary')+'</div></div>');
}
function revealPaper(id) {
  const paper=find('reading',id), note=find('notes',paper?.recallNote);
  if(!note) return;
  dialog('Check your recall','<div class="form-grid">'+txt(paper.title,'plan-question')+txt(note.body,'format recall-answer')+
    '<div class="form-actions">'+button('Review tomorrow','review-grade',frag(id,'again'),'secondary')+button('Remembered','review-grade',frag(id,'remembered'),'primary','check')+'</div></div>');
}
function gradeRecall(value) {
  const [key,result]=split(value), paper=find('reading',key);
  if(!paper) return;
  const level=result==='remembered'?Math.min(recallIntervals.length-1,num(paper.reviewLevel)+1):0;
  paper.reviewLevel=level;
  paper.reviewDue=shift(today(),result==='remembered'?recallIntervals[level]:1);
  closeDialog();
  commit('Next review · '+displayDate(paper.reviewDue));
}

function shieldOn(now=new Date()) {
  if(state.support.openUntil>+now) return false;
  if(state.support.manualOffUntil>+now) return true;
  if(!state.settings.shield) return false;
  const dow=now.getDay();
  if(state.settings.shieldWeekends&&(dow===0||dow===6)) return true;
  const time=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const {shutdown,resume}=state.settings;
  return shutdown>resume?(time>=shutdown||time<resume):(time>=shutdown&&time<resume);
}
function availableMode() {
  if(shieldOn()) return 'shield';
  if(state.support.incubation) return 'incubation';
  if(researchLock) return 'research';
  return 'normal';
}
function inboxMarkup() {
  const saved=[...state.support.captures].sort(recentOrder);
  const inbox=saved.filter(note=>!note.archived);
  const archived=saved.filter(note=>note.archived);
  const rows=inbox.map(note=>listRow(note.title,txt(displayDate(note.date)),
    '<div class="inline wrap-inline">'+button('Plan','capture-plan',note.id,'ghost','calendar')+iconButton('Archive capture','check','archive-capture',note.id)+'</div>')).join('');
  const archive=archived.length?'<details class="details-options compact"><summary>Archived captures</summary>'+
    archived.map(note=>listRow(note.title,txt(find('tasks',note.task)?'Linked to '+find('tasks',note.task).title:''),button('Restore','unarchive-capture',note.id,'ghost'))).join('')+'</details>':'';
  return panel('Quick capture inbox',(rows||empty('Ideas saved after hours appear here.'))+archive,{action:button('Capture an idea','quick-capture','','secondary','plus')});
}
function shieldView() {
  const park=state.support.park, incubation=state.support.incubation;
  return '<div class="mode-frame mode-centered"><section class="panel warm mode-card shield-card"><span class="soft-icon">'+glyph('moon',true)+'</span>'+
    '<h1>Off the clock</h1><p class="muted">Leave an idea here and come back to it when you’re ready to work.</p>'+
    '<form class="form-grid" data-form="capture">'+field('Quick capture','idea','',{placeholder:'A thought for later…',required:true,maxLength:1000})+
    '<p class="error-text" data-error role="alert" hidden></p><div class="inline wrap-inline">'+submit('Save for later')+'</div></form>'+
    '<div class="inline wrap-inline shield-links">'+(park?button('Park my next step','open-park','','secondary'):incubation?button('Record break insight','insight','','secondary'):'')+
    button('Open workspace for 15 min','shield-open','','ghost')+'</div></section></div>';
}
function manualShield() {
  state.support.openUntil=0;
  const resume=dateIn(fromToday(1));
  const [hh,mm]=state.settings.resume.split(':').map(Number);
  resume.setHours(hh,mm,0,0);
  state.support.manualOffUntil=+resume;
  leaveRoom(false);
  commit();
}
function captureDialog() {
  dialog('Quick capture',form('capture',area('Idea for later','idea','','Capture the thought in a few words.',true),'Save for later'));
}

const roomPattern=/^[a-z0-9][a-z0-9-]{5,39}$/;
function newRoomCode() {
  const random=()=>Math.floor(Math.random()*36).toString(36);
  const suffix=globalThis.crypto?.getRandomValues ? Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>n.toString(16).padStart(2,'0')).join('') : Array.from({length:16},random).join('');
  return 'room-'+suffix;
}
let roomCodeDraft='';
function roomView() {
  return heading('Co-working room','Share a quiet space for writing or reading.')+
    '<div class="grid grid-even">'+panel('Quiet company','<div id="room-controls">'+roomContent()+'</div>',{className:'subtle'})+
    timerPanel()+'</div>';
}
function roomContent() {
  if(staticPilotHost) return txt('Live co-working uses the Quod companion server. Use quiet view for a solo focus session.','muted')+
    '<div class="compact">'+button('Use quiet view','quiet','','secondary','timer')+'</div>';
  if(location.protocol==='file:') return txt('Open Quod through its companion server to share a room with a peer. The setup guide is in the bundle.','muted')+
    '<div class="compact">'+button('Use quiet view','quiet','','secondary','timer')+'</div>';
  if(!room) return '<form class="form-grid" data-form="room-join">'+
    txt('Share an invite with a peer. The room shows anonymous presence dots.','muted')+
    field('Room code','code',roomCodeDraft,{placeholder:'Enter a shared room code',required:true,maxLength:40})+
    '<p class="error-text" data-error role="alert" hidden></p><div class="inline wrap-inline">'+submit('Join room')+button('Generate code','room-generate','','secondary')+'</div></form>';
  const others=room.connected?Math.max(0,room.count-1):0;
  return '<div class="form-grid">'+txt(room.code,'room-code')+
    '<div class="room-dots" aria-label="'+e(others+' peers present')+'"><span class="room-dot self" title="You"></span>'+
    Array.from({length:Math.min(20,others)},()=>'<span class="room-dot" aria-hidden="true"></span>').join('')+
    (others>20?'<span class="meta">+'+e(others-20)+'</span>':'')+'</div>'+
    '<p class="muted" role="status">'+(room.connected?(others?'Someone is quietly working alongside you.':'You’re the first one here.'):'Connection interrupted. Trying again…')+'</p>'+
    '<div class="inline wrap-inline">'+button('Copy invite','room-copy','','secondary','link')+button('Leave room','room-leave','','ghost')+'</div></div>';
}
function paintRoom() {
  const node=$('#room-controls',workspace);
  if(node){
    const focused=document.activeElement?.dataset?.action;
    node.innerHTML=roomContent();
    if(focused) [...node.querySelectorAll('button')].find(b=>b.dataset.action===focused)?.focus();
  }
}
async function roomRequest(entry, leave=false) {
  const response=await fetch(new URL('./api/room',location.href),{method:'POST',credentials:'same-origin',keepalive:leave,
    headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(8000),
    body:JSON.stringify({code:entry.code,token:entry.token,leave})});
  if(!response.ok) throw Error('Live rooms require the Quod companion server.');
  const data=await response.json();
  if(!Number.isSafeInteger(data.count)) throw Error('The room server did not respond correctly.');
  return data.count;
}
async function joinRoom(code) {
  if(!roomPattern.test(code)) throw Error('Use a room code of 6–40 letters, numbers or hyphens.');
  if(room?.code===code) return;
  leaveRoom(false);
  const version=++roomGeneration;
  const entry={code,token:id(),count:0,connected:false};
  const count=await roomRequest(entry);
  if(version!==roomGeneration||shieldOn()){
    roomRequest(entry,true).catch(()=>{});
    throw Error('Room closed before joining.');
  }
  room={...entry,count,connected:true,lastPing:Date.now()};
  roomCodeDraft=code;
  paintRoom();
}
function leaveRoom(repaint=true) {
  roomGeneration+=1;
  const prior=room; room=null;
  if(prior) roomRequest(prior,true).catch(()=>{});
  if(repaint) paintRoom();
}
function roomTick() {
  if(!room||Date.now()-room.lastPing<10000) return;
  const entry=room;
  entry.lastPing=Date.now();
  roomRequest(entry).then(count=>{
    if(room===entry){const changed=!entry.connected||entry.count!==count;Object.assign(entry,{count,connected:true});if(changed) paintRoom();}
    else roomRequest(entry,true).catch(()=>{});
  }).catch(()=>{if(room===entry&&entry.connected){entry.connected=false;paintRoom();}});
}
async function copyInvite() {
  if(!room) return;
  const url=new URL('./',location.href);
  url.searchParams.set('room',room.code);
  try{await navigator.clipboard.writeText(url.href);notify('Room invite copied.');}
  catch{dialog('Copy room invite',area('Share this link','room-link',url.href));$('[name=room-link]',modal)?.select();}
}

function supportTick() {
  updateBuffer();
  const mode=availableMode();
  if(mode!==viewMode) render();
  if(mode==='shield') return;
  if(state.support.incubation){
    const seconds=Math.max(0,Math.ceil((state.support.incubation.until-Date.now())/1000));
    const clock=$('[data-incubation]',workspace);
    if(clock&&clock.textContent!==asClock(seconds)) clock.textContent=asClock(seconds);
    if(!seconds&&!modal.open) insightDialog();
  } else if(state.support.park&&!modal.open) closeParkDialog();
  roomTick();
}
function supportChange(target) {
  if(target.name==='reuse'){
    const t=find('tasks',target.value);
    const next=$('[name=next]',modal);
    const plannedDate=$('[name=date]',modal), time=$('[name=time]',modal), cue=$('[name=cue]',modal);
    if(next)next.value=t?.title||'';
    if(plannedDate)plannedDate.value=t?.planDate>=today()?t.planDate:suggestedReturnDay();
    if(time)time.value=t?.startTime||suggestedReturnTime();
    if(cue)cue.value=t?.returnCue||'';
    for(const [key] of goalPrompts){
      const input=$('[name="return'+key+'"]',target.form);
      if(input) input.value=t?(t[key]??''):input.defaultValue;
    }
    clearGoalError(target.form);
  }
  if(target.name==='frictionType'){
    const step=$('[name=smallStep]',modal);
    if(step) step.value=frictions.find(([key])=>key===target.value)?.[2]||'';
  }
  if(['tag','minutes'].includes(target.name)){
    const form=target.closest('[data-form=record]');
    const box=form&&$('[data-estimate-hint]',form);
    if(box){
      const [,key]=split(form.dataset.key);
      box.innerHTML=estimateHint($('[name=tag]',form).value,$('[name=minutes]',form).value,find('tasks',key));
    }
  }
}
async function supportSubmit(method, target, data) {
  const entry=method==='reset-plan'||method==='friction'?find('tasks',target.dataset.key):null;
  if(method==='reset-plan'){
    if(!entry||entry.status==='Done') throw Error('Choose an open task.');
    rescheduleWork(entry,data);
    closeDialog();commit('Plan saved.');
  } else if(method==='friction'){
    if(!entry||entry.archivedAt||entry.status==='Done') throw Error('Choose an open task.');
    validatePlan(data.smallStep);
    const date=today();
    const step={id:id(),title:data.smallStep,minutes:5,role:roleOfTask(entry),status:'Next',milestone:entry.milestone,
      planDate:date,primaryDay:date,parent:entry.id,fiveMinute:true,pilotId:entry.pilotId||'',lastTouched:date,
      planKind:data.planKind,doneLooks:data.doneLooks,obstacle:data.obstacle,response:data.response,
      date:entry.date,reviewedDue:entry.date<today()?entry.date:''};
    ensureSlot(step,date,[entry.id]);
    archiveWork(entry,'Replaced by a five-minute action');
    for(const t of state.tasks) if(t.primaryDay===date) t.primaryDay='';
    state.tasks.push(step);
    if(state.focus.status==='idle') selectedFocus(step.id);
    closeDialog();commit('Today’s action updated.');
  } else if(method==='parking'){
    const parking=state.support.park;
    if(!parking) throw Error('The session has already been parked.');
    const current=find('tasks',parking.task);
    const complete=data.completeTask==='on'&&current?.status==='Next';
    if(complete&&data.reuse===current.id&&data.next===current.title) throw Error('Choose a different return action before completing this one.');
    const task=scheduleReturn(data,current);
    const log=find('logs',parking.id);
    if(log) Object.assign(log,{returnTask:task.id,returnDate:data.date,returnTime:task.startTime,returnInHorizon:!task.planDate});
    if(complete) setTaskStatus(current,'Done',current.status,false);
    state.support.park=null;
    closeDialog(true);commit(task.planDate?'Return planned for '+displayDate(task.planDate)+' at '+task.startTime+'.':'Return cue saved in Horizon.');
  } else if(method==='transition'){
    if(Date.now()<bufferUntil) throw Error('Take a moment to finish the transition.');
    if(data.returnPoint) state.support.captures.push({id:id(),title:data.returnPoint,date:today(),created:Date.now()});
    bufferUntil=0;
    closeDialog();lockResearch();
  } else if(method==='incubation'){
    if(state.focus.status!=='idle'||!['15','20'].includes(data.minutes)) throw Error('Choose an available break.');
    state.support.incubation={until:Date.now()+Number(data.minutes)*60000,question:data.question,task:state.focus.taskId};
    closeDialog();commit();
  } else if(method==='insight'){
    const incubation=state.support.incubation;
    if(!incubation) return;
    if(data.insight) state.logs.push({id:id(),kind:'Learning',title:'Incubation insight',details:[incubation.question,data.insight].filter(Boolean).join('\n\n'),
      task:incubation.task,date:today(),private:true,created:Date.now()});
    state.support.incubation=null;
    closeDialog(true);commit(data.insight?'Insight saved privately.':'Welcome back.');
  } else if(method==='recall') acceptRecall(data);
  else if(method==='capture'){
    if(!data.idea) throw Error('Enter a thought to save.');
    state.support.captures.push({id:id(),title:data.idea,date:today(),created:Date.now()});
    closeDialog(true);commit('Saved to your capture inbox.');
  } else if(method==='room-join') await joinRoom(lower(data.code));
  else if(method==='pilot-setup'){
    if(state.support.pilot) throw Error('This workspace already has a pilot.');
    if(!validDay(data.start)||data.start<today()) throw Error('Choose today or a future date.');
    addChapterPilot(state,data.start);
    weekStart=data.start;zoom='week';
    closeDialog();go('today');commit('The pilot week is ready.');
  } else if(method==='pilot-join'){
    if(state.support.pilot)throw Error('This workspace already has a pilot.');
    if(!validDay(data.start)||data.start<today())throw Error('Choose today or a future date.');
    if(!data.chapter||!data.outcome)throw Error('Enter a chapter and one thing you want ready.');
    addPersonalPilot(state,data.start,data.chapter,data.outcome);
    weekStart=data.start;zoom='week';
    closeDialog();go('today');commit('The pilot week is ready.');
  } else if(method==='pilot-review'){
    if(!state.support.pilot) return false;
    state.support.pilot.review={date:today(),helped:data.helped,friction:data.friction,change:data.change};
    closeDialog();commit('Pilot review saved privately.');
  }
  else return false;
  return true;
}
const supportActions={
  zoom:value=>{zoom=value;go('today');},
  'week-shift':value=>{weekStart=shift(weekStart||startOfWeek(),Number(value));go('today');},
  'week-current':()=>{weekStart=startOfWeek();go('today');},
  'week-add':value=>{
    const pilot=state.support.pilot;
    const withinPilot=pilot&&value>=pilot.start&&value<=shift(pilot.start,6);
    editDialog('tasks','',{planDate:value,milestone:withinPilot?pilot.milestone:''});
  },
  'pilot-week':()=>{if(state.support.pilot){weekStart=state.support.pilot.start;zoom='week';go('today');}},
  'pilot-setup':pilotSetup,
  'pilot-review':pilotReflectionDialog,
  'start-planned':startPlanned,
  'all-tasks':()=>{taskFilter={role:'All roles',stage:'All statuses'};go('tasks');},
  'reload-storage':()=>confirm('Load the saved workspace?','Export a backup first if you want to keep changes from this tab.','reload-storage-confirm','','Load saved workspace'),
  'reload-storage-confirm':()=>location.reload(),
  'reset-plan':resetPlanDialog,
  unplan:key=>{
    const t=find('tasks',key);
    if(!t) return;
    t.planDate='';t.startTime='';t.primaryDay='';
    clearDecision(t);touchTask(t);
    if(t.date&&t.date<today()) t.reviewedDue=t.date;
    closeDialog();commit('Removed from the daily plan.');
  },
  friction:frictionDialog,
  'apply-estimate':value=>{
    const input=$('[name=minutes]',modal);
    if(input){input.value=value;supportChange(input);input.focus();}
  },
  'open-park':closeParkDialog,
  research:enterResearch,
  'research-add':()=>editDialog('tasks','',{role:'Research',planDate:today()}),
  'exit-research':()=>{researchLock=false;state.support.researchLock=false;save();go('focus');},
  incubation:incubationDialog,
  insight:insightDialog,
  'recall-paper':key=>{const r=find('reading',key);if(r&&r.stage!=='Synthesized')recallDialog({...r});},
  'review-paper':reviewPaper,
  'reveal-paper':revealPaper,
  'review-grade':gradeRecall,
  'draft-review':key=>{
    const draft=find('drafts',key);
    if(!draft) return;
    dialog('Recall before drafting',reviewPanel(draft.milestone)||empty('Synthesize papers linked to this milestone to review them here.'));
  },
  'shield-now':manualShield,
  'shield-open':()=>{state.support.openUntil=Date.now()+15*60000;commit();},
  'quick-capture':captureDialog,
  'capture-plan':key=>{
    const capture=state.support.captures.find(n=>n.id===key);
    if(capture) editDialog('tasks','',{title:actionText(capture.title)?capture.title.slice(0,180):'',details:capture.title,planDate:'',fromCapture:key});
  },
  'archive-capture':key=>{const note=state.support.captures.find(n=>n.id===key);if(note){note.archived=true;commit('Capture archived.');}},
  'unarchive-capture':key=>{const note=state.support.captures.find(n=>n.id===key);if(note){note.archived=false;commit('Capture restored.');}},
  'room-copy':()=>{copyInvite().catch(error=>notify(error.message));},
  'room-leave':()=>leaveRoom(),
  'room-generate':()=>{roomCodeDraft=newRoomCode();const input=$('[name=code]',workspace);if(input){input.value=roomCodeDraft;input.focus();}}
};

const workflowEvidence=[
  ['Getting started','Self-forgiveness and procrastination','In a student study, self-forgiveness after delaying study was associated with less procrastination on the next exam. Quod offers a small, editable action.','Wohl et al. (2010)','https://doi.org/10.1016/j.paid.2010.01.029'],
  ['Parking & switching','Make a plan to return','Specific plans reduced unfinished-goal interference in laboratory tasks. A separate set of experiments tested ready-to-resume planning during interruptions. Quod uses these ideas for the parking lot and the transition buffer.','Masicampo & Baumeister (2011)','https://pubmed.ncbi.nlm.nih.gov/21688924/','Leroy & Glomb (2018)','https://doi.org/10.1287/orsc.2017.1184'],
  ['Estimates','Start from what happened before','In experiments on the planning fallacy, people underestimated completion time for their own tasks, including academic work. Estimates in Quod are based on a median across comparable completed tasks with recorded effort.','Buehler et al. (1994)','https://doi.org/10.1037/0022-3514.67.3.366'],
  ['Obstacles','Connect the obstacle to a response','Experimental work tested whether specifying when and how to act helps people start or complete goals. Quod makes each if–then plan editable.','Gollwitzer & Brandstätter (1997)','https://doi.org/10.1037/0022-3514.73.1.186'],
  ['Incubation','Step away from the problem','An undemanding activity helped with previously encountered creative tasks in an experiment. Micro-break research found benefits for vigor and fatigue, with less consistent performance effects. Quod’s 15- and 20-minute options are design choices.','Baird et al. (2012)','https://doi.org/10.1177/0956797612446024','Albulescu et al. (2022)','https://doi.org/10.1371/journal.pone.0272460'],
  ['Reading','Retrieve before rereading','In experiments with prose passages, recalling the material improved longer-term retention. Quod asks readers to reconstruct the claim, limitation, and relevance before saving a synthesis.','Roediger & Karpicke (2006)','https://pubmed.ncbi.nlm.nih.gov/16507066/'],
  ['Off-hours','Keep a small space for quick capture','The stressor-detachment framework connects recovery with mentally switching off after work. Quod’s optional hours hide the workspace and leave one capture field.','Sonnentag & Fritz (2015)','https://doi.org/10.1002/job.1924'],
  ['Motivation & connection','Work beside someone quietly','Experiments in an extrinsic-rewards meta-analysis distinguished tangible completion rewards from informational feedback. Quod uses private progress and anonymous presence. The co-working room itself has yet to be tested as an intervention.','Deci et al. (1999)','https://pubmed.ncbi.nlm.nih.gov/10589297/'],
  ['Planning horizons','Match detail to the time horizon','Construal-level theory describes how psychological distance relates to abstract representation. Quod keeps short actions in Daily view and research questions in Quarterly and Thesis views.','Trope & Liberman (2010)','https://doi.org/10.1037/a0018963']
].map(([label,title,finding,author,url,second,secondUrl])=>({label,title,finding,author,url,second:second?[second,secondUrl]:null}));



let weekStart='';
const pilotTitle='Chapter 3 · Stability and accuracy of a heat solver';
function addChapterPilot(target,start) {
  const pilotId=id(), milestone=id(), draft=id();
  target.support.pilot={id:pilotId,start,milestone};
  target.milestones.push({id:milestone,title:pilotTitle,date:shift(start,4),status:'In progress',kind:'Chapter',
    question:'When does the explicit discretization reproduce bounded heat diffusion, and what does a small refinement test show?',
    purpose:'Give readers a reproducible link between the stability argument, the numerical experiment, and the scope of the claim.',
    details:'A provisional section with assumptions, the update rule, one check against a known solution, a labelled figure or table, and one limitation ready for supervisor feedback.'});
  target.drafts.push({id:draft,title:'Chapter 3 stability and accuracy section',status:'Outline',milestone,
    details:'Use an explicit update on a uniform grid with fixed boundary values. Keep the stability argument and the numerical checks clearly labelled.'});
  const plan=[
    [0,'09:30',25,'Outline the model assumptions and chapter claim','Drafting','Write three bullets covering the domain, boundary conditions, and the claim this section will support.'],
    [0,'14:00',20,'Extract one stability criterion from the diffusion reference','Reading','Read the relevant subsection, then recall the criterion, a limitation, and its relevance.'],
    [1,'09:30',40,'Derive the discrete update on one interior grid point','Analysis','Check each coefficient against the time and space discretizations. Flag any step that needs a citation.'],
    [1,'14:00',20,'Check the amplification factor at two wavenumbers','Analysis','Use one low and one high mode. Record the parameter values you used.'],
    [2,'09:30',45,'Run two refinement cases against the known solution','Computing','Keep the initial and boundary data fixed. Record mesh spacing, time step, and the final error norm.'],
    [2,'12:00',20,'Grade the first tutorial problem','Teaching','Use the rubric, then leave a note about where to resume grading.'],
    [3,'09:30',20,'Label the refinement figure with the error norm','Computing','Label the axes and record the measurement convention in the caption.'],
    [3,'14:00',30,'Draft one paragraph interpreting the refinement figure','Drafting','State only what the measurements support. Leave a bracketed question near any unresolved claim.'],
    [4,'09:30',25,'Summarize one finding and one limitation for the supervisor','Drafting','Bring the figure and the draft paragraph. Ask how much of the stability argument belongs in this chapter.'],
    [4,'14:00',15,'Write the advisor follow-up and pick the next action','Planning','Convert one meeting-note line into a concrete task and review the weekly digest.']
  ];
  for(const [index,[day,startTime,minutes,title,tag,details]] of plan.entries()) {
    const role=tag==='Teaching'?'Teaching':'Research';
    const deep=[0,2,4,7,8].includes(index);
    target.tasks.push({id:id(),title,role,status:'Next',minutes,planDate:shift(start,day),startTime,tag,details,
      milestone:role==='Research'?milestone:'',pilotId,pilotStep:index,
      planKind:deep?'deep':'small',
      ...(deep?{doneLooks:details,obstacle:index===4?'The solver returns an unexpected error':'I get stuck checking more details than this block needs',
        response:index===4?'Record the configuration for the smaller case':'Write one concrete check in the notebook'}:{})});
  }
  target.reading.push(
    {id:id(),title:'Diffusion Equations and Parabolic Problems',authors:'LeVeque, Randall J.',year:'2007',stage:'Deep read',doi:'10.1137/1.9780898717839.ch9',
      url:'https://epubs.siam.org/doi/10.1137/1.9780898717839.ch9',reviewMilestone:milestone,pilotId},
    {id:id(),title:'A practical method for numerical evaluation of solutions of partial differential equations of the heat-conduction type',
      authors:'Crank, John and Nicolson, Phyllis',year:'1947',doi:'10.1017/S0305004100023197',stage:'To skim',
      url:'https://doi.org/10.1017/S0305004100023197',reviewMilestone:milestone,pilotId});
  target.meetings.push({id:id(),title:'Chapter 3 check-in',date:shift(start,4),attendees:'Supervisor',
    questions:'Is the stability argument at the right level of detail?\nWhich additional numerical check would be most informative?',
    materials:'Refinement figure, assumptions outline, and draft paragraph',notes:'',extracted:[],pilotId});
  return target;
}
function pilotSetup() {
  const existing=state.support.pilot;
  if(existing){weekStart=existing.start;zoom='week';go('today');return;}
  dialog('Add a one-week thesis pilot',form('pilot-setup',txt(pilotTitle,'plan-question')+
    txt('Add five workdays, two reading references, a draft, and a supervisor check-in to this workspace.','muted')+
    field('First workday','start',shift(startOfWeek(),7),{type:'date',required:true}),'Add pilot week'));
}
function addPersonalPilot(target,start,title,outcome){
  const milestone=id();
  target.support.pilot={id:id(),start,milestone};
  target.milestones.push({id:milestone,title,date:shift(start,6),status:'In progress',kind:'Chapter',details:outcome});
  target.drafts.push({id:id(),title,status:'Outline',milestone});
}
function joinPilotDialog(){
  if(state.support.pilot){
    weekStart=state.support.pilot.start;
    zoom='week';
    go('today');
    return;
  }
  const first=dateIn(today()).getDay()===1?today():shift(startOfWeek(),7);
  dialog('Start your one-week pilot',form('pilot-join',
    field('Chapter to work on','chapter','',{required:true,placeholder:'Chapter 2 · Methods'})+
    area('What will be ready by the end of the week?','outcome','','An outline with three claims, each linked to a source',true,2)+
    field('First day','start',first,{type:'date',required:true}),
    'Open my week plan'));
}
function pilotFeedbackLink(){
  return staticPilotHost?'<a class="btn secondary" href="./feedback.html">'+glyph('journal')+'Give pilot feedback</a>':'';
}
function pilotReflectionDialog() {
  const pilot=state.support.pilot;
  if(!pilot) return;
  dialog('Review the pilot',form('pilot-review',area('What made it easier to start or stop?','helped',pilot.review?.helped,'An interaction or a moment you want to repeat')+
    area('What caused friction?','friction',pilot.review?.friction,'A step, prompt, or feature that got in the way')+
    field('What would you change next week?','change',pilot.review?.change,{placeholder:'Keep one useful feature and change one thing'}),'Save private review'));
}
function pilotWeekInfo(start) {
  const pilot=state.support.pilot;
  if(!pilot||pilot.start!==start) return '';
  const milestone=find('milestones',pilot.milestone);
  const tasks=state.tasks.filter(t=>t.pilotId===pilot.id||t.milestone===pilot.milestone);
  const done=tasks.filter(t=>t.status==='Done').length;
  return panel(milestone?.title||pilotTitle,
    txt(milestone?.question,'plan-question')+txt(milestone?.details,'muted')+
    '<div class="inline wrap-inline compact">'+(done?badge(done+' '+(done===1?'action completed':'actions completed'),'neutral'):'')+
    button('Review the pilot','pilot-review','','ghost','journal')+pilotFeedbackLink()+'</div>',
    {className:'subtle',action:milestone?edit('milestones',milestone):''});
}
function weekView(){
  const start=validDay(weekStart)?weekStart:startOfWeek(), end=shift(start,6);
  const range=displayDate(start,{month:'short',day:'numeric'})+' to '+displayDate(end,{month:'short',day:'numeric',year:'numeric'});
  const pilot=state.support.pilot;
  const days=Array.from({length:7},(_,i)=>shift(start,i)).map(day=>{
    const tasks=state.tasks.filter(t=>onBoard(t)&&t.planDate===day).sort((a,b)=>
      Number(b.primaryDay===day)-Number(a.primaryDay===day)||(a.startTime||'99:99').localeCompare(b.startTime||'99:99'));
    const meeting=state.meetings.filter(m=>m.date===day);
    const weekends=state.rest.includes(day)||(state.settings.weekends&&[0,6].includes(dateIn(day).getDay()));
    return '<section class="panel week-day'+(day===today()?' week-today':'')+'"><div class="panel-head"><div><h2>'+e(displayDate(day,{weekday:'long'}))+'</h2>'+
      '<time datetime="'+day+'" class="meta">'+e(displayDate(day))+'</time></div>'+
      (day>=today()?iconButton('Add action for '+displayDate(day),'plus','week-add',day):'')+'</div>'+
      (tasks.length?tasks.map(t=>taskRow(t,false,true)).join(''):empty(weekends?'Rest day':'No work planned'))+
      meeting.map(m=>listRow(m.title,txt(m.attendees),' '+edit('meetings',m),'<span class="soft-icon">'+glyph('people')+'</span>')).join('')+'</section>';
  }).join('');
  const intro=pilotWeekInfo(start);
  return heading('Week plan',range,button('Go to today','zoom','day','secondary','sun'))+zoomButtons()+
    '<div class="inline wrap-inline week-nav">'+button('Previous week','week-shift','-7','secondary')+
    button('This week','week-current','','ghost')+button('Next week','week-shift','7','secondary')+
    (pilot&&pilot.start!==start?button('Pilot week','pilot-week','','ghost','map'):'')+'</div>'+
    (intro?'<div class="week-intro">'+intro+'</div>':'')+'<div class="week-grid">'+days+'</div>';
}
