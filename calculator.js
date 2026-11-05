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
 dialog.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key==='=')&&!e.target.matches('[data-close],[data-calc-collapse],[data-calc-handle]')){e.preventDefault();evaluate();}});
 dialog.querySelector('[data-close]').textContent='Close';
}

// Nonmodal so the question can still be scrolled and answered while calculating.
let floatingPosition=null;
export function openCalculator(){
 const existing=document.querySelector('.floating-calculator');
 if(existing){existing.querySelector('[data-calc-handle]').focus();return existing;}
 const panel=document.createElement('section');panel.className='floating-calculator';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-label','Calculator');
 panel.innerHTML=`<div class="calc-titlebar"><button type="button" class="calc-handle" data-calc-handle aria-label="Move calculator" title="Drag to move, or use arrow keys">⠿ Calculator</button><button type="button" data-calc-collapse aria-label="Minimize calculator" aria-expanded="true">Minimize</button><button type="button" data-close>Close</button></div><div class="calc-body" data-calc-body>${calculatorMarkup()}</div>`;
 document.body.append(panel);bindCalculator(panel);
 const events=new AbortController(),handle=panel.querySelector('[data-calc-handle]');let drag=null;
 function bounds(){const v=window.visualViewport;return {left:v?.offsetLeft||0,top:v?.offsetTop||0,width:v?.width||innerWidth,height:v?.height||innerHeight};}
 function place(x,y){
  const area=bounds(),rect=panel.getBoundingClientRect();
  const left=Math.max(area.left+8,Math.min(x,area.left+area.width-rect.width-8)),top=Math.max(area.top+8,Math.min(y,area.top+area.height-rect.height-8));
  panel.style.left=`${left}px`;panel.style.top=`${top}px`;floatingPosition={left,top};
 }
 function fit(){const a=bounds();panel.style.maxHeight=`${Math.max(80,a.height-16)}px`;panel.style.maxWidth=`${Math.max(200,a.width-16)}px`;place(floatingPosition?.left??a.left+a.width-panel.offsetWidth-16,floatingPosition?.top??a.top+80);}
 fit();
 const close=()=>{events.abort();drag=null;panel.remove();};panel.querySelector('[data-close]').onclick=close;
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}},{signal:events.signal});
 const collapse=panel.querySelector('[data-calc-collapse]'),body=panel.querySelector('[data-calc-body]');
 collapse.onclick=()=>{body.hidden=!body.hidden;collapse.textContent=body.hidden?'Expand':'Minimize';collapse.setAttribute('aria-label',body.hidden?'Expand calculator':'Minimize calculator');collapse.setAttribute('aria-expanded',String(!body.hidden));fit();};
 handle.onpointerdown=e=>{if(!e.isPrimary||e.button!==0)return;const r=panel.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};handle.setPointerCapture(e.pointerId);};
 handle.onpointermove=e=>{if(drag&&e.pointerId===drag.id){e.preventDefault();place(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);}};
 handle.onpointerup=handle.onpointercancel=handle.onlostpointercapture=()=>{drag=null;};
 handle.onkeydown=e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){e.preventDefault();const r=panel.getBoundingClientRect(),step=e.shiftKey?40:10;place(r.left+d[0]*step,r.top+d[1]*step);}};
 window.addEventListener('resize',fit,{signal:events.signal});window.visualViewport?.addEventListener('resize',fit,{signal:events.signal});window.visualViewport?.addEventListener('scroll',fit,{signal:events.signal});
 // Focus the move handle instead of triggering the phone's software keyboard.
 handle.focus({preventScroll:true});return panel;
}
