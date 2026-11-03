import { stockOf, ruleGeometry, rulesLayer } from '../vendor/looseleaf/runtime/paper/stocks.mjs';

export const PAPER_STOCK_COPY={en:{label:'PAPER STOCK',graph:'Graph','dot-grid':'Dot grid'}};
const COLORS={pink:'rgba(233,119,128,.12)',green:'rgba(173,228,8,.19)'};
export function stockRules(name){
  if(!['graph','dot-grid'].includes(name))throw new RangeError('Choose graph or dot-grid paper.');
  const stock=stockOf(name),geometry=ruleGeometry(stock.rules,{calm:false}),original=rulesLayer(stock.rules,{calm:false}).style;
  const style={...original};
  if(name==='graph'){
    const tile=geometry.pitch*2;
    style.backgroundImage=[COLORS.pink,COLORS.pink,COLORS.green,COLORS.green].map((color,i)=>`linear-gradient(${i%2?'to bottom':'to right'},${color} 1px,transparent 1px)`).join(',');
    style.backgroundSize=Array(4).fill(`${tile}px ${tile}px`).join(',');
    style.backgroundPosition=`0 0,0 0,${geometry.pitch}px ${geometry.pitch}px,${geometry.pitch}px ${geometry.pitch}px`;
  }else{
    // Keep Looseleaf's two original dot passes, changing only their ink.
    style['--ll-pencil']=style['--ll-pencil-mark']='rgb(33 64 214 / .17)';
  }
  return{stock:name,geometry,style};
}
export function mountPaperStockSwitcher(host,sheet=document.querySelector('.paper-world')){
  if(!host||!sheet)throw new TypeError('The paper layer needs its sheet and host.');
  // The final artwork uses one stock. Old bookmarks must not restore Graph.
  host.replaceChildren();host.hidden=true;host.style.display='none';host.removeAttribute('aria-label');
  const layer=document.createElement('div');layer.className='paper-stock-rules';layer.setAttribute('aria-hidden','true');sheet.prepend(layer);
  const value='dot-grid';
  function apply(){const preset=stockRules(value);layer.removeAttribute('style');for(const [key,ink] of Object.entries(preset.style))key.startsWith('--')?layer.style.setProperty(key,ink):layer.style[key]=ink;sheet.dataset.paperStock=value;const url=new URL(location.href);url.searchParams.set('paper',value);history.replaceState(history.state,'',url);}
  apply();
  return{apply,get value(){return value},dispose(){layer.remove();host.replaceChildren()}};
}
