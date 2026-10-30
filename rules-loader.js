(async()=>{
 'use strict';
 const params=new URLSearchParams(location.search);if(params.has('cmsTextSource'))return;
 try{
  const draft=params.get('adminPreview')==='1'&&sessionStorage.getItem('payment-desk-admin-preview');
  let settings;
  if(draft)settings=SiteCMS.validate(JSON.parse(draft));
  else{const response=await fetch('site-settings.json',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('Налаштування недоступні');settings=SiteCMS.validate(await response.json());}
  SiteCMS.renderRules(settings);
 }catch{const notice=document.createElement('p');notice.role='status';notice.textContent='Не вдалося завантажити актуальні правки. Показано початкову версію документа.';document.querySelector('main').prepend(notice);}
})();
