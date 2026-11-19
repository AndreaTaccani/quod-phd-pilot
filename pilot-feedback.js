'use strict';

const feedback=document.querySelector('#pilot-feedback');
const result=document.querySelector('#feedback-result');
const draft=document.querySelector('#feedback-draft');
const status=document.querySelector('#feedback-status');
const email=document.querySelector('#feedback-email');
const recipient=document.querySelector('#feedback-recipient').getAttribute('href');

feedback.addEventListener('submit',event=>{
  event.preventDefault();
  const data=new FormData(feedback);
  const helped=String(data.get('helped')||'').trim();
  const barrier=String(data.get('barrier')||'').trim();
  if(!helped||!barrier){
    status.textContent='Enter a short answer to both questions.';
    return;
  }
  const body=['What helped you finish?',helped,'','What got in the way?',barrier].join('\r\n');
  const encode=value=>encodeURIComponent(value.toWellFormed ? value.toWellFormed() : value);
  draft.value=body;
  email.href=recipient+'?subject='+encode('Quod one-week pilot feedback')+'&body='+encode(body);
  status.textContent='';
  result.hidden=false;
  document.querySelector('#draft-title').focus();
});
feedback.addEventListener('input',()=>{
  if(result.hidden)return;
  result.hidden=true;
  email.removeAttribute('href');
  status.textContent='';
});
document.querySelector('#feedback-copy').addEventListener('click',async()=>{
  try{
    await navigator.clipboard.writeText(draft.value);
    status.textContent='Feedback copied.';
  }catch{
    draft.focus();
    draft.select();
    if(document.execCommand?.('copy')) status.textContent='Feedback copied.';
    else status.textContent='Feedback selected. Use your device’s copy command.';
  }
});
