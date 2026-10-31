(()=>{
 'use strict';
 let data=globalThis.RepairData;
 const select=document.getElementById('repair-model'),body=document.getElementById('repair-prices');
 if(!data||!select||!body)return;
 const element=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e;};
 const refresh=document.getElementById('repair-refresh'),status=document.getElementById('repair-updated');
 const printInfo=element('p','Прайс станом на '+data.updatedOn+'.');printInfo.className='repair-print-date';document.getElementById('repair-title').after(printInfo);
 let busy=false,live=false;
 function modelOptions(){
  const previous=select.value;select.replaceChildren();
  for(const model of data.models){const option=element('option',model.name);option.value=model.name;select.append(option);}
  if(data.models.some(model=>model.name===previous))select.value=previous;
 }
 modelOptions();
 document.getElementById('repair-source').href=data.sourceUrl;
 status.textContent='Резервний прайс станом на '+data.updatedOn+'. Оновлюємо ціни з Google-таблиці…';
 function orderedServices(){
  const patterns=[/заміна екран/iu,/заміна ак{1,2}ум/iu,/заміна корпус/iu,/заміна скла корпус/iu];
  return data.services.map((service,index)=>({service,index,priority:patterns.findIndex(pattern=>pattern.test(service.name))})).sort((a,b)=>(a.priority<0?4:a.priority)-(b.priority<0?4:b.priority)||a.index-b.index);
 }
 async function sync(){
  if(busy)return;busy=true;refresh.disabled=true;
  try{
   const response=await fetch(RepairSource.url,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('HTTP '+response.status);
   const updated=RepairSource.parse(await response.text());data={...data,...updated,updatedOn:new Date().toLocaleDateString('uk-UA')};printInfo.textContent='Прайс станом на '+data.updatedOn+'.';modelOptions();render();live=true;
   status.textContent='Оновлено з Google-таблиці: '+new Date().toLocaleString('uk-UA')+'.';
  }catch{
   status.textContent=live?'Не вдалося оновити ціни. Залишено останній завантажений прайс.':'Google-таблиця недоступна. Показано резервний прайс станом на '+data.updatedOn+'. Спробуйте «Оновити ціни».';
  }finally{busy=false;refresh.disabled=false;}
 }
 function render(){
  const model=data.models.find(model=>model.name===select.value);if(!model)return;
  document.getElementById('repair-title').textContent=model.name;
  body.replaceChildren(...orderedServices().map(({service,index})=>{
   const price=(model.prices[index]||'').trim(),available=price!==''&&price!=='-'&&price!=='—',row=document.createElement('tr'),name=element('th',service.name);name.scope='row';
   row.classList.toggle('repair-unavailable',!available);
   row.append(name,element('td',available?price+' ₴':'Недоступно'));return row;
  }));
  try{localStorage.setItem('payment-desk-repair-model',model.name);}catch{}
 }
 try{const saved=localStorage.getItem('payment-desk-repair-model');if(data.models.some(model=>model.name===saved))select.value=saved;}catch{}
 document.getElementById('repair-print').addEventListener('click',()=>window.print());
 refresh.addEventListener('click',sync);
 select.addEventListener('change',render);render();sync();
 setInterval(()=>{if(!document.hidden&&location.hash==='#repairs')sync();},15*60*1000);
})();
