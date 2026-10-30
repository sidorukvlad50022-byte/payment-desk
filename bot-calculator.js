(function(root){
 'use strict';
 function fraction(value){
  const s=String(value).trim().replace(',','.');
  if(!/^\d+(?:\.\d{1,6})?$/.test(s))throw new Error('Введіть невід’ємне число, до 6 знаків після коми.');
  const [a,b='']=s.split('.');return [BigInt(a+b),10n**BigInt(b.length)];
 }
 const divide=(a,b)=>(2n*a+b)/(2n*b);
 function toCents(v){const [a,b]=fraction(v);const result=Number(divide(a*100n,b));if(!Number.isSafeInteger(result)||result>10000000000)throw new Error('Максимальна сума — 100 000 000 грн.');return result;}
 function percent(cents,rate){const [a,b]=fraction(rate);return Number(divide(BigInt(cents)*a,b*100n));}
 function validate(price,down){if(!Number.isSafeInteger(price)||!Number.isSafeInteger(down)||price<=0||down<0||down>=price)throw new Error('Ціна має бути більшою за нуль, а перший внесок — меншим за ціну покупки.');}
 function installment(price,down,months,rate){
  validate(price,down);if(!Number.isInteger(months)||months<1||months>120)throw new Error('Невірна кількість платежів.');
  const principal=price-down,commission=percent(price,rate),repayment=principal+commission;
  return {principal,commission,repayment,monthly:Number(divide(BigInt(repayment),BigInt(months))),total:repayment+down,over:commission,months};
 }
 function paper(price,down,product,bank){
  validate(price,down);const principal=price-down,months=Number(product.months),limit=toCents(bank.max_amount);
  if(principal>limit){const amount=v=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:2}).format(v/100)+' грн';throw new Error('Сума кредиту перевищує ліміт банку. Сума: '+amount(principal)+'; ліміт: '+amount(limit)+'.');}
  const commission=percent(principal,bank.commission_percent),sms=toCents(bank.sms_amount)*(bank.sms_mode==='monthly'?months:1),repayment=principal+commission+sms;
  return {principal,commission,sms,repayment,monthly:Number(divide(BigInt(repayment),BigInt(months))),principalMonthly:Number(divide(BigInt(principal),BigInt(months))),total:repayment+down,over:commission+sms,months};
 }
 function service(device,title,product,glass,accessories,trade,variant,glassDiscount){
  if(![product,glass,accessories,trade].every(x=>Number.isSafeInteger(x)&&x>=0)||product<=0)throw new Error('Введіть додатну ціну пристрою та невід’ємні суми доповнень.');
  const basket=product+glass+accessories-trade;if(basket<=0)throw new Error('Trade-in має бути меншим за суму покупки.');
  const price=Math.max(percent(product,variant[1]),toCents(variant[2]));
  const outlet=device==='♻️ Outlet';
  const fullGlass=!outlet&&(title.startsWith('Розширена гарантія')||title==='Гарантований захист 2.0'||title==='Абсолютний захист 2.0');
  const discount=glassDiscount!==undefined?percent(glass,glassDiscount):fullGlass?glass:outlet?percent(glass,'30'):0;
  return {basket,price,discount,total:basket+price-discount};
 }
 const api={toCents,percent,installment,paper,service};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BotCalc=api;
})(globalThis);
