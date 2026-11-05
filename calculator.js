export function calculate(expression){
 const compact=String(expression).replace(/\s/g,'').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
 if(!compact||compact.length>200)throw Error('Enter a calculation (up to 200 characters).');
 const tokens=compact.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|sqrt|[()+*/%^\-]/gi)||[];
 if(tokens.join('')!==compact)throw Error('Use numbers and calculator operations.');
 let pos=0;
 const accept=t=>tokens[pos]===t?(pos++,true):false;
 function atom(){
  let value;
  if(accept('sqrt')){if(!accept('('))throw Error('Use √ with parentheses.');value=sum();if(!accept(')'))throw Error('Close the parentheses.');if(value<0)throw Error('Cannot take the square root of a negative number.');value=Math.sqrt(value);}
  else if(accept('(')){value=sum();if(!accept(')'))throw Error('Close the parentheses.');}
  else{const token=tokens[pos++];if(!token||!/^\d|^\.\d/.test(token))throw Error('Complete the calculation.');value=Number(token);}
  while(accept('%'))value/=100;
  return value;
 }
 function power(){let v=atom();if(accept('^'))v**=unary();return v;}
 function unary(){if(accept('+'))return unary();if(accept('-'))return -unary();return power();}
 function product(){let v=unary();while(tokens[pos]==='*'||tokens[pos]==='/'){const op=tokens[pos++],right=unary();if(op==='/'&&right===0)throw Error('Cannot divide by zero.');v=op==='*'?v*right:v/right;}return v;}
 function sum(){let v=product();while(tokens[pos]==='+'||tokens[pos]==='-'){const op=tokens[pos++],right=product();v=op==='+'?v+right:v-right;}return v;}
 const result=sum();if(pos!==tokens.length)throw Error('Check the parentheses and operators.');if(!Number.isFinite(result))throw Error('Result is outside the supported range.');return Number(result.toPrecision(12));
}
const keys=['C','⌫','(',')','√','x²','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','±','0','.','='];
let previous='';
export function calculatorMarkup(){return `<div class="calculator"><label for="calculation">Calculation</label><input id="calculation" type="text" inputmode="decimal" maxlength="200" autocomplete="off" spellcheck="false"><output class="calc-status" aria-live="polite"></output><div class="calc-keys">${keys.map(key=>`<button type="button" data-calc="${key}" ${key==='='?'class="primary"':''} aria-label="${{'C':'Clear calculation','⌫':'Backspace','√':'Square root','x²':'Square','±':'Change sign','=':'Equals'}[key]||key}">${key}</button>`).join('')}</div></div>`;}
export function bindCalculator(dialog){
 const input=dialog.querySelector('#calculation'),status=dialog.querySelector('.calc-status');input.value=previous;let fresh=false;
 function evaluate(){try{const expression=input.value,result=calculate(expression);input.value=String(result);previous=input.value;fresh=true;status.textContent=`${expression} = ${result}`;}catch(e){status.textContent=e.message;}}
 input.oninput=()=>{fresh=false;previous=input.value;status.textContent='';};
 dialog.querySelectorAll('[data-calc]').forEach(button=>button.onclick=()=>{
  const key=button.dataset.calc;
  if(key==='='){evaluate();return;}
  status.textContent='';if(fresh&&/^[0-9.]$/.test(key))input.value='';fresh=false;
  if(key==='C')input.value='';else if(key==='⌫')input.value=input.value.slice(0,-1);else if(key==='√')input.value=`sqrt(${input.value||'0'})`;else if(key==='x²')input.value=`(${input.value||'0'})^2`;else if(key==='±')input.value=`-(${input.value||'0'})`;else if(input.value.length<200)input.value+=key;
  previous=input.value;
 });
 dialog.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key==='=')&&!e.target.matches('[data-close]')){e.preventDefault();evaluate();}});
 dialog.querySelector('[data-close]').textContent='Close';
}
