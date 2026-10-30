(async()=>{
 'use strict';
 let settings=SiteCMS.empty();
 try{
  const draft=new URLSearchParams(location.search).get('adminPreview')==='1'&&sessionStorage.getItem('payment-desk-admin-preview');
  if(draft)settings=SiteCMS.validate(JSON.parse(draft));
  else{const response=await fetch('site-settings.json',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('Налаштування недоступні');settings=SiteCMS.validate(await response.json());}
  SiteCMS.apply(BotData,settings);
 }catch(error){console.warn('Використано базову конфігурацію:',error.message);const notice=document.createElement('p');notice.role='status';notice.className='error';notice.textContent='Не вдалося завантажити актуальні налаштування. Показано базові умови; оновіть сторінку перед розрахунком.';document.querySelector('main').prepend(notice);}
 globalThis.SiteSettings=settings;
 const script=document.createElement('script');script.src='bot-app.js?v=20261030-product-condition-rates1';script.onerror=()=>{document.querySelector('main').prepend(Object.assign(document.createElement('p'),{textContent:'Не вдалося завантажити сайт. Оновіть сторінку.'}));};document.body.append(script);
})();
