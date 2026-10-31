(function(root){'use strict';
const paperSheetUrl='https://docs.google.com/spreadsheets/d/1j1Bzaf9dLJMff3TX_BeKT4UhwneK76M_hKWo5fPtF0o/export?format=csv&gid=0';
function parseCsv(csv){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<csv.length;i++){const ch=csv[i],next=csv[i+1];if(ch==='"'){if(quoted&&next==='"'){cell+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){row.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&next==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}else cell+=ch;}if(cell||row.length){row.push(cell);if(row.some(v=>v.trim()))rows.push(row);}return rows;}
const bankAliases={UkrSibBank:['ukrsib','укрсиб'],Alliance:['alliance','альянс'],Globus:['глобус'],SenseBank:['sense','sensbank','sens','сенс'],UnexBank:['unex','юнекс'],IdeaBank:['idea','ідея'],Superium:['superium'],PayLater:['плати позже','платипозже'],ModernFactoring:['сучасний факторинг','факторинг']};
const normalizeBank=name=>{const value=name.toLocaleLowerCase('uk-UA');return Object.entries(bankAliases).find(([,aliases])=>aliases.some(a=>value.includes(a)))?.[0]||name.trim();};
const numberFrom=value=>{const match=String(value||'').replace(/\s/g,'').match(/-?\d+(?:[.,]\d+)?/);return match?Number(match[0].replace(',','.')):0;};
function bankNumber(text,bank,fallback=0){const raw=String(text||'').replace(/\n/g,' '),aliases=bankAliases[bank]||[bank];for(const alias of aliases){const escaped=alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),match=raw.match(new RegExp(escaped+'[^0-9]{0,30}([0-9](?:[0-9 \u00a0\u202f]*[0-9])?(?:[.,][0-9]+)?)','i'));if(match)return numberFrom(match[1]);}return fallback;}
function bankHas(cell,bank){const raw=String(cell||'').toLocaleLowerCase('uk-UA');return (bankAliases[bank]||[bank]).some(a=>raw.includes(a));}
const isPromoProduct=name=>{const value=String(name||'').toLocaleLowerCase('uk-UA').replace(/\s+/g,'');return value.includes('04авд')||value.includes('low')||value.includes('high')||value.includes('(к)')||value.includes('(k)')||value.endsWith('к')||/(^|\s)к($|\s)/i.test(value);};
const canonicalProduct=name=>String(name||'').replace(/\s+/g,' ').trim().replace(/\s*\([kк]\)/ig,'(К)');
function bankField(cell,bank){
 const text=String(cell||'').replace(/\r?\n/g,' '),aliases=Object.entries(bankAliases).flatMap(([name,values])=>values.map(alias=>({name,alias}))).sort((a,b)=>b.alias.length-a.alias.length);
 const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pattern=new RegExp(aliases.map(item=>escape(item.alias)).join('|'),'gi'),matches=[...text.matchAll(pattern)];
 const own=matches.findIndex(match=>aliases.find(item=>item.alias===match[0].toLocaleLowerCase('uk-UA'))?.name===bank);
 const segment=own>=0?text.slice(matches[own].index+matches[own][0].length,matches[own+1]?.index??text.length):text.slice(0,matches[0]?.index??text.length);
 const match=segment.match(/\d(?:[\d \u00a0\u202f]*\d)?(?:[.,]\d+)?/);
 return match?{number:numberFrom(match[0]),monthly:/[/\\]\s*м[іе]с|щомісяч/i.test(segment)}:null;
}
function parsePaperRowsDetailed(rows){
 const data={promo_credit_products:{},regular_credit_products:{}},warnings=[];
 const start=rows.findIndex(row=>String(row[0]||'').trim().toLocaleLowerCase('uk-UA')==='кредитний продукт');if(start<0)return {data:null,warnings:['Не знайдено заголовок кредитної таблиці.']};
 for(const row of rows.slice(start+1)){
  const product=canonicalProduct(row[0]);if(!/^\d/.test(product))continue;
  const banks=Object.keys(bankAliases).filter(bank=>bankHas(row[1],bank));if(!banks.length)continue;
  const term=String(row[2]||'').trim().match(/^(\d+)\s*(?:міс[а-яіїєґ.\s]*)?$/iu);
  if(!term||/щомісяч|[/\\]\s*м[іе]с/iu.test(String(row[3]||''))||/low|high/i.test(product)){
   warnings.push(product+': потрібні додаткові умови або щомісячна комісія; автоматично не імпортовано.');continue;
  }
  const months=Number(term[1]);if(months<1||months>120)continue;
  const kind=isPromoProduct(product)?'promo_credit_products':'regular_credit_products',existing=data[kind][product];
  if(existing&&existing.months!==months){warnings.push(product+': різні строки однойменних продуктів; рядок не імпортовано.');continue;}
  const config=existing||{months,banks:{}};
  for(const bank of banks){
   const commission=bankField(row[3],bank),sms=bankField(row[4],bank),limit=bankField(row[5],bank);
   if(!commission||!sms||!limit||limit.number<=0){warnings.push(product+' / '+bank+': неповні умови; банк не імпортовано.');continue;}
   config.banks[bank]={commission_percent:String(commission.number),sms_amount:String(sms.number),sms_mode:sms.monthly&&sms.number>0?'monthly':'fixed',max_amount:String(limit.number)};
  }
  if(Object.keys(config.banks).length){if(/(?:^|\s)ЗС$/iu.test(product))config.serviceCategories=['🔋 Зарядні станції'];data[kind][product]=config;}
 }
 return {data:Object.values(data).some(catalog=>Object.keys(catalog).length)?data:null,warnings};
}
function parsePaperRows(rows){return parsePaperRowsDetailed(rows).data;}
function partitionCreditCatalogs(D){const all={...D.credit.promo_credit_products,...D.credit.regular_credit_products},promo={},regular={};for(const [name,config] of Object.entries(all))(isPromoProduct(name)?promo:regular)[name]=config;D.credit.promo_credit_products=promo;D.credit.regular_credit_products=regular;}
function ensurePromoProducts(D){const promo=D.credit.promo_credit_products;if(!promo['04АВД'])promo['04АВД']={months:4,banks:{UkrSibBank:{commission_percent:'0',sms_amount:'499',sms_mode:'fixed',max_amount:'200000'},Alliance:{commission_percent:'0',sms_amount:'499',sms_mode:'fixed',max_amount:'100000'},Globus:{commission_percent:'0',sms_amount:'599',sms_mode:'fixed',max_amount:'100000'},IdeaBank:{commission_percent:'1',sms_amount:'0',sms_mode:'fixed',max_amount:'200000'}}};if(!promo['24*24(К)'])promo['24*24(К)']={months:24,banks:{UkrSibBank:{commission_percent:'0',sms_amount:'150',sms_mode:'monthly',max_amount:'300000'},UnexBank:{commission_percent:'0',sms_amount:'300',sms_mode:'monthly',max_amount:'200000'}}};}

const api={paperSheetUrl,parseCsv,parsePaperRows,parsePaperRowsDetailed,partitionCreditCatalogs,ensurePromoProducts};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CreditSource=api;
})(globalThis);
