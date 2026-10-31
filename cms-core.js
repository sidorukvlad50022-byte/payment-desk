(function(root){
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 const defaults={
  installment:{label:'Оплата частинами',title:'Покупка сьогодні.\nЗручні платежі щомісяця.',subtitle:'Оберіть банк — умови та розрахунок уже під рукою.',body:''},
  paper:{label:'Паперові кредити',title:'Порівняйте. Оберіть. Поясніть.',subtitle:'Банки, комісії та SMS-платежі в одному розрахунку.',body:''},
  products:{label:'Кредитні продукти',title:'Кредитні продукти',subtitle:'Збережені умови з конфігурації вашого бота.',body:''},
  services:{label:'Послуги',title:'Більше можливостей для покупки.',subtitle:'Порівняйте до трьох послуг з урахуванням аксесуарів і Trade-in.',body:''},
  catalog:{label:'Наповнення послуг',title:'Усі умови під рукою.',subtitle:'Структура й наповнення довідника з вашого Telegram-бота.',body:''},
  receipt:{label:'Створити чек',title:'Створити чек',subtitle:'Додайте товари вручну або знайдіть їх за артикулом на ya.ua.',body:''},
  rules:{label:'Правила та вимоги сервісу',title:'Правила та вимоги сервісу',subtitle:'',body:''},
  cheat:{label:'Шпора менеджера',title:'Шпора менеджера',subtitle:'Короткі підказки для впевненої консультації клієнта.',body:''}
 };
 const empty=()=>({version:1,paperSource:'sheet',promoServiceRates:{},credit:null,serviceCalculator:null,services:null,pages:{},site:{title:'Yabluka Helper',description:'Yabluka Helper — калькулятор кредитних платежів, послуги та шпаргалка менеджера.'}});
 function validate(value){
  const fail=m=>{throw new Error(m);};
  const object=(v,label)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail(label+': очікується об’єкт.');};
  const string=(v,label,max=20000)=>{if(typeof v!=='string'||v.length>max)fail(label+': некоректний текст.');};
  const name=(v,label)=>{string(v,label,200);if(!v.trim())fail(label+': назва не може бути порожньою.');};
  const number=(v,label,max=100000000)=>{if(!/^\d+(?:\.\d{1,6})?$/.test(String(v))||!Number.isFinite(Number(v))||Number(v)>max)fail(label+': введіть невід’ємне число (до 6 знаків після крапки).');};
  const months=v=>{if(!Number.isInteger(Number(v))||Number(v)<1||Number(v)>120)fail('Строк має бути від 1 до 120 місяців.');};
  function safe(v,depth=0){if(depth>20)fail('Завелика вкладеність.');if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))fail('Недозволений ключ.');safe(x,depth+1);}}
  function sections(v){if(!Array.isArray(v))fail('Додаткові секції мають бути списком.');for(const s of v){object(s,'Секція');string(s.title,'Заголовок');if(!Array.isArray(s.lines))fail('Вміст секції має бути списком.');s.lines.forEach(x=>string(x,'Рядок секції'));if(s.bullets!==undefined&&typeof s.bullets!=='boolean')fail('Невірний тип секції.');}}
  function content(v){if(!Array.isArray(v.benefits))fail('Наповнення послуги має бути списком.');v.benefits.forEach(x=>string(x,'Пункт послуги'));sections(v.extra_sections||[]);}
  object(value,'Налаштування');safe(value);
  function promoList(list){if(list==null)return;if(!Array.isArray(list)||list.length>500)fail('Список акційних кредитів має бути масивом назв.');for(const item of list)name(item,'Акційний кредит');if(new Set(list).size!==list.length)fail('Акційні кредити не повинні повторюватися.');}
  promoList(value.servicePromoProducts);
  function serviceRates(rates){if(rates==null)return;if(!Array.isArray(rates)||rates.length>500)fail('Відсотки послуг мають бути списком.');for(const rate of rates)number(rate,'Відсоток послуги',1000);if(new Set(rates.map(Number)).size!==rates.length)fail('Відсотки послуг не повинні повторюватися.');}
  if(value.promoServiceRates!=null){object(value.promoServiceRates,'Доступні відсотки послуг');for(const [product,rule] of Object.entries(value.promoServiceRates)){name(product,'Кредитний продукт');if(rule==null||Array.isArray(rule))serviceRates(rule);else{object(rule,'Нові / БУ');for(const [condition,rates] of Object.entries(rule)){if(!['new','used'].includes(condition))fail('Невідомий стан пристрою.');serviceRates(rates);}}}}

  if(value.version!==1)fail('Непідтримувана версія налаштувань.');
  if(!['sheet','manual'].includes(value.paperSource))fail('Невідоме джерело кредитних ставок.');
  if(value.paperSource==='manual'&&!value.credit)fail('Для ручних ставок потрібен каталог кредитів.');
  if(value.credit){
   object(value.credit,'Кредити');const banks=value.credit.installment_banks;object(banks,'Банки');if(!Object.keys(banks).length)fail('Залиште хоча б один банк оплати частинами.');
   for(const [bank,b] of Object.entries(banks)){name(bank,'Банк');object(b.payment_options,'Строки');if(!Object.keys(b.payment_options).length)fail('Додайте хоча б один строк для '+bank);for(const [m,r] of Object.entries(b.payment_options)){months(m);number(r,'Комісія',1000);}}
   for(const kind of ['promo_credit_products','regular_credit_products']){object(value.credit[kind],'Продукти');for(const [n,p] of Object.entries(value.credit[kind])){name(n,'Продукт');months(p.months);if(p.serviceCategories!==undefined){if(!Array.isArray(p.serviceCategories))fail('Категорії кредиту мають бути списком.');p.serviceCategories.forEach(v=>name(v,'Категорія пристрою'));}object(p.banks,'Банки продукту');if(!Object.keys(p.banks).length)fail('Додайте банк для '+n);for(const [bn,b] of Object.entries(p.banks)){name(bn,'Банк');number(b.commission_percent,'Комісія',1000);number(b.sms_amount,'SMS');number(b.max_amount,'Ліміт');if(Number(b.max_amount)<=0)fail('Ліміт має бути більшим за нуль.');if(!['fixed','monthly'].includes(b.sms_mode))fail('Невірний режим SMS.');}}}
  }
  if(value.serviceCalculator){object(value.serviceCalculator,'Послуги');if(!Object.keys(value.serviceCalculator).length)fail('Потрібен хоча б один тип пристрою.');for(const [device,cats] of Object.entries(value.serviceCalculator)){name(device,'Пристрій');object(cats,'Категорії');if(!Object.keys(cats).length)fail('Додайте категорію.');for(const [category,group] of Object.entries(cats)){name(category,'Категорія');object(group.offers,'Пропозиції');for(const [title,offer] of Object.entries(group.offers)){name(title,'Послуга');content(offer);promoList(offer.allowedPromoProducts);if(offer.glass_discount_percent!==undefined)number(offer.glass_discount_percent,'Знижка на скло',100);if(!Array.isArray(offer.variants)||!offer.variants.length)fail('Додайте строк послуги '+title);for(const variant of offer.variants){if(!Array.isArray(variant)||variant.length!==3)fail('Невірний тариф.');name(variant[0],'Строк послуги');number(variant[1],'Відсоток послуги',1000);number(variant[2],'Мінімальна ціна');}}}}}
  function tree(n){object(n,'Довідник');if(n.type==='menu'){object(n.children,'Розділи');for(const [k,v] of Object.entries(n.children)){name(k,'Розділ');tree(v);}}else if(n.type==='card'){name(n.title,'Назва картки');string(n.term_label,'Строк');string(n.price_label,'Ціна');content(n);}else fail('Невідомий тип картки.');}
  if(value.services)tree(value.services);
  object(value.pages,'Сторінки');for(const [key,p] of Object.entries(value.pages)){if(!Object.hasOwn(defaults,key)&&!/^page-[a-z0-9-]{1,60}$/.test(key))fail('Невірний ідентифікатор сторінки.');object(p,'Сторінка');for(const field of ['label','title','subtitle','body'])string(p[field],'Сторінка '+field);name(p.title,'Заголовок сторінки');name(p.label,'Назва в меню');if(p.texts){object(p.texts,'Тексти');for(const [k,v] of Object.entries(p.texts)){if(!/^text-\d+$/.test(k))fail('Невірний ідентифікатор тексту.');string(v,'Текст');}}}
  object(value.site,'Сайт');name(value.site.title,'Назва сайту');string(value.site.description,'Опис сайту');
  if(JSON.stringify(value).length>700000)fail('Налаштування завеликі.');
  return value;
 }
 function apply(data,settings){validate(settings);for(const key of ['credit','serviceCalculator','services'])if(settings[key])data[key]=clone(settings[key]);return data;}
 function editableTexts(panel){return [...panel.querySelectorAll('.cheat-card h2,.cheat-card h3,.cheat-card p,.cheat-card li,.checklist label span,.cheat-instruction > summary')].map((el,i)=>({key:'text-'+i,el}));}
 function renderPages(settings){
  if(!settings)return;
  document.title=settings.site.title;const meta=document.querySelector('meta[name=description]');if(meta)meta.content=settings.site.description;
  for(const [key,page] of Object.entries(settings.pages)){
   if(key==='rules')continue;
   let panel=[...document.querySelectorAll('[data-panel]')].find(p=>p.dataset.panel===key);
   if(!panel){panel=document.createElement('section');panel.dataset.panel=key;panel.hidden=true;const header=document.createElement('div');header.className='page-title';const inner=document.createElement('div');inner.append(document.createElement('h1'),document.createElement('p'));header.append(inner);panel.append(header);document.querySelector('main').append(panel);const link=document.createElement('a');link.className='top-link';link.dataset.page=key;link.href='#'+key;document.querySelector('.top-navigation').append(link);}
   const title=panel.querySelector('.page-title h1'),intro=panel.querySelector('.page-title p');if(title){title.textContent=page.title;title.style.whiteSpace='pre-line';}if(intro)intro.textContent=page.subtitle;
   for(const {key:id,el} of editableTexts(panel))if(Object.hasOwn(page.texts||{},id))el.textContent=page.texts[id];
   document.querySelectorAll('[data-page]').forEach(link=>{if(link.dataset.page===key)link.textContent=page.label;});
   let body=panel.querySelector('.cms-page-body');if(!body){body=document.createElement('article');body.className='card cms-page-body';panel.querySelector('.page-title')?.after(body);}body.hidden=!page.body;body.style.whiteSpace='pre-wrap';body.textContent=page.body;
  }
  const footer=document.querySelector('footer');if(footer&&!footer.querySelector('[data-admin-link]')){const a=document.createElement('a');a.href='admin.html';a.textContent='Адміністрування';a.dataset.adminLink='';footer.append(a);}
  const note=document.querySelector('.import-note');if(note&&settings.paperSource==='manual')note.textContent='Умови кредитів і послуг керуються через адмінпанель.';
 }
 function editableRuleTexts(article){return [...article.querySelectorAll('h2,h3,p,li,td')].filter(el=>!el.closest('.cms-rules-intro,.cms-rules-body')).map((el,i)=>({key:'text-'+i,el}));}
 function renderRules(settings){
  const page=settings.pages.rules;if(!page)return;const article=document.querySelector('article');
  for(const {key,el} of editableRuleTexts(article))if(Object.hasOwn(page.texts||{},key))el.textContent=page.texts[key];
  document.title=page.title;article.querySelector('h1').textContent=page.title;
  const intro=document.createElement('p');intro.className='cms-rules-intro';intro.textContent=page.subtitle;intro.hidden=!page.subtitle;
  const body=document.createElement('p');body.className='cms-rules-body';body.textContent=page.body;body.hidden=!page.body;
  article.querySelector('h1').after(intro,body);
 }
 const serviceCondition=device=>device==='♻️ Outlet'?'used':'new';
 function promoRates(settings,product,condition){const rule=settings?.promoServiceRates?.[product];return rule==null||Array.isArray(rule)?rule:rule[condition];}
 function promoProducts(catalog,settings,offer,device,category){
  const rate=Number(offer?.variants?.[0]?.[1]??0),condition=serviceCondition(device);
  return Object.fromEntries(Object.entries(catalog||{}).filter(([product,config])=>{if(config.serviceCategories&&!config.serviceCategories.includes(category))return false;const rates=promoRates(settings,product,condition);return rates==null||rates.some(value=>Number(value)===rate);}));
 }
 const api={serviceCondition,promoRates,promoProducts,clone,defaults,empty,validate,apply,renderPages,editableTexts,editableRuleTexts,renderRules};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SiteCMS=api;
})(globalThis);
