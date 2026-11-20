'use strict';

function taskProject(task) {
  return find('projects',task.project)||find('projects',find('milestones',task.milestone)?.project);
}
function projectsView() {
  const items=[...state.projects].sort((a,b)=>(a.status==='Done')-(b.status==='Done')||a.title.localeCompare(b.title));
  return heading('Projects','Organize your PhD into smaller pieces of work.',button('Add project','new','projects','primary','plus'))+
    '<div class="stack">'+(items.map(project=>{
      const milestones=state.milestones.filter(m=>m.project===project.id).sort(dateOrder);
      const tasks=state.tasks.filter(t=>!t.archivedAt&&taskProject(t)?.id===project.id);
      const showTasks=tasks.length?'<details class="details-options compact"><summary>Actions ('+tasks.length+')</summary>'+tasks.map(t=>taskRow(t,true)).join('')+'</details>':'';
      return panel(project.title,txt(project.outcome,'format muted')+'<div class="inline wrap-inline compact">'+badge(project.status||'Planned')+
        button('Add milestone','project-milestone',project.id,'secondary','plus')+button('Add action','project-action',project.id,'secondary','plus')+'</div>'+
        (milestones.length?'<div class="compact">'+milestones.map(m=>listRow(m.title,txt([m.status,displayDate(m.date)].filter(Boolean).join(' · '),'meta'),edit('milestones',m))).join('')+'</div>':'')+showTasks,
        {action:edit('projects',project)});
    }).join('')||panel('Start a project',empty('Add a project for a paper, a thesis chapter, or an experiment. You can link existing work from its editor.')))+'</div>';
}

const workLimit=16*60;
const defaultResearchBudget=4*60;
const workWeekdays=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const workMinutes=value=>Number.isInteger(value)&&value>=0&&value<=workLimit?value:null;
function loadWorkHours(raw) {
  const teaching=Array.from({length:7},(_,index)=>workMinutes(raw?.teaching?.[index])??0);
  const days={};
  for(const [date,day] of Object.entries(raw?.days??{})){
    if(!validDay(date)) continue;
    const teaching=workMinutes(day?.teaching), research=workMinutes(day?.research), budget=workMinutes(day?.budget);
    if(teaching!==null||research!==null||budget!==null) days[date]={teaching,research,budget};
  }
  return {target:workMinutes(raw?.target)??0,teaching,days};
}
function workDayIndex(date) {return (dateIn(date).getDay()+6)%7;}
function workRestDay(date) {return state.rest.includes(date)||(state.settings.weekends&&workDayIndex(date)>=5);}
function workLogsByDay() {
  const days=new Map();
  const tasks=new Map(state.tasks.map(task=>[task.id,task]));
  for(const log of state.logs){
    if(!['Focus','Effort','Writing'].includes(log.kind)||!validDay(log.date)) continue;
    const task=tasks.get(log.task);
    if(task?.example||state.sample&&log.id==='l3'&&log.created===3) continue;
    const role=log.role||task?.role||'Research';
    if(role!=='Research'&&role!=='Teaching') continue;
    const minutes=Number.isFinite(log.seconds)?log.seconds/60:Number(log.minutes);
    if(!Number.isFinite(minutes)||minutes<=0) continue;
    const day=days.get(log.date)||{Research:0,Teaching:0};
    day[role]+=minutes;
    days.set(log.date,day);
  }
  return days;
}
function workDay(date,logs) {
  const override=state.workHours.days[date], logged=logs.get(date);
  return {
    date, rest:workRestDay(date),
    research:override?.research??(logged?.Research>0?Math.min(workLimit,Math.round(logged.Research)):null),
    teaching:override?.teaching??Math.min(workLimit,Math.max(state.workHours.teaching[workDayIndex(date)],Math.round(logged?.Teaching??0)))
  };
}
function workHistory(logs) {
  const cutoff=fromToday(-56), end=today();
  return [...new Set([...logs.keys(),...Object.keys(state.workHours.days)])].filter(date=>date>=cutoff&&date<end)
    .sort().reverse().map(date=>workDay(date,logs)).filter(day=>day.research!==null&&!day.rest);
}
function typicalWork(days) {
  const values=days.slice(0,8).map(day=>day.research).sort((a,b)=>a-b);
  if(values.length<3) return null;
  const middle=Math.floor(values.length/2);
  return {minutes:values.length%2?values[middle]:(values[middle-1]+values[middle])/2,count:values.length};
}
function suggestWork(day,history) {
  if(day.rest||!state.workHours.target) return null;
  const similar=history.filter(prev=>Boolean(prev.teaching)===Boolean(day.teaching)&&Math.abs(prev.teaching-day.teaching)<=60);
  const weekday=typicalWork(similar.filter(prev=>workDayIndex(prev.date)===workDayIndex(day.date)));
  const comparable=weekday??typicalWork(similar);
  const teachingLabel=day.teaching?'days with similar teaching hours':'days without teaching';
  if(comparable){
    return {minutes:Math.round(comparable.minutes/15)*15,basis:'Based on '+comparable.count+' recorded '+(weekday?workWeekdays[workDayIndex(day.date)]+'s like this one':teachingLabel)+'.'};
  }
  const usual=day.teaching?typicalWork(history.filter(prev=>!prev.teaching)):null;
  const minutes=Math.round(Math.max(0,(usual?.minutes??state.workHours.target)-day.teaching)/15)*15;
  const basis=usual?'Based on '+usual.count+' days without teaching, adjusted for teaching time.':
    day.teaching?'Your starting target, adjusted for teaching time.':'Your starting target. Quod starts adapting after three comparable days with records.';
  return {minutes,basis};
}
function workDuration(minutes) {
  const hours=Math.floor(minutes/60), remainder=minutes%60;
  return hours?hours+' h'+(remainder?' '+remainder+' min':''):minutes+' min';
}
function researchBudget(date,logs=workLogsByDay(),history=workHistory(logs)) {
  const override=state.workHours.days[date]?.budget;
  if(override!=null) return override;
  const day=workDay(date,logs);
  return suggestWork(day,history)?.minutes??Math.max(0,(state.workHours.target||defaultResearchBudget)-day.teaching);
}
function plannedResearchMinutes(tasks) {
  return tasks.filter(researchBlock).reduce((total,task)=>total+num(task.minutes),0);
}
function defaultBlockMinutes(date,minutes) {
  const booked=plannedResearchMinutes(state.tasks.filter(task=>task.planDate===date&&onBoard(task)));
  const left=researchBudget(date)-booked;
  return left>0?Math.min(minutes,left):minutes;
}
function researchPlanSummary(tasks,budget) {
  const planned=plannedResearchMinutes(tasks);
  return workDuration(planned)+' planned of '+workDuration(budget)+(planned>budget?' · '+workDuration(planned-budget)+' over budget':'');
}
function workHoursPanel() {
  const logs=workLogsByDay(), day=workDay(today(),logs), suggestion=suggestWork(day,workHistory(logs));
  const main=day.rest?'Rest day':suggestion?(suggestion.minutes?workDuration(suggestion.minutes)+' suggested for research':'No research time suggested'):'Set a starting target';
  const recorded=[day.teaching?workDuration(day.teaching)+' teaching':'',day.research!==null?workDuration(day.research)+' research recorded':''].filter(Boolean);
  return panel('Work hours',txt(main,'work-hours-value')+
    txt(recorded.join(' · '),'meta')+
    txt(suggestion?.basis||(!state.workHours.target?'Set your usual research hours and add teaching time.':''),'meta compact')+
    '<div class="inline wrap-inline compact">'+button('Edit today’s hours','work-day',day.date,'secondary')+
    button(state.workHours.target?'Work hours settings':'Set up work hours','work-hours','','ghost')+'</div>',{className:'subtle'});
}
function workWeekSummary(date,tasks,logs,history) {
  const day=workDay(date,logs), suggestion=date>=today()?suggestWork(day,history):null;
  const summary=[day.rest?'Rest day':'',day.teaching?workDuration(day.teaching)+' teaching':'',
    suggestion?(suggestion.minutes?workDuration(suggestion.minutes)+' suggested research':'No research time suggested'):'',
    date>=today()?researchPlanSummary(tasks,researchBudget(date,logs,history)):'',
    day.research!==null?workDuration(day.research)+' research recorded':''].filter(Boolean);
  return '<div class="inline wrap-inline compact work-day-summary">'+txt(summary.join(' · '),'meta')+
    button('Edit hours','work-day',date,'ghost')+'</div>';
}
const hoursField=(label,name,value,options={})=>field(label,name,value,{type:'number',min:0,max:16,step:0.25,...options});
function workHoursDialog() {
  const {target,teaching}=state.workHours;
  dialog('Work hours settings',form('work-hours',hoursField('Research hours on a day without teaching','target',target?target/60:'',{placeholder:'e.g. 4'})+
    txt('Quod learns from research time you log or enter as a daily total. It uses your suggested hours as the planning budget for research and reading. Leave the target blank for a starting budget of '+workDuration(defaultResearchBudget)+' before teaching. Days with no records and rest days stay out of the estimate.','meta')+
    '<fieldset class="goal-fields"><legend>Recurring teaching hours</legend><div class="form-pair">'+
    workWeekdays.map((day,index)=>hoursField(day,'teaching'+index,teaching[index]?teaching[index]/60:'',{placeholder:'0'})).join('')+'</div></fieldset>',
    'Save work hours'));
}
function workDayDialog(date) {
  if(!validDay(date)) return;
  const override=state.workHours.days[date];
  const current=workDay(date,workLogsByDay());
  const canRecord=date<=today();
  dialog('Hours for '+displayDate(date,{weekday:'short',month:'short',day:'numeric'}),form('work-day',
    hoursField('Teaching hours for this date','teaching',override?.teaching!=null?override.teaching/60:'',{placeholder:String(current.teaching/60)})+
    txt('Leave blank to use your recurring hours and teaching logs. Enter 0 if a class is cancelled.','meta')+
    (date>=today()?hoursField('Research and reading budget (hours)','budget',override?.budget!=null?override.budget/60:'',{placeholder:String(researchBudget(date)/60)})+
      txt('Leave blank to use Quod’s budget for this date.','meta'):'')+
    (canRecord?field('Actual research minutes (optional)','research',override?.research,{type:'number',min:0,max:workLimit,placeholder:current.research??''})+
      txt('A daily total replaces time from your logs for this date. Enter 0 to record a day with no research.','meta'):'')+
    (workRestDay(date)?txt('This date is marked as rest and stays out of the estimate.','meta'):''),'Save day','',date));
}
function saveWorkHours(method,target,data) {
  const minutes=(value,scale)=>{
    if(!hasText(value)) return null;
    const parsed=workMinutes(Math.round(Number(value)*scale));
    if(parsed===null) throw Error('Enter a time between 0 and 16 hours.');
    return parsed;
  };
  if(method==='work-hours'){
    const targetMinutes=minutes(data.target,60)??0;
    const teaching=workWeekdays.map((_,index)=>minutes(data['teaching'+index],60)??0);
    Object.assign(state.workHours,{target:targetMinutes,teaching});
  } else {
    const date=target.dataset.key;
    if(!validDay(date)) throw Error('Choose a valid date.');
    const teaching=minutes(data.teaching,60);
    const research=date<=today()?minutes(data.research,1):null;
    const budget=date>=today()?minutes(data.budget,60):state.workHours.days[date]?.budget??null;
    if(teaching===null&&research===null&&budget===null) delete state.workHours.days[date];
    else state.workHours.days[date]={teaching,research,budget};
  }
  closeDialog();
  commit('Work hours saved.');
}
