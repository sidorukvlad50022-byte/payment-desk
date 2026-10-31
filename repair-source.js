(function(root){
 'use strict';
 const csv=typeof module!=='undefined'&&module.exports?require('./credit-source.js'):root.CreditSource;
 const url='https://docs.google.com/spreadsheets/d/1PfqX1OgxQTFtrCrssfgC5-Ln_IL0tmXBYoDDXNpcEXk/export?format=csv&gid=1145347258';
 function parse(text){
  const rows=csv.parseCsv(text),start=rows.findIndex(row=>row[0]?.trim().replace(/^\uFEFF/,'')==='iPhone');
  if(start<0)throw Error('Не знайдено прайс iPhone');
  const columns=rows[start].map((name,index)=>({name:name.trim(),index})).filter(col=>col.index>0&&col.name);
  if(columns.length<4)throw Error('Неповний заголовок прайсу');
  const models=[];
  for(const row of rows.slice(start+1)){
   const name=(row[0]||'').trim();if(!name)continue;if(!/^iPhone\s/i.test(name))break;
   const generation=name.match(/^iPhone\s+(\d+)/i);if(!generation||Number(generation[1])<11)continue;
   const prices=columns.map(col=>(row[col.index]||'').trim());
   if(prices.some(price=>price&&!/^(?:-|—|від\s+\d[\d\s.,]*|\d[\d\s.,]*)$/i.test(price)))throw Error('Невірний формат ціни');
   if(models.some(model=>model.name===name))throw Error('Повтор моделі');
   models.push({name,prices});
  }
  if(!models.length||!models.some(model=>model.prices.some(price=>/\d/.test(price))))throw Error('Порожній прайс');
  return {services:columns.map(col=>({name:col.name})),models};
 }
 const api={url,parse};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RepairSource=api;
})(globalThis);
