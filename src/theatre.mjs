import {splitCastAtlas,poseFrame,drawBoiledSprite} from './ink-motion.mjs';
import {loadFeedbackArt} from './feedback-art.mjs';
import {drawTextSwipe} from './heading-highlights.mjs';

const W=1536,H=1024;
const STAGE_RECT=[0,0,W,H],OPENING_RECT=[150,175,1240,730],BACKDROP_RECT=[240,175,1055,550];
const CEL_NAMES=['open-blue','closed','half','open-deco','open-rain','open-blue-alt'];
const STYLES=[
  {id:'stars',label:'STARS',icon:'backdrop-stars',color:'#2140d6',swipe:'#8ba5ff',frames:[0,5]},
  {id:'deco',label:'DECO',icon:'backdrop-deco',color:'#a03953',swipe:'#ed9ba9',frames:[3]},
  {id:'rain',label:'MIDNIGHT',icon:'backdrop-midnight',color:'#315c4b',swipe:'#8dbda2',frames:[4]},
];
const INK={jojo:{fps:3.1,amount:1.9},lyly:{fps:6.4,amount:2.6},yoyo:{fps:4.7,amount:2.2}};
const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
function surface(){const c=document.createElement('canvas');c.width=W;c.height=H;return c}
function image(url,priority='auto'){return new Promise((resolve,reject)=>{const im=new Image();im.fetchPriority=priority;im.onload=()=>im.naturalWidth?resolve(im):reject(new Error('Empty stage drawing'));im.onerror=()=>reject(new Error('Stage drawing unavailable: '+url));im.src=url})}

// Each normalized point sits on the bell lip or strings, and the angle points away from the source.
const SOUND_CELS = {
  jojo: {
    sprite: 'sax-sound', size: 77,
    anchors: [[.34,.55,-1.08],[.32,.65,-.94],[.31,.112,-1.09],[.77,.63,-.93],[.45,.62,-.59]],
  },
  lyly: {
    sprite: 'bass-sound', size: 65,
    anchors: [[.64,.57,-.27],[.70,.64,-.30],[.58,.63,-.35],[.57,.65,-.30],[.72,.64,-.22]],
  },
  yoyo: {
    sprite: 'guitar-sound', size: 56,
    anchors: [[.59,.63,-.45],[.55,.65,-.50],[.61,.63,-.40],[.46,.142,-1.50],[.66,.61,-.45]],
  },
};
function drawStageSprite(g, sprite, x, y, width, angle, phase, centered=false, mirrored=false) {
  if(!sprite)return;
  const h=width*sprite.naturalHeight/sprite.naturalWidth;
  g.save();
  g.translate(x,y);
  g.rotate(angle);
  if(mirrored)g.scale(-1,1);
  drawBoiledSprite(g,sprite,[0,0,sprite.naturalWidth,sprite.naturalHeight],
    [centered?-width/2:0,-h/2,width,h],{phase,amplitude:phase<0?0:.82});
  g.restore();
}
function drawSoundCel(g, sprites, who, pose, left, top, width, height, held, reduced) {
  const { anchors, size, sprite } = SOUND_CELS[who];
  const [x, y, angle] = anchors[pose];
  g.save();
  g.shadowColor='#16182ec7';g.shadowBlur=2.5;
  drawStageSprite(g,sprites[sprite],left+x*width,top+y*height,size*.9,
    angle+(reduced?0:[0,.045,-.038][held]),reduced?-1:held);
  g.restore();
}

const CAMERA_POSITION=[.3836,.9539];
const CHEER_MARKS = [
  { name:'cheer-camera', position:CAMERA_POSITION, angle:-.09, size:1.08, holds:[[0,0,0],[0,0,0],[3,-4,.11],[2,-3,.08],[0,0,0],[0,0,0]] },
  { name:'cheer-call', position:[.2746,.9110], angle:.12, size:1.22, holds:[[0,0,0],[-3,2,-.09],[1,2,-.025],[2,0,.04],[0,-2,.07]] },
  { name:'cheer', position:[.8566,.9412], angle:Math.PI/12, size:1, mirrored:true, holds:[[0,0,0],[1,-2,.09],[-1,2,-.06]] },
  { name:'cheer-burst', position:[.6894,.9269], angle:-.23, size:1.32, holds:[[0,0,0],[-2,-4,-.18],[3,0,.12],[0,3,.07]] },
];
const AUDIENCE_HEIGHT=82;
const AUDIENCE_FRAMES=['audience-0','audience-1','audience-2'];
const crowdMasks=new Map(),crowdCels=new WeakMap();
function crowdFadeMask(w,h){
  const key=w+'x'+h;
  if(crowdMasks.has(key))return crowdMasks.get(key);
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const g=canvas.getContext('2d'),pixels=g.createImageData(w,h);
  for(let x=0;x<w;x++){
    const fromCenter=2*x/(w-1)-1;
    const edge=h*(1-.19*fromCenter*fromCenter);
    for(let y=0;y<h;y++){
      const fade=clamp((edge-y)/(h*.10));
      pixels.data[(y*w+x)*4+3]=Math.round(255*fade*fade*(3-2*fade));
    }
  }
  g.putImageData(pixels,0,0);
  crowdMasks.set(key,canvas);
  return canvas;
}
function curvedCrowdCel(sprite,phase){
  let cels=crowdCels.get(sprite);
  if(!cels){cels=new Map();crowdCels.set(sprite,cels)}
  if(cels.has(phase))return cels.get(phase);
  const w=sprite.naturalWidth,h=sprite.naturalHeight;
  const cel=document.createElement('canvas');cel.width=w;cel.height=h;
  const g=cel.getContext('2d');
  drawBoiledSprite(g,sprite,[0,0,w,h],[0,0,w,h],{phase,amplitude:phase<0?0:.72});
  g.globalCompositeOperation='destination-in';
  g.drawImage(crowdFadeMask(w,h),0,0);
  cels.set(phase,cel);
  return cel;
}
function drawCrowd(g,sprites,frame,boxHeight,time,reduced){
  const held=reduced?0:Math.floor(time/580)%AUDIENCE_FRAMES.length;
  const sprite=sprites[AUDIENCE_FRAMES[held]]||sprites[AUDIENCE_FRAMES[0]];
  if(!sprite)return;
  const aspect=sprite.naturalWidth/sprite.naturalHeight;
  const height=Math.min(150,frame.h*.2+42,frame.w*.88/aspect);
  const width=height*aspect;
  const y=Math.min(frame.y+frame.h-height*.47,boxHeight-height-5);
  g.save();g.globalAlpha=.76;g.filter='brightness(.42)';
  const cel=curvedCrowdCel(sprite,reduced?-1:Math.floor(time/195)%3);
  g.drawImage(cel,frame.x+(frame.w-width)/2,y,width,height);
  g.restore();
}
function drawAudience(g, sprites, frame, beat, reduced, flashing) {
  const size=Math.min(58,frame.w*.155);
  for(const [i,{name,position,angle,holds,size:scale,mirrored}] of CHEER_MARKS.entries()){
    const sprite=sprites[name];
    if(!sprite)continue;
    const x=frame.x+frame.w*position[0],y=frame.y+frame.h*position[1];
    const [dx,dy,turn]=holds[reduced?0:name==='cheer-camera'&&flashing?2:beat%holds.length];
    drawStageSprite(g,sprite,x+dx,y+dy,size*scale,angle+turn,reduced?-1:(beat+i)%3,true,mirrored);
  }
}

const CAMEOS = [
  { name:'singing', hold:920, height:367.2, pivot:.52 },
  { name:'gesture', hold:1030, height:367.2, pivot:.51 },
  { name:'crouched', hold:740, height:297, pivot:.49 },
];
const LAPIN_FLOOR=[1071,759];
const FLASH_INTERVALS = [6800,8200,7400,9100];
const NEON_HOLDS=[[1550,.96],[150,.78],[260,1],[1280,.94],[110,.65],[180,.89],[2100,.98],[230,.85]];
function neonBrightness(time,reduced){
  if(reduced)return .97;
  let age=time%5860;
  for(const [hold,brightness] of NEON_HOLDS){
    if(age<hold)return brightness;
    age-=hold;
  }
  return .96;
}
function neonPlaque(){
  const c=surface(),g=c.getContext('2d');
  const tubes=new Path2D('M640 143 H665 M653 143 V170 M677 143 V170 M697 143 V170 M677 155 H697 M714 143 V170 M714 143 H733 M714 156 H728 M714 170 H733 M760 143 H774 M768 143 V170 Q768 180 757 178 Q750 177 752 172 M778 155 A14 15 0 1 0 806 155 A14 15 0 1 0 778 155 M819 143 V170 H837 M846 143 V170 H864 M870 143 L882 158 L894 143 M882 158 V170');
  g.lineCap='round';g.lineJoin='round';
  g.strokeStyle='#e84b31';g.lineWidth=8.7;g.shadowColor='#ff6c43';g.shadowBlur=22;g.stroke(tubes);
  g.strokeStyle='#ff7851';g.lineWidth=6.7;g.shadowBlur=7;g.stroke(tubes);
  g.shadowBlur=0;g.strokeStyle='#ffc18d';g.lineWidth=4.5;g.stroke(tubes);
  g.strokeStyle='#fff5db';g.lineWidth=2.2;g.stroke(tubes);
  return c;
}
const FLASH_HALO_PAD=64;
function flashArtwork(im){
  const wash=surface(),g=wash.getContext('2d');
  g.drawImage(im,0,0,W,H);
  g.globalCompositeOperation='source-in';
  const x=W*(CAMERA_POSITION[0]+.05),y=H*.89;
  const light=g.createRadialGradient(x,y,0,x,y,W*.88);
  light.addColorStop(0,'#fff8ece0');light.addColorStop(.45,'#fffaf0ab');light.addColorStop(1,'#fffcf45a');
  g.fillStyle=light;g.fillRect(0,0,W,H);
  const halo=document.createElement('canvas');halo.width=W+FLASH_HALO_PAD*2;halo.height=H+FLASH_HALO_PAD*2;
  const blur=halo.getContext('2d');blur.filter='blur(23px)';blur.drawImage(wash,FLASH_HALO_PAD,FLASH_HALO_PAD);
  return {wash,halo};
}
function stageGrounding(){
  const canvas=surface(),g=canvas.getContext('2d');
  g.fillStyle='rgba(105,61,32,.15)';g.filter='blur(18px)';
  g.beginPath();g.ellipse(789,986,638,13,0,0,Math.PI*2);g.fill();
  g.fillStyle='rgba(78,45,26,.28)';g.filter='blur(10px)';
  g.beginPath();g.ellipse(778,977,614,8,0,0,Math.PI*2);g.fill();
  for(const x of [112,1424]){
    g.fillStyle='rgba(107,62,34,.24)';g.filter='blur(9px)';
    g.beginPath();g.ellipse(x+20,982,49,7,.09,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(77,42,22,.40)';g.filter='blur(5px)';
    g.beginPath();g.ellipse(x+3,974,44,5,0,0,Math.PI*2);g.fill();
  }
  return canvas;
}

/** A registered held-drawing theatre: the outer architecture is one immutable master. */
export function createTheatre(container,options={}){
  if(!container||typeof window==='undefined')return null;
  const {reducedMotion=false,review=false,onReady}=options;
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return null;
  canvas.className='theatre-canvas';canvas.style.cssText='display:block;width:100%;height:100%;visibility:hidden';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','The Jolly coloured-pencil theatre with JOJO, LYLY and YOYO.');container.append(canvas);
  const native=surface(),g=native.getContext('2d'),neon=neonPlaque(),grounding=stageGrounding();
  const outerInk=reducedMotion||review?null:surface(),curtainInk=outerInk?surface():null;
  let outerPhase=-1,curtainPhase=-1;
  const halfActors=surface(),halfActorCtx=halfActors.getContext('2d');let maskSheet=null;
  let disposed=false,visible=true,entered=false,loaded=false,ready=false,raf=0,dirty=true,lastSignature='',lastCheer=-1,lastFlash=0,lastNeon=0,epoch=performance.now(),openingStart=null;
  let reveal=review||reducedMotion?1:0,manualReveal=false,progress=.85,act=3,route='swing',poseOverride=null,style=0,celOverride=null;
  let images=[],cast=[],backdrops=[],curtainLayers=[],microphone=null,flashLayers=null,sprites={},actorReport=[],width=1,height=1,dpr=1,frameRect={x:0,y:0,w:1,h:1};
  let phase=2,styleFrame=0,cameo=-1;
  let nextFlashAt=null,flashStart=null,flashIndex=0;
  const door=new Path2D();door.moveTo(164,815);door.lineTo(164,440);door.bezierCurveTo(179,300,300,221,469,197);door.quadraticCurveTo(768,168,1065,197);door.bezierCurveTo(1236,221,1356,300,1374,440);door.lineTo(1372,815);door.quadraticCurveTo(1110,895,768,879);door.quadraticCurveTo(430,895,164,815);door.closePath();
  const controls=document.createElement('div');controls.className='stage-style-picker';controls.setAttribute('role','group');controls.setAttribute('aria-label','Stage backdrop');
  controls.style.cssText='display:flex;justify-content:center;align-items:center;gap:4px clamp(3px,1.2vw,19px);flex-wrap:wrap;max-width:100%;margin:4px auto;font:22px/1 "Special Elite",serif;';
  const swipe=document.createElement('span');swipe.className='heading-highlights stage-backdrop-swipe';swipe.setAttribute('aria-hidden','true');
  swipe.style.opacity='.65';
  let swipeGeometry='',controlsVisible=false,controlPhase=-1;
  const buttons=STYLES.map((choice,i)=>{
    const button=document.createElement('button'),icon=document.createElement('canvas'),host=document.createElement('span'),label=document.createElement('span');
    button.type='button';button.setAttribute('aria-pressed',String(i===0));
    button.style.cssText='display:inline-flex;align-items:center;gap:7px;min-height:48px;padding:4px 7px;border:0;background:transparent;font:inherit;cursor:pointer;';
    button.style.color=choice.color;
    icon.width=icon.height=72;icon.setAttribute('aria-hidden','true');icon.style.cssText='width:clamp(24px,6vw,36px);height:clamp(24px,6vw,36px);flex:none';
    host.className='heading-highlight-host';
    label.textContent=choice.label;host.append(label);button.append(icon,host);
    button.onclick=()=>setStyle(i);controls.append(button);
    return {button,icon,host,label};
  });
  function paintSwipe(){
    if(review||disposed||!controls.isConnected)return;
    const {host,label}=buttons[style],choice=STYLES[style];
    if(swipe.parentElement!==host)host.append(swipe);
    swipe.style.setProperty('--ll-bubblegum',choice.swipe);
    swipeGeometry=drawTextSwipe(swipe,label,choice.label,'jolly-backdrop:'+choice.id,swipeGeometry);
  }
  const controlVisibility=new IntersectionObserver(([entry])=>{
    controlsVisible=entry.isIntersecting;
    swipe.classList.toggle('highlight-visible',controlsVisible&&!reducedMotion);
    if(controlsVisible){paintSwipe();schedule()}
  });
  if(!review){
    container.insertAdjacentElement('afterend',controls);
    controlVisibility.observe(controls);
    void document.fonts.ready.then(()=>{swipeGeometry='';paintSwipe()});
  }
  function paintControlIcons(time){
    const phase=reducedMotion?0:Math.floor(Math.max(0,time-epoch)/195)%3;
    if(phase===controlPhase)return;
    controlPhase=phase;
    buttons.forEach(({icon},i)=>{
      const sprite=sprites[STYLES[i].icon];
      if(!sprite)return;
      const context=icon.getContext('2d'),w=sprite.naturalWidth,h=sprite.naturalHeight,fit=63/Math.max(w,h);
      context.clearRect(0,0,72,72);context.save();context.translate(36,36);
      const held=reducedMotion?0:(phase+i)%3;
      context.rotate([0,.033,-.026][held]);
      drawBoiledSprite(context,sprite,[0,0,w,h],[-w*fit/2,-h*fit/2,w*fit,h*fit],
        {phase:held,amplitude:reducedMotion?0:2.8});
      context.restore();
    });
  }
  function setStyle(value){
    const i=typeof value==='number'?value:STYLES.findIndex(s=>s.id===value);
    if(i<0||i>=STYLES.length)return;
    style=i;buttons.forEach(({button},n)=>button.setAttribute('aria-pressed',String(n===i)));
    paintSwipe();dirty=true;schedule();
  }

  // Alpha rows from the original PNGs: blue interior, open curtain, half-open cast.
  // Fixed masks keep WebP color changes from reclassifying the floor as foreground.
  function applyMask(context,row){
    context.globalCompositeOperation='destination-in';
    context.drawImage(maskSheet,0,row*H,W,H,0,0,W,H);
    context.globalCompositeOperation='source-over';
  }
  function layer(im,row){
    const c=surface(),q=c.getContext('2d');q.drawImage(im,0,0,W,H);
    applyMask(q,row);return c;
  }
  function microphoneLayer(im){
    const c=surface(),q=c.getContext('2d');
    const clip=new Path2D('M1181 567 C1180 551 1183 533 1196 533 C1209 532 1216 541 1214 556 L1212 570 C1211 578 1207 581 1203 582 L1203 599 L1201 608 L1200 746 Q1200 752 1208 755 Q1226 758 1227 765 Q1220 774 1197 774 Q1176 773 1169 764 Q1172 758 1187 754 Q1193 752 1193 746 L1193 608 L1191 598 L1191 582 C1185 579 1181 573 1181 567 Z');
    q.clip(clip);q.drawImage(im,0,0,W,H);return c;
  }
  async function load(){
    const [drawings,feedback,masks]=await Promise.all([
      Promise.all(CEL_NAMES.map((name,i)=>image('/jolly-statechart/assets/stage-cels/'+name+'.webp',i<3?'high':'auto'))),
      loadFeedbackArt(['sax-sound','bass-sound','guitar-sound',
        ...CHEER_MARKS.map(mark=>mark.name), ...CAMEOS.map((_,i)=>'rabbit-cameo-'+i), ...AUDIENCE_FRAMES,
        ...STYLES.map(choice=>choice.icon)]),
      image('/jolly-statechart/assets/stage-cels/occlusion-masks.webp','high'),
    ]);
    let performers=options.castSprites;
    if(!Array.isArray(performers)||!performers.length){const urls=options.castAtlases||[options.castAtlas||'/jolly-statechart/assets/cast/trio-pencil.webp',...Array.from({length:4},(_,i)=>'/jolly-statechart/assets/cast/action-'+(i+1)+'.webp')];performers=(await Promise.all(urls.map(image))).map(splitCastAtlas)}
    if(disposed)return;
    if(performers.length!==5||performers.some(s=>['jojo','lyly','yoyo'].some(w=>!s[w]?.width||!s[w]?.height)))throw new Error('The theatre requires five complete cast drawings.');
    if(masks.naturalWidth!==W||masks.naturalHeight!==H*3)throw new Error('Invalid stage mask dimensions.');
    images=drawings;cast=performers;sprites=feedback;maskSheet=masks;
    // The base already includes frame 0, and the two opening cels use their originals.
    for(const {frames} of STYLES)for(const index of frames){
      if(index)backdrops[index]=layer(drawings[index],0);
    }
    curtainLayers=[null,null,layer(drawings[0],1)];
    microphone=microphoneLayer(drawings[0]);
    if(!reducedMotion&&!review&&sprites['cheer-camera'])flashLayers=flashArtwork(drawings[0]);
    epoch=performance.now();loaded=true;if(entered&&!manualReveal&&!review&&!reducedMotion)openingStart=epoch;dirty=true;schedule();
  }
  function actorFrame(time,who){return poseOverride??(phase===1?0:progress>=.99?4:poseFrame(time-epoch,who,reducedMotion||review))}
  function cameoFrame(time){
    if(phase!==2||review||options.hideCast)return -1;
    let age=reducedMotion?CAMEOS[0].hold:Math.max(0,time-epoch)%2690;
    for(const [i,{hold}] of CAMEOS.entries()){
      if(age<hold&&sprites['rabbit-cameo-'+i])return i;
      if(age<hold)break;
      age-=hold;
    }
    return CAMEOS.findIndex((_,i)=>sprites['rabbit-cameo-'+i]);
  }
  const footContacts = new WeakMap();
  function contactShadow(ctx, sprite, left, foot, width, phase){
    let contacts=footContacts.get(sprite);
    if(!contacts){
      const w=sprite.naturalWidth||sprite.width,h=sprite.naturalHeight||sprite.height;
      const strip=document.createElement('canvas');strip.width=w;strip.height=Math.max(2,Math.ceil(h*.12));
      const pixels=strip.getContext('2d',{willReadFrequently:true});
      pixels.drawImage(sprite,0,h-strip.height,w,strip.height,0,0,w,strip.height);
      const data=pixels.getImageData(0,0,w,strip.height).data;
      const ground=new Array(w).fill(-1);
      for(let x=0;x<w;x++)for(let y=strip.height-1;y>=0;y--){
        if(data[(y*w+x)*4+3]>128){ground[x]=y;break}
      }
      const base=Math.max(...ground);
      contacts=[];
      for(let x=0;x<w;){
        if(ground[x]<Math.max(0,base-strip.height*.46)){x++;continue}
        const start=x;
        while(x<w&&ground[x]>=Math.max(0,base-strip.height*.46))x++;
        if(x-start>w*.035)contacts.push([(start+x)/2/w,(x-start)/2/w]);
      }
      if(!contacts.length)contacts=[[.5,.2]];
      footContacts.set(sprite,contacts);
    }
    ctx.save();
    for(const [index,[center,radius]] of contacts.entries()){
      const shift=phase===0?0:(phase===1?1:-1)*(index%2?-.9:1.2);
      const x=left+width*center+shift,y=foot-4+shift*.35;
      const r=width*(radius+.018)*(1+shift*.035);
      const dx=width*.19+15,dy=width*.065+7;
      const shade=ctx.createLinearGradient(x-r*.35,y-1,x+dx,y+dy);
      shade.addColorStop(0,'rgba(82,40,23,.62)');
      shade.addColorStop(.34,'rgba(100,48,23,.48)');
      shade.addColorStop(.70,'rgba(118,57,26,.22)');
      shade.addColorStop(1,'rgba(118,57,26,0)');
      ctx.filter='blur(5px)';ctx.fillStyle=shade;
      ctx.beginPath();
      ctx.moveTo(x-r,y-3);
      ctx.quadraticCurveTo(x+dx*.46-r,y+dy*.47-5,x+dx-r*.23,y+dy-1);
      ctx.quadraticCurveTo(x+dx+r*.25,y+dy+3,x+dx-r*.25,y+dy+6);
      ctx.quadraticCurveTo(x+dx*.31+r*.47,y+dy*.55+7,x-r,y+5);
      ctx.closePath();ctx.fill();
      ctx.filter='blur(3px)';ctx.fillStyle='rgba(64,32,20,.54)';
      ctx.beginPath();
      ctx.ellipse(x,y,r,5.4+shift*.3,0,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawCameo(time){
    const {height,pivot}=CAMEOS[cameo],sprite=sprites['rabbit-cameo-'+cameo];
    const [x,foot]=LAPIN_FLOOR,w=height*sprite.naturalWidth/sprite.naturalHeight;
    g.save();g.clip(door);
    const held=reducedMotion||review?0:Math.floor(Math.max(0,time-epoch)/200)%3;
    contactShadow(g,sprite,x-w*pivot,foot,w,held);
    drawBoiledSprite(g,sprite,[0,0,sprite.naturalWidth,sprite.naturalHeight],[x-w*pivot,foot-height,w,height],
      {phase:held,amplitude:reducedMotion||review?0:.72});
    g.restore();
    g.drawImage(microphone,0,0);
  }
  function flashAt(time){
    if(phase!==2||!entered||manualReveal||review||reducedMotion||!sprites['cheer-camera'])return 0;
    if(nextFlashAt===null)nextFlashAt=Math.max(time+420,(openingStart??time)+2190);
    if(time>=nextFlashAt){
      flashStart=time;
      nextFlashAt=time+FLASH_INTERVALS[flashIndex++%FLASH_INTERVALS.length];
    }
    return flashStart===null?0:Math.max(0,1-(time-flashStart)/410);
  }
  function outerArtwork(held){
    if(!outerInk)return images[0];
    if(outerPhase!==held){
      const art=outerInk.getContext('2d');
      art.clearRect(0,0,W,H);
      drawBoiledSprite(art,images[0],STAGE_RECT,STAGE_RECT,{phase:held,amplitude:1.1});
      outerPhase=held;
    }
    return outerInk;
  }
  function frontCurtain(held){
    if(!curtainInk)return curtainLayers[2];
    if(curtainPhase!==held){
      const art=curtainInk.getContext('2d');
      art.clearRect(0,0,W,H);art.drawImage(outerInk,0,0);
      // Reuse the same animated pixels on both sides of the fixed occlusion mask.
      art.globalCompositeOperation='destination-in';art.drawImage(curtainLayers[2],0,0);
      art.globalCompositeOperation='source-over';curtainPhase=held;
    }
    return curtainInk;
  }
  function compose(time,stageHeld){
    g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.filter='none';g.clearRect(0,0,W,H);
    const outer=outerArtwork(stageHeld);
    g.drawImage(outer,0,0);
    if(phase===2){
      if(styleFrame)drawBoiledSprite(g,backdrops[styleFrame],BACKDROP_RECT,BACKDROP_RECT,{phase:stageHeld,amplitude:outerInk ? .65 : 0});
    }
    else{
      g.save();g.clip(door);
      drawBoiledSprite(g,images[phase===0?1:2],OPENING_RECT,OPENING_RECT,{phase:stageHeld,amplitude:outerInk ? .82 : 0});
      g.restore();
      for(const[x,y,w,h]of[[0,805,W,H-805],[0,705,220,H-705],[1316,705,220,H-705]]){g.clearRect(x,y,w,h);g.drawImage(outer,x,y,w,h,x,y,w,h)}
    }
    if(cameo>=0)drawCameo(time);
    actorReport=[];
    if(phase>0&&!options.hideCast){
      const a=phase===1?halfActorCtx:g;
      if(phase===1){a.setTransform(1,0,0,1,0,0);a.globalCompositeOperation='source-over';a.clearRect(0,0,W,H)}
      a.save();a.clip(door);
      if(phase===1){a.beginPath();a.rect(500,220,540,635);a.clip()}
      for(const[who,x,height]of[['jojo',-2.24,423],['lyly',.35,423],['yoyo',2.68,232.65]]){
        if(phase===1&&who!=='lyly')continue;
        const pose=actorFrame(time,who),im=cast[pose][who],base=cast[0][who],h=height*im.height/base.height,w=height*im.width/base.height,cx=(.5+x/12)*W,foot=825;
        const ink=INK[who],held=reducedMotion||review?0:Math.floor(Math.max(0,time-epoch)*ink.fps/1000)%3;
        contactShadow(a,im,cx-w/2,foot,w,held);
        if(reducedMotion||review)a.drawImage(im,cx-w/2,foot-h,w,h);
        else drawBoiledSprite(a,im,[0,0,im.width,im.height],[cx-w/2,foot-h,w,h],{phase:held,amplitude:ink.amount});
        if (phase === 2) drawSoundCel(a, sprites, who, pose, cx-w/2, foot-h, w, h, held, reducedMotion||review);
        actorReport.push({who,x,pose,width:w,height:h,foot});
      }
      a.restore();
      if(phase===1){applyMask(a,2);g.drawImage(halfActors,0,0)}
    }
    if(phase===2)g.drawImage(frontCurtain(stageHeld),0,0);
  }
  function paint(time){
    phase=celOverride===null?(reveal<.26?0:reveal<.72?1:2):celOverride;
    cameo=cameoFrame(time);
    const selected=STYLES[style];styleFrame=selected.frames.length>1?selected.frames[(reducedMotion||review?0:Math.floor(Math.max(0,time-epoch)/2600))%selected.frames.length]:selected.frames[0];
    const actors=phase>0?['jojo','lyly','yoyo'].map(w=>actorFrame(time,w)+':'+(reducedMotion||review?0:Math.floor(Math.max(0,time-epoch)*INK[w].fps/1000)%3)).join('|'):'closed';
    const stageHeld=outerInk?Math.floor(Math.max(0,time-epoch)/245)%3:0;
    const signature=[phase,styleFrame,actors,stageHeld,cameo,cameo<0||reducedMotion?0:Math.floor(Math.max(0,time-epoch)/200)%3,width,height].join('/');
    const repaint=dirty||signature!==lastSignature;
    const cheer=phase===2&&!review ? (reducedMotion?0:Math.floor(Math.max(0,time-epoch)/235)%60) : -1;
    const flash=flashAt(time);
    const brightness=neonBrightness(Math.max(0,time-epoch),reducedMotion||review);
    if(repaint)compose(time,stageHeld);
    if(repaint||cheer!==lastCheer||flash!==lastFlash||brightness!==lastNeon){
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
      ctx.drawImage(grounding,frameRect.x,frameRect.y,frameRect.w,frameRect.h);
      ctx.drawImage(native,frameRect.x,frameRect.y,frameRect.w,frameRect.h);
      ctx.save();ctx.translate(frameRect.x,frameRect.y);ctx.scale(frameRect.w/W,frameRect.h/H);
      ctx.globalAlpha=brightness;ctx.drawImage(neon,0,0);
      if(flash>0){
        ctx.globalAlpha=flash*.43;ctx.drawImage(flashLayers.halo,-FLASH_HALO_PAD,-FLASH_HALO_PAD);
        ctx.globalAlpha=flash*.78;ctx.drawImage(flashLayers.wash,0,0);
      }
      ctx.restore();
      if(cheer>=0){
        drawCrowd(ctx,sprites,frameRect,height,Math.max(0,time-epoch),reducedMotion);
        drawAudience(ctx,sprites,frameRect,cheer,reducedMotion,flash>0);
      }
      lastCheer=cheer;lastFlash=flash;lastNeon=brightness;
      dirty=false;lastSignature=signature;
      if(!ready){ready=true;canvas.style.visibility='visible';onReady?.()}
    }
  }
  function loop(time){
    raf=0;if(disposed||!visible&&!controlsVisible)return;
    if(loaded&&controlsVisible)paintControlIcons(time);
    if(visible){
      if(!manualReveal&&!review&&!reducedMotion&&openingStart!==null)reveal=clamp((time-openingStart)/2500);
      if(loaded)paint(time);
    }
    if(!reducedMotion&&!review)schedule();
  }
  function schedule(){if(!raf&&!disposed&&(visible||controlsVisible))raf=requestAnimationFrame(loop)}
  function resize(){
    if(disposed)return;const b=container.getBoundingClientRect();width=Math.max(1,Math.round(b.width));height=Math.max(1,Math.round(b.height||b.width*2/3));dpr=Math.min(devicePixelRatio||1,1.75);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    const pad=width<600?5:10,artHeight=height-AUDIENCE_HEIGHT;
    const scale=Math.max(.001,Math.min((width-pad*2)/W,(artHeight-pad*2)/H));
    frameRect={x:(width-W*scale)/2,y:(artHeight-H*scale)/2,w:W*scale,h:H*scale};dirty=true;schedule();
  }
  const ro=new ResizeObserver(resize);ro.observe(container);
  const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;entered=entry.intersectionRatio>=.22;if(!entered){nextFlashAt=null;flashStart=null}if(loaded&&entered&&openingStart===null&&!manualReveal&&!review&&!reducedMotion)openingStart=performance.now();if(visible||controlsVisible)schedule();else if(raf){cancelAnimationFrame(raf);raf=0}},{threshold:[0,.22]});io.observe(container);
  function restored(){ready=false;dirty=true;resize()}
  canvas.addEventListener('contextrestored',restored);
  load().catch(error=>{if(!disposed){canvas.style.visibility='hidden';console.warn('Stage drawings could not load:',error.message)}});resize();setStyle(0);
  return{
    get ready(){return ready},
    setProgress(v){const next=clamp(v);if(progress>0&&next===0){epoch=performance.now();poseOverride=null}progress=next;dirty=true;schedule()},
    setAct(v){act=Math.max(0,Math.min(3,Math.trunc(Number(v)||0)));schedule()},
    setRoute(v){route=String(v||'swing');schedule()},
    setReveal(v){manualReveal=true;reveal=clamp(v);dirty=true;schedule()},
    replayReveal(){manualReveal=false;reveal=reducedMotion||review?1:0;openingStart=loaded?performance.now():null;nextFlashAt=flashStart=null;flashIndex=0;epoch=performance.now();poseOverride=null;celOverride=null;dirty=true;schedule()},
    setPose(v){poseOverride=v===null?null:Math.max(0,Math.min(4,Math.trunc(Number(v)||0)));dirty=true;schedule()},
    setStyle,
    setCel(v){celOverride=v===null?null:Math.max(0,Math.min(2,Math.trunc(Number(v)||0)));dirty=true;schedule()},
    get diagnostics(){return{construction:'held-drawings-stage',reveal,celIndex:phase,celName:['closed','half','open'][phase],style:STYLES[style].id,styleFrame:CEL_NAMES[styleFrame],availableStyles:STYLES.map(s=>s.id),assetCount:images.length,poseCount:cast.length,actors:actorReport,cameo:CAMEOS[cameo]?.name??null,hasEncoreTicket:false,shadowMode:'soft-contact-ellipse',fixedOuterFrame:true,frameRect,act,route,ready}},
    resize,
    dispose(){if(disposed)return;disposed=true;ready=false;if(raf)cancelAnimationFrame(raf);ro.disconnect();io.disconnect();controlVisibility.disconnect();canvas.removeEventListener('contextrestored',restored);controls.remove();canvas.remove();images=[];cast=[];backdrops=[];curtainLayers=[];microphone=flashLayers=maskSheet=null;sprites={}}
  };
}
