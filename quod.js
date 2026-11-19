'use strict';

const smallLimit=25;
const dayKinds=[['deep','Deep research goal'],['small','Small maintenance task']];
const dayLimits={deep:1,small:2};
const goalPrompts=[
  ['doneLooks','What does done look like?','One paragraph states the claim and its assumptions','Describe what done looks like for this goal.'],
  ['obstacle','What is most likely to stall you?','I keep opening papers beyond the chapter scope','Name one obstacle that might stall this goal.'],
  ['response','What is your five-minute move if that happens?','I’ll write one question the next paper needs to answer','Enter a five-minute response you can try if the obstacle comes up.']
];
const hasText=value=>typeof value==='string'&&Boolean(value.trim());
const missingGoalPrompt=t=>goalPrompts.find(([key])=>!hasText(t[key]));
const onBoard=t=>Boolean(t&&!t.archivedAt&&['Next','Done'].includes(t.status));
const taskKind=t=>['deep','small'].includes(t?.planKind)?t.planKind:(t?.role==='Research'?'deep':'small');
const haveGoalPlan=t=>!missingGoalPrompt(t);
const canWork=t=>Boolean(onBoard(t)&&t.status==='Next'&&t.planDate===today());
const focusableTask=t=>canWork(t)&&(!researchLock||taskKind(t)==='deep');
const touchTask=(t,day=today())=>{t.lastTouched=day;};
const workdayStamp=(value)=>typeof value==='number'&&Number.isFinite(value)?localDate(new Date(value)):'';
class GoalPlanError extends Error {
  constructor(field,message) {
    super(message);
    this.field=field;
  }
}
function checkGoalPlan(t) {
  const missing=missingGoalPrompt(t);
  if(missing){
    const [field,,,message]=missing;
    throw new GoalPlanError(field,message);
  }
}
function checkSlotFit(t) {
  requireActionText(t.title);
  const kind=taskKind(t);
  if(kind==='deep'){
    if(t.role!=='Research') throw Error('Use a maintenance slot for teaching, service, or personal work.');
    checkGoalPlan(t);
  } else if(!num(t.minutes)||num(t.minutes)>smallLimit) throw Error('A maintenance slot fits an action of '+smallLimit+' minutes or less.');
}
function ensureSlot(t,date,skip=[]) {
  if(!date||!onBoard(t)) return;
  if(!validDay(date)||date<today()) throw Error('Choose today or a future work date.');
  checkSlotFit(t);
  const kind=taskKind(t);
  const occupied=state.tasks.filter(other=>other.id!==t.id&&!skip.includes(other.id)&&onBoard(other)&&other.planDate===date&&taskKind(other)===kind);
  if(occupied.length>=dayLimits[kind]){
    const label=date===today()?'Today':displayDate(date);
    throw Error(label+' already has '+(kind==='deep'?'its deep research goal':'two maintenance tasks')+'. Choose another date or keep this in Horizon.');
  }
}
function moveToDecision(t, reason, day=today()) {
  if(t.planDate) t.previousPlanDate=t.planDate;
  t.planDate='';t.primaryDay='';t.decisionReason=reason;t.decisionDay=day;
}
function clearDecision(t) {delete t.decisionReason;delete t.decisionDay;}
function refreshBoard(target) {
  const day=today();
  let changed=false;
  const scheduled=new Map();
  const sorted=[...target.tasks].sort((a,b)=>(b.status==='Done')-(a.status==='Done')||
    Number(b.primaryDay===b.planDate&&Boolean(b.planDate))-Number(a.primaryDay===a.planDate&&Boolean(a.planDate))||
    (a.startTime||'99:99').localeCompare(b.startTime||'99:99'));
  for(const t of sorted){
    if(!validDay(t.lastTouched)){
      const stamp=workdayStamp(t.updated);
      t.lastTouched=validDay(stamp)&&stamp<day?stamp:day;
      changed=true;
    }
    if(t.archivedAt||t.status==='Done'&&(!t.planDate||t.planDate<day)) continue;
    if(t.status==='Next'&&t.planDate&&t.planDate<day){
      moveToDecision(t,'carry',day);
      changed=true;
    }
    if(t.planDate&&onBoard(t)){
      const kind=taskKind(t), key=t.planDate+'|'+kind, used=scheduled.get(key)||0;
      let issue='';
      if(t.status!=='Done'){try{checkSlotFit(t);}catch{issue='setup';}}
      if(!issue&&used>=dayLimits[kind]) issue='capacity';
      if(issue){moveToDecision(t,issue,day);changed=true;}
      else scheduled.set(key,used+1);
    }
    if(!t.planDate&&!t.archivedAt&&['Next','Waiting'].includes(t.status)&&t.lastTouched<=shift(day,-21)&&t.decisionReason!=='compost'){
      moveToDecision(t,'compost',day);
      changed=true;
    }
  }
  return changed;
}
function slotRows() {
  const work=currentPlan();
  return dayKinds.map(([kind,label])=>{
    const slots=work.filter(t=>taskKind(t)===kind);
    const name=kind==='deep'?'Deep research':'Maintenance';
    return '<div class="slot-group"><div class="slot-head"><h3>'+e(name)+'</h3>'+
      (slots.length<dayLimits[kind]?button(kind==='deep'?'Set a goal':'Add a small task','new-slot',kind,'ghost','plus'):'')+'</div>'+
      (slots.length?slots.map(t=>taskRow(t)).join(''):txt(kind==='deep'?'Room for one goal worth finishing.':'Space for two small tasks.','meta slot-empty'))+'</div>';
  }).join('');
}
function goalFields(item, options={}) {
  const {prefix='',title='Plan the goal',open=true}=options;
  return '<fieldset class="goal-fields" data-goal-fields'+(open?'':' hidden')+'><legend>'+e(title)+'</legend>'+
    goalPrompts.map(([key,label,placeholder])=>field(label,prefix+key,item[key],{placeholder,maxLength:250})).join('')+
    '<p class="error-text" id="goal-field-error" role="alert" hidden></p></fieldset>';
}
function clearGoalError(form) {
  const notice=$('#goal-field-error',form);
  if(!notice||notice.hidden) return;
  const input=$('[aria-describedby="goal-field-error"]',form);
  input?.removeAttribute('aria-invalid');
  input?.removeAttribute('aria-describedby');
  notice.hidden=true;
}
function showGoalError(form,error) {
  const goal=$('[data-goal-fields]',form);
  const input=goal&&$('input[name="'+error.field+'"],input[name="return'+error.field+'"]',goal);
  if(!input||goal.hidden) return false;
  const notice=$('#goal-field-error',goal);
  const details=input.closest('details');
  if(details) details.open=true;
  input.closest('label').after(notice);
  input.setAttribute('aria-invalid','true');
  input.setAttribute('aria-describedby',notice.id);
  notice.textContent=error.message;
  notice.hidden=false;
  input.focus();
  return true;
}
function syncTaskGoal(form){
  const kind=$('[name=planKind]',form);
  if(!kind) return;
  const goal=$('[data-goal-fields]',form);
  if(goal){
    goal.hidden=kind.value!=='deep';
    if(goal.hidden) clearGoalError(form);
  }
}
function parkedGoalFields(task){
  const kind=taskKind(task||{role:'Research'});
  return tick('horizon','Park in Horizon and keep the return cue',false)+
    '<details class="details-options"><summary>Research goal setup</summary>'+
    '<div class="form-grid">'+select('Slot for a new action','returnKind',dayKinds,kind)+
    goalFields(task||{},{prefix:'return',title:'For a deep research goal'})+'</div></details>';
}

const decisionText={
  carry:'From a previous daily plan.',
  capacity:'The work date is already full.',
  setup:'This action needs a goal setup or a smaller scope.',
  compost:'This action has been untouched for 21 days.'
};
function decisionDrawer(){
  const pending=state.tasks.filter(t=>!t.archivedAt&&t.decisionReason&&['Next','Waiting'].includes(t.status));
  if(!pending.length) return '';
  return '<details class="decision-drawer"><summary>Decide<span class="decision-dot" aria-label="Decisions available"></span></summary>'+
    '<div class="decision-content">'+pending.sort((a,b)=>(a.decisionDay||'').localeCompare(b.decisionDay||'')).map(t=>{
      const old=t.decisionReason==='compost';
      const small=button(old?'Make a 15-minute starter':'Make it smaller','decision-smaller',t.id,'secondary','spark');
      const defer=old?'':button('Defer','decision-defer',t.id,'ghost','calendar');
      return '<article class="decision-row"><div><h4>'+e(t.title)+'</h4>'+txt(decisionText[t.decisionReason])+'</div>'+
        '<div class="inline wrap-inline">'+small+defer+button(old?'Compost':'Drop','archive-work',t.id,'ghost')+'</div></article>';
    }).join('')+'</div></details>';
}
function decisionSmaller(key) {
  const t=find('tasks',key);
  if(!t||t.archivedAt||t.status==='Done')return;
  const compost=t.decisionReason==='compost';
  const mins=compost?15:5;
  const label=compost?'Make a 15-minute starter':'Make this smaller';
  const defaultTitle=hasText(t.response)?t.response:hasText(t.title)&&num(t.minutes)<=mins?t.title:'';
  dialog(label,form('decision-smaller',txt(t.title,'plan-question')+
    field('Concrete starter action','title',defaultTitle,{required:true,placeholder:'Open the draft and outline one claim'})+
    select('Slot','planKind',t.role==='Research'?dayKinds:[dayKinds[1]],taskKind(t))+
    field('Work date','date',compost?'':today(),{type:'date'})+
    txt('Leave the date empty to keep the starter in Horizon. The original stays in the archive.','meta')+
    goalFields(t,{open:taskKind(t)==='deep'}),compost?'Save 15-minute starter':'Save five-minute starter','',t.id));
  syncTaskGoal($('form',modal));
}
function decisionDefer(key) {
  const t=find('tasks',key);
  if(!t||t.archivedAt||t.status==='Done')return;
  dialog('Defer this action',form('decision-defer',txt(t.title,'plan-question')+
    field('New work date','date','',{type:'date'})+
    txt('Leave the date empty to return this action to Horizon. Its due date stays the same.','meta'),
    'Defer action','',t.id));
}
function archiveWork(t, reason='Dropped') {
  if(state.focus.status!=='idle'&&state.focus.taskId===t.id) throw Error('Finish the current focus session before archiving its action.');
  if(t.planDate) t.previousPlanDate=t.planDate;
  t.planDate='';t.primaryDay='';t.archivedAt=today();t.archiveReason=reason;
  clearDecision(t);touchTask(t);
  if(state.focus.taskId===t.id){
    const f=state.focus;
    f.taskId='';f.sessionPreset=0;f.remaining=(f.mode==='break'?f.breakPreset:f.preset)*60;
  }
}
function archivePanel(){
  const archived=state.tasks.filter(t=>t.archivedAt);
  if(!archived.length)return '';
  return '<details class="decision-drawer"><summary>Archive</summary><div class="decision-content">'+archived.map(t=>
    listRow(t.title,txt([t.archiveReason,displayDate(t.archivedAt)].filter(Boolean).join(' · ')),
      button('Restore to Horizon','restore-work',t.id,'secondary'))).join('')+'</div></details>';
}
function finishFeed() {
  const finished=state.logs.filter(l=>!l.private&&(['Task done','Milestone done','Chapter cleared'].includes(l.kind)||(l.kind==='Focus'&&l.blockCompleted)));
  const recent=[...finished].sort(recentOrder).slice(0,4);
  return panel('Finishes',recent.length?recent.map(l=>listRow(l.title,
    txt((l.kind==='Focus'?'Focus block completed':l.kind==='Task done'?'Action completed':l.kind)+' · '+displayDate(l.date)),
    '', '<span class="soft-icon">'+glyph(l.kind==='Focus'?'timer':'check')+'</span>')).join(''):
    empty('Completed actions, focus blocks, and milestones will appear here.'),{className:'completed-panel',action:button('Research log','page','log','ghost')});
}
function recordMilestone(item,previous){
  if(item.status==='Done'&&previous?.status!=='Done'){
    const kind=item.kind==='Chapter'?'Chapter cleared':'Milestone done';
    const log={id:id(),kind,title:item.title,milestone:item.id,date:today(),created:Date.now()};
    item.finishLog=log.id;
    state.logs.push(log);
  } else if(previous?.status==='Done'&&item.status!=='Done'){
    state.logs=state.logs.filter(l=>l.id!==item.finishLog);
    delete item.finishLog;
  } else if(item.status==='Done'&&item.finishLog){
    const log=find('logs',item.finishLog);
    if(log)Object.assign(log,{title:item.title,kind:item.kind==='Chapter'?'Chapter cleared':'Milestone done'});
  }
}
async function quodSubmit(method,target,data){
  if(!['decision-smaller','decision-defer'].includes(method))return false;
  const work=find('tasks',target.dataset.key);
  if(!work||work.archivedAt||work.status==='Done')throw Error('Choose an open action.');
  if(method==='decision-defer'){
    ensureSlot({...work,status:'Next'},data.date);
    work.planDate=data.date;work.primaryDay='';
    if(work.date&&work.date<today())work.reviewedDue=work.date;
    clearDecision(work);touchTask(work);
    closeDialog();commit('Action deferred.');
  } else {
    const minutes=work.decisionReason==='compost'?15:5;
    const next={id:id(),title:data.title,role:work.role,status:'Next',minutes,planDate:data.date,primaryDay:data.date,
      planKind:data.planKind,doneLooks:data.doneLooks,obstacle:data.obstacle,response:data.response,
      milestone:work.milestone,parent:work.id,pilotId:work.pilotId,fiveMinute:minutes===5,lastTouched:today(),
      date:work.date,reviewedDue:work.date<today()?work.date:'',details:'Starter for '+work.title};
    requireActionText(next.title);
    if(taskKind(next)==='deep'&&data.date)checkGoalPlan(next);
    ensureSlot(next,next.planDate,[work.id]);
    archiveWork(work,'Replaced by a starter');
    state.tasks.push(next);
    if(canWork(next)&&state.focus.status==='idle')selectedFocus(next.id,true);
    closeDialog();commit('Starter saved.');
  }
  return true;
}
const quodActions={
  'new-slot':kind=>{
    const pilot=state.support.pilot;
    const date=today();
    const milestone=kind==='deep'&&pilot&&date>=pilot.start&&date<=shift(pilot.start,6)?pilot.milestone:'';
    editDialog('tasks','',{planKind:kind,planDate:date,role:kind==='deep'?'Research':'Personal',minutes:kind==='small'?15:45,milestone});
  },
  'decision-smaller':decisionSmaller,
  'decision-defer':decisionDefer,
  'archive-work':key=>{
    const t=find('tasks',key);
    if(t&&!t.archivedAt&&t.status!=='Done'){archiveWork(t,t.decisionReason==='compost'?'Composted':'Dropped');commit('Moved to the archive.');}
  },
  'restore-work':key=>{
    const t=find('tasks',key);
    if(!t?.archivedAt)return;
    delete t.archivedAt;delete t.archiveReason;touchTask(t);clearDecision(t);
    commit('Restored to Horizon.');
  }
};
const goalEvidence=[
  {label:'Goals & effort',title:'Pair the outcome with an obstacle',finding:'Experiments on idealized positive fantasies found reduced energization in the conditions studied. Separate experiments on publicly acknowledged identity-related intentions found lower enactment under some conditions.',design:'Quod makes a small outcome, likely obstacle, and concrete response part of goal setup.',author:'Kappes & Oettingen (2011)',url:'https://doi.org/10.1016/j.jesp.2011.02.003',second:['Gollwitzer et al. (2009)','https://pubmed.ncbi.nlm.nih.gov/19389130/']},
  {label:'Goal pursuit',title:'Make a concrete if–then plan',finding:'A meta-analysis of mental contrasting with implementation intentions included 21 studies and estimated a small-to-moderate effect on goal attainment. The authors reported possible publication bias.',design:'The goal form uses that sequence. The daily slot limits and 21-day review are product choices.',author:'Wang et al. (2021)',url:'https://doi.org/10.3389/fpsyg.2021.565202'}
];
