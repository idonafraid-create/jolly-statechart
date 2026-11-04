// The night desk, all built in code: lobby clock, key racks, valance, reception desk and the wall behind them.
import * as THREE from 'three';
import { inkMaterial, INK, mergeGeometries, PAPER, pencilMaterial, PI_GLSL, turnedNormals } from './opening-pencil.mjs';

// Walnut boards laid across a surface in world space, so merged parts need no texture coordinates.
export function walnutMaterial(shared) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTile: shared.uTile, uTooth: shared.uTooth, uBoil: shared.uBoil, uPixel: shared.uPixel, uLight: shared.uLight },
    vertexShader: 'varying vec3 vW;varying vec3 vN;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `varying vec3 vW;varying vec3 vN;uniform sampler2D uTile,uTooth;uniform vec3 uLight;uniform float uBoil,uPixel;
      float h1(float n){return fract(sin(n*91.7)*43758.5453);}
      void main(){
        float jump=floor(uBoil);vec2 sc=gl_FragCoord.xy/uPixel;vec2 off=vec2(fract(jump*.37)*97.,fract(jump*.71)*61.);
        float row=floor(vW.y*1.9+40.),inRow=fract(vW.y*1.9+40.),tone=h1(row*3.1);
        vec3 col=mix(vec3(.25,.125,.06),vec3(.37,.195,.095),tone);
        col*=.66+texture2D(uTile,vec2(vW.x*.16+tone*3.,vW.y*3.4)).r*.74;
        col=mix(col,vec3(.08,.03,.015),smoothstep(.025,0.,inRow)*.8);
        col*=.72+.42*max(0.,dot(normalize(vN),uLight));
        col=mix(col,vec3(.95,.74,.5),smoothstep(.72,.88,texture2D(uTooth,(sc+off)/170.).r)*.16);
        gl_FragColor=vec4(col,1.);
      }`,
  });
  material.toneMapped = false;
  return material;
}

const hash = (seed => () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296));

export function wallPass(shared) {
  const uniforms = {
    ...shared,
    uRes: { value: new THREE.Vector2(1, 1) }, uCenter: { value: new THREE.Vector2() },
    uOldWall: { value: new THREE.Color('#0e1650') }, uOldRay: { value: new THREE.Color('#121c60') },
    uNewWall: { value: new THREE.Color('#0e1650') }, uNewRay: { value: new THREE.Color('#121c60') },
    uBandA: { value: new THREE.Color(PAPER) }, uBandB: { value: new THREE.Color('#d9a33a') },
    uWave: { value: 0 }, uGapA: { value: 40 }, uGapB: { value: 24 },
    uRotOld: { value: 0 }, uRotNew: { value: 0 }, uShift: { value: new THREE.Vector2() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false,
    vertexShader: 'void main(){gl_Position=vec4(position.xy,1.,1.);}',
    fragmentShader: `${PI_GLSL}
      uniform sampler2D uTile,uTooth;uniform vec2 uRes,uCenter,uShift;uniform float uBoil,uPixel,uWave,uGapA,uGapB,uRotOld,uRotNew;
      uniform vec3 uOldWall,uOldRay,uNewWall,uNewRay,uBandA,uBandB;
      void main(){
        vec2 d=gl_FragCoord.xy-uCenter;
        float r=length(d),a=atan(d.x,d.y),j=floor(uBoil);
        // A hand-cut edge, the same wobble on every band so they read as one paper wave.
        float cut=(sin(a*5.+j*1.1)*.5+sin(a*11.-j*.7)*.3+sin(a*23.+j)*.2)*16.*uPixel;
        float R=r+cut;
        vec3 wall,ray;float rot;bool flat_=false;
        if(R<uWave){wall=uNewWall;ray=uNewRay;rot=uRotNew;}
        else if(R<uWave+uGapB){wall=uBandB;ray=uBandB;rot=0.;flat_=true;}
        else if(R<uWave+uGapB+uGapA){wall=uBandA;ray=uBandA;rot=0.;flat_=true;}
        else{wall=uOldWall;ray=uOldRay;rot=uRotOld;}
        vec2 pd=d+uShift*uPixel;
        float pa=atan(pd.x,pd.y);
        float k=fract(pa/(2.*PI)*28.+rot);
        float mask=smoothstep(.0,.012,k)*smoothstep(.5,.488,k);
        vec3 col=mix(wall,ray,mask);
        vec2 sc=gl_FragCoord.xy/uPixel;vec2 off=vec2(fract(j*.37)*97.,fract(j*.71)*61.);
        float strokes=texture2D(uTile,(sc+off*.4)/520.).r;
        float tooth=texture2D(uTooth,(sc+off.yx)/190.).r;
        col*=.8+strokes*.36;
        col=mix(col,vec3(1.,.96,.88),smoothstep(.7,.88,tooth)*(flat_?.3:.2));
        vec2 uv=gl_FragCoord.xy/uRes-.5;
        col*=1.-.32*smoothstep(.34,.95,length(uv*vec2(1.05,1.25)));
        gl_FragColor=vec4(col,1.);
      }`,
  });
  material.toneMapped = false;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false; mesh.renderOrder = -20;
  return { mesh, uniforms, dispose() { mesh.geometry.dispose(); material.dispose(); } };
}

// The leading edge of the wave as a solid paper hoop, passing over the clock and racks on its way out.
export function waveHoop(wallUniforms) {
  const material = new THREE.ShaderMaterial({
    uniforms: wallUniforms, depthTest: false, depthWrite: false,
    vertexShader: 'void main(){gl_Position=vec4(position.xy,1.,1.);}',
    fragmentShader: `uniform sampler2D uTile,uTooth;uniform vec2 uCenter;uniform float uBoil,uPixel,uWave,uGapA,uGapB;uniform vec3 uBandA,uBandB,uNewWall;
      void main(){
        vec2 d=gl_FragCoord.xy-uCenter;float a=atan(d.x,d.y),j=floor(uBoil);
        float cut=(sin(a*5.+j*1.1)*.5+sin(a*11.-j*.7)*.3+sin(a*23.+j)*.2)*16.*uPixel;
        float R=length(d)+cut;
        vec3 col;
        if(R<uWave-uGapB*1.6||R>uWave+uGapA+uGapB)discard;
        if(R<uWave)col=uNewWall;else if(R<uWave+uGapB)col=uBandB;else col=uBandA;
        vec2 sc=gl_FragCoord.xy/uPixel;vec2 off=vec2(fract(j*.37)*97.,fract(j*.71)*61.);
        col*=.82+texture2D(uTile,(sc+off*.4)/520.).r*.32;
        col=mix(col,vec3(1.,.96,.88),smoothstep(.7,.88,texture2D(uTooth,(sc+off.yx)/190.).r)*.25);
        gl_FragColor=vec4(col,1.);
      }`,
  });
  material.toneMapped = false;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false; mesh.renderOrder = 2;
  return { mesh, dispose() { mesh.geometry.dispose(); material.dispose(); } };
}

// Gold pinpricks on the far wall. They bulge as the wave passes rather than being animated one by one.
export function farStars(shared, count = 46) {
  const random = hash(9017);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const offsets = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) offsets.set([(random() - .5) * 2, random(), -3 - random() * 3, random()], i * 4);
  geometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 4));
  geometry.instanceCount = count;
  const uniforms = {
    uBoil: shared.uBoil, uWave: { value: 0 }, uSpan: { value: new THREE.Vector2(10, 6) }, uBase: { value: 0 },
    uCenterPx: { value: new THREE.Vector2() }, uBuffer: { value: new THREE.Vector2(1, 1) }, uColor: { value: new THREE.Color('#f1cf74') },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: `attribute vec4 aOffset;uniform vec2 uSpan,uCenterPx,uBuffer;uniform float uBase,uBoil,uWave;varying vec2 vP;varying float vTw;
      void main(){vec3 at=vec3(aOffset.x*uSpan.x,uBase+aOffset.y*uSpan.y,aOffset.z);
      vec4 clip=projectionMatrix*modelViewMatrix*vec4(at,1.);vec2 px=(clip.xy/clip.w*.5+.5)*uBuffer;
      float pop=exp(-abs(length(px-uCenterPx)-uWave)/(uBuffer.y*.07));
      float tw=fract(aOffset.w*7.+floor(uBoil)*.34);vTw=.5+tw*.5;
      float size=(.035+aOffset.w*.05)*(.8+tw*.4)+pop*.11;vP=position.xy;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(at+vec3(position.xy*size,0.),1.);}`,
    fragmentShader: `uniform vec3 uColor;varying vec2 vP;varying float vTw;
      void main(){vec2 q=abs(vP);float s=pow(q.x,.55)+pow(q.y,.55);float a=smoothstep(1.,.86,s);if(a<.02)discard;gl_FragColor=vec4(uColor,a*vTw);}`,
  });
  material.toneMapped = false;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false; mesh.renderOrder = -15;
  return { mesh, uniforms, dispose() { geometry.dispose(); material.dispose(); } };
}

function drawDial(size = 2048) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const g = canvas.getContext('2d'), c = size / 2, unit = c * .985;
  const random = hash(3301);
  g.fillStyle = PAPER; g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
  const glow = g.createRadialGradient(c, c, unit * .1, c, c, unit);
  glow.addColorStop(0, '#fffaf0'); glow.addColorStop(.62, '#f8efd9'); glow.addColorStop(1, '#ebd9b2');
  g.fillStyle = glow; g.beginPath(); g.arc(c, c, unit, 0, Math.PI * 2); g.fill();
  g.save(); g.translate(c, c);
  // Engine-turned sunburst, the same motif as the theatre's crown.
  for (let i = 0; i < 96; i++) {
    const a = i / 96 * Math.PI * 2;
    g.save(); g.rotate(a); g.beginPath();
    g.moveTo(0, -unit * .1); g.quadraticCurveTo(unit * (.006 + random() * .004), -unit * .4, 0, -unit * .695);
    g.lineTo(unit * .014, -unit * .695); g.closePath();
    g.fillStyle = i % 2 ? 'rgba(201,152,62,.3)' : 'rgba(33,64,214,.05)'; g.fill(); g.restore();
  }
  const ring = (r, width, color) => { g.strokeStyle = color; g.lineWidth = unit * width; g.beginPath(); g.arc(0, 0, unit * r, 0, Math.PI * 2); g.stroke(); };
  ring(.7, .006, '#c9983e'); ring(.712, .0022, '#2140d6');
  ring(.93, .009, '#2140d6'); ring(.945, .0026, '#2140d6');
  // Chapter ring with hand-placed ticks and typewriter numerals.
  for (let i = 0; i < 60; i++) {
    g.save(); g.rotate(i / 60 * Math.PI * 2 + (random() - .5) * .004);
    const major = i % 5 === 0;
    g.strokeStyle = major ? '#16246e' : '#2140d6'; g.lineWidth = unit * (major ? .012 : .0042); g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, -unit * (major ? .892 : .912)); g.lineTo(0, -unit * .928); g.stroke(); g.restore();
  }
  g.fillStyle = '#16246e'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${unit * .094}px "Special Elite",serif`;
  ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((label, i) => {
    g.save(); g.rotate(i / 12 * Math.PI * 2); g.translate(0, -unit * .803); g.fillText(label, 0, 0); g.restore();
  });
  // The department's name set on the arc that stays visible above the bell.
  const arc = 'AFTER HOURS DEPARTMENT', spread = 1.24;
  g.font = `${unit * .05}px "Courier Prime",monospace`; g.fillStyle = '#a03953';
  [...arc].forEach((letter, i) => {
    g.save(); g.rotate((i / (arc.length - 1) - .5) * spread); g.translate(0, -unit * .632); g.fillText(letter, 0, 0); g.restore();
  });
  g.restore();
  return canvas;
}

function handGeometry(length, width, tail) {
  const shape = new THREE.Shape();
  shape.moveTo(-width * .5, -tail); shape.lineTo(-width * .34, length * .58);
  shape.quadraticCurveTo(-width * 1.5, length * .68, -width * .26, length * .78);
  shape.lineTo(0, length); shape.lineTo(width * .26, length * .78);
  shape.quadraticCurveTo(width * 1.5, length * .68, width * .34, length * .58);
  shape.lineTo(width * .5, -tail); shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: .018, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 1, curveSegments: 8 });
}

export function lobbyClock(shared, kit) {
  const group = new THREE.Group(), disposables = [];
  const keep = thing => { disposables.push(thing); return thing; };
  const dial = keep(new THREE.CanvasTexture(drawDial()));
  dial.anisotropy = 8;
  const faceMaterial = keep(new THREE.ShaderMaterial({
    uniforms: { uMap: { value: dial }, uTile: shared.uTile, uTooth: shared.uTooth, uBoil: shared.uBoil, uPixel: shared.uPixel },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D uMap,uTile,uTooth;uniform float uBoil,uPixel;varying vec2 vUv;
      void main(){vec3 c=texture2D(uMap,vUv).rgb;float j=floor(uBoil);vec2 sc=gl_FragCoord.xy/uPixel;vec2 off=vec2(fract(j*.37)*97.,fract(j*.71)*61.);
      c*=.92+texture2D(uTile,(sc+off)/430.).r*.14;
      c=mix(c,vec3(.72,.56,.33),smoothstep(.62,.8,texture2D(uTooth,(sc+off.yx)/170.).r)*.1);
      gl_FragColor=vec4(c,1.);}`,
  }));
  faceMaterial.toneMapped = false;
  const face = new THREE.Mesh(keep(new THREE.CircleGeometry(1, 128)), faceMaterial);
  group.add(face);
  const brass = keep(pencilMaterial(shared, kit.matcap.brass, { hatch: .55, hatchColor: '#4a2a0f', rim: .1, fleck: .28, tint: '#ffe39a' }));
  const profile = [[1.112, -.02], [1.112, .012], [1.1, .06], [1.075, .08], [1.055, .05], [1.03, .07], [1.0, .05], [.985, .01]].map(([x, y]) => new THREE.Vector2(x, y));
  const bezelGeometry = keep(turnedNormals(new THREE.LatheGeometry(new THREE.SplineCurve(profile).getPoints(42), 128), 128));
  const bezel = new THREE.Mesh(bezelGeometry, brass);
  bezel.rotation.x = Math.PI / 2;
  bezel.add(new THREE.Mesh(bezelGeometry, keep(inkMaterial(shared, .012))));
  group.add(bezel);
  const handMaterial = keep(pencilMaterial(shared, kit.matcap.cobalt, { hatch: .25, hatchColor: '#0d1548', rim: 0, fleck: .25, tint: '#8a97e6' }));
  const coral = keep(pencilMaterial(shared, kit.matcap.coral, { hatch: .2, hatchColor: '#5d0f22', rim: 0, fleck: .2 }));
  const ink = keep(inkMaterial(shared, .007));
  const makeHand = (geometry, material, z) => {
    keep(geometry);
    const pivot = new THREE.Group(); pivot.position.z = z;
    const mesh = new THREE.Mesh(geometry, material); pivot.add(mesh);
    mesh.add(new THREE.Mesh(geometry, ink));
    group.add(pivot);
    return pivot;
  };
  const hour = makeHand(handGeometry(.5, .058, .06), handMaterial, .02);
  const minute = makeHand(handGeometry(.72, .04, .08), handMaterial, .05);
  const second = makeHand(handGeometry(.9, .012, .16), coral, .08);
  return {
    group, hour, minute, second,
    dispose() { disposables.forEach(thing => thing.dispose()); },
  };
}

const CLOTH_DEFORM = `uniform float uSway,uSwayPhase;
void deform(inout vec3 p,inout vec3 n){
  float low=clamp(-p.y/1.1,0.,1.);
  float wave=sin(p.x*1.7-uSwayPhase);
  p.y+=uSway*low*wave*.09;
  p.z+=uSway*low*cos(p.x*1.7-uSwayPhase)*.2;
  n=normalize(n+vec3(-.5*uSway*low*cos(p.x*1.7-uSwayPhase),0.,0.));
}`;

// A tassel hanging from y=0: a turned head and a skirt of strands, so it reads as thread and not as a bottle.
export function tasselGeometry() {
  // Bottom to top: a lathe drawn the other way faces inward, and only its dark ink shell shows.
  const profile = [[.0, -.31], [.082, -.3], [.05, -.11], [.03, -.085], [.062, -.05], [.05, -.01], [0, .0]].map(([x, y]) => new THREE.Vector2(x, y));
  const segments = 36, geometry = new THREE.LatheGeometry(new THREE.SplineCurve(profile).getPoints(30), segments);
  const at = geometry.attributes.position;
  for (let i = 0; i < at.count; i++) {
    const y = at.getY(i), strands = 1 + .09 * Math.cos(Math.atan2(at.getZ(i), at.getX(i)) * 14) * Math.min(1, Math.max(0, (-.1 - y) / .05));
    at.setX(i, at.getX(i) * strands); at.setZ(i, at.getZ(i) * strands);
  }
  return turnedNormals(geometry, segments);
}

// A true swagged valance: catenary drape plus pleats gathered at each join, so the shading comes from the folds.
export function valance(shared, kit, stageLight) {
  const group = new THREE.Group(), disposables = [];
  const keep = thing => { disposables.push(thing); return thing; };
  const clothUniforms = { uSway: { value: 0 }, uSwayPhase: { value: 0 } };
  const cloth = keep(pencilMaterial(shared, kit.matcap.cloth, { hatch: .3, hatchColor: '#6e1830', rim: 0, fleck: .22, grain: .8, deformChunk: CLOTH_DEFORM, extraUniforms: clothUniforms, stageLight }));
  const trim = keep(pencilMaterial(shared, kit.matcap.brass, { hatch: .35, hatchColor: '#4a2a0f', rim: 0, fleck: .25, tint: '#ffe39a', deformChunk: CLOTH_DEFORM, extraUniforms: clothUniforms, stageLight }));
  const ink = keep(inkMaterial(shared, .012, { deformChunk: CLOTH_DEFORM }));
  ink.uniforms = { ...ink.uniforms, ...clothUniforms };
  let built = [];
  return {
    group, uniforms: clothUniforms,
    build(width, drop) {
      group.clear(); built.forEach(mesh => mesh.geometry.dispose());
      built = [];
      // An odd count keeps a swag, not a tassel, over the XII on the clock.
      const swags = Math.max(7, Math.round(width / .92) | 1), swagWidth = width / swags;
      const nx = swags * 28, ny = 22, positions = [], index = [];
      const surfaceZ = (x, v, { f, edge }) => {
        // Folds run from the two raised corners down through the belly of the swag.
        const catenary = v + .62 * Math.pow(Math.abs(f - .5) * 2, 1.7) * (1 - v * .25);
        const fold = Math.sin(catenary * Math.PI * 3.6) * Math.pow(edge, .5) * (.12 + v * .2);
        const pleat = Math.cos(f * Math.PI * 2 * 7) * Math.pow(1 - edge, 2.2) * .07;
        return Math.sin(v * Math.PI * .68) * edge * .22 + fold * .3 + pleat;
      };
      const shape = x => {
        const u = (x / swagWidth + swags / 2), f = u - Math.floor(u), edge = Math.sin(Math.PI * f);
        return { f, edge, depth: drop * (.5 + .5 * Math.pow(edge, .72)) };
      };
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
        const x = -width / 2 + i / nx * width, v = j / ny;
        const place = shape(x);
        positions.push(x, -v * place.depth, surfaceZ(x, v, place));
      }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
        index.push(a, c, b, b, c, d);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(index); geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, cloth); mesh.frustumCulled = false; group.add(mesh); built.push(mesh);
      const hull = new THREE.Mesh(geometry, ink); hull.frustumCulled = false; group.add(hull);
      // Gold braid follows the cut edge of each swag; a tassel hangs at each join.
      const hem = [];
      for (let i = 0; i <= nx; i++) {
        const x = -width / 2 + i / nx * width, place = shape(x);
        hem.push(new THREE.Vector3(x, -place.depth, surfaceZ(x, 1, place) + .03));
      }
      const braidGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hem), nx, .022, 6, false);
      const braid = new THREE.Mesh(braidGeometry, trim); braid.frustumCulled = false; group.add(braid); built.push(braid);
      const braidInk = new THREE.Mesh(braidGeometry, ink); braidInk.frustumCulled = false; group.add(braidInk);
      const tassel = tasselGeometry().scale(.74, .74, .74);
      const tassels = mergeGeometries(Array.from({ length: swags + 1 }, (_, i) => tassel.clone().translate(-width / 2 + i * swagWidth, -drop * .5, .05)));
      const pieces = new THREE.Mesh(tassels, trim); pieces.frustumCulled = false; group.add(pieces); built.push(pieces);
      const piecesInk = new THREE.Mesh(tassels, ink); piecesInk.frustumCulled = false; group.add(piecesInk);
      tassel.dispose();
    },
    dispose() {
      built.forEach(mesh => mesh.geometry.dispose());
      disposables.forEach(thing => thing.dispose());
    },
  };
}

const DRAPE_DEFORM = `uniform float uOpen,uHalf,uTop,uDrop,uClock;uniform vec3 uPress;
void deform(inout vec3 p,inout vec3 n){
  float side=p.x<0.?-1.:1.,u=clamp(abs(p.x)/uHalf,0.,1.),v=clamp((uTop-p.y)/uDrop,0.,1.);
  // Hanging cloth breathes a little, and gives way under the pointer.
  vec2 d=p.xy-uPress.xy;float give=exp(-dot(d,d)*1.4)*uPress.z;
  p.z+=sin(p.x*.9+uClock*.6)*sin(v*2.2+uClock*.37)*v*.035-give*.14;
  n.xy+=d*give*.5;
  // The inner edge leads, so the two halves sweep up and away into the corners behind the valance.
  float t=clamp(uOpen*(1.24-.24*u),0.,1.),e=t*t*(3.-2.*t);
  p.x=side*mix(abs(p.x),uHalf*1.06,e*(.98-.3*v*(1.-e)));
  p.y+=pow(e,1.3)*uDrop*(.05+.9*v*v*(1.-u*.6));
  // Gathered cloth stands in deeper folds.
  p.z*=1.+e*1.5;
  n.x*=1.+e*3.;
  n=normalize(n);
}`;

// The house curtain, the same cloth as the valance. Rounded folds with narrow dark valleys, no two alike.
export function stageDrape(shared, kit, stageLight) {
  const group = new THREE.Group(), disposables = [];
  const keep = thing => { disposables.push(thing); return thing; };
  const uniforms = { uOpen: { value: 0 }, uHalf: { value: 4 }, uTop: { value: 3 }, uDrop: { value: 6 }, uClock: { value: 0 }, uPress: { value: new THREE.Vector3(0, 0, 0) } };
  const cloth = keep(pencilMaterial(shared, kit.matcap.cloth, { hatch: .16, hatchColor: '#5a1228', rim: 0, fleck: .18, grain: .75, deformChunk: DRAPE_DEFORM, extraUniforms: uniforms, stageLight }));
  const trim = keep(pencilMaterial(shared, kit.matcap.brass, { hatch: .25, hatchColor: '#4a2a0f', rim: 0, fleck: .2, tint: '#ffe39a', deformChunk: DRAPE_DEFORM, extraUniforms: uniforms, stageLight }));
  const ink = keep(inkMaterial(shared, .008, { deformChunk: DRAPE_DEFORM }));
  ink.uniforms = { ...ink.uniforms, ...uniforms };
  // Dark behind the seam, warm only when the curtain is coaxed apart.
  const glowMaterial = keep(new THREE.MeshBasicMaterial({ color: '#2a0614', toneMapped: false }));
  const dark = new THREE.Color('#2a0614'), warm = new THREE.Color('#ffcf7a');
  let built = [];
  const glow = new THREE.Mesh(keep(new THREE.PlaneGeometry(.8, 1)), glowMaterial);
  group.add(glow);
  return {
    group, uniforms, glow,
    warmth(amount) { glowMaterial.color.lerpColors(dark, warm, amount); },
    build({ halfWidth, top, bottom }) {
      group.clear(); group.add(glow); built.forEach(geometry => geometry.dispose());
      const drop = top - bottom, seam = .003;
      uniforms.uHalf.value = halfWidth; uniforms.uTop.value = top; uniforms.uDrop.value = drop;
      glow.scale.y = drop; glow.position.set(0, (top + bottom) / 2, -.3);
      const folds = Math.max(6, Math.round(halfWidth / .3)), nx = folds * 12, ny = 22, positions = [], index = [];
      const layouts = {};
      for (const side of [-1, 1]) {
        let seed = side > 0 ? 4177 : 9011;
        const rand = () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296);
        const spans = Array.from({ length: folds }, () => .62 + rand() * .86), total = spans.reduce((a, b) => a + b, 0);
        let at = 0;
        layouts[side] = spans.map(span => { const from = at; at += span / total; return { from, to: at, depth: .62 + rand() * .55, lean: (rand() - .5) * .05, phase: rand() * 6 }; });
      }
      const point = (side, u, v) => {
        const fold = layouts[side].find(item => u <= item.to) ?? layouts[side].at(-1), t = (u - fold.from) / (fold.to - fold.from);
        // Rounded on the ridge and pinched in the valley; pleats open out toward the hem.
        const ridge = Math.pow(Math.max(0, Math.sin(Math.PI * t)), .7), flare = .62 + v * .62;
        const x = seam + u * (halfWidth - seam) + (u > .02 && u < .98 ? fold.lean * v + Math.sin(v * 3.1 + fold.phase) * .009 : 0);
        return [side * Math.max(seam, x), top - v * drop, .14 * fold.depth * flare * (ridge - .42)];
      };
      for (const side of [-1, 1]) {
        const base = positions.length / 3;
        for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) positions.push(...point(side, i / nx, j / ny));
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          const a = base + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
          if (side > 0) index.push(a, c, b, b, c, d); else index.push(a, b, c, b, d, c);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(index); geometry.computeVertexNormals();
      // A braid along the hem and a fringe of gold bullion below it. They start clear of the seam: anything crossing it would be torn between the halves.
      const pieces = [];
      for (const side of [-1, 1]) {
        const rope = Array.from({ length: nx + 1 }, (_, i) => { const [x, y, z] = point(side, .014 + i / nx * .986, 1); return new THREE.Vector3(x, y + .075, z * .35 + .1); });
        pieces.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rope), nx, .019, 5, false));
        const strands = Math.round(halfWidth / .017);
        for (let i = 0; i < strands; i++) {
          const u = .014 + i / strands * .986, [x, y, z] = point(side, u, 1), lean = Math.sin(i * 2.399);
          const strand = new THREE.PlaneGeometry(.0105, .092 + Math.abs(Math.sin(i * 1.3)) * .012).translate(x, y + .022, z * .35 + .096);
          const normal = strand.attributes.normal;
          for (let n = 0; n < normal.count; n++) normal.setXYZ(n, lean * .66, -.1, .74);
          pieces.push(strand);
        }
      }
      const braid = mergeGeometries(pieces);
      for (const [shape, material] of [[geometry, cloth], [geometry, ink], [braid, trim]]) {
        const mesh = new THREE.Mesh(shape, material); mesh.frustumCulled = false; group.add(mesh);
      }
      built = [geometry, braid];
    },
    dispose() { built.forEach(geometry => geometry.dispose()); disposables.forEach(thing => thing.dispose()); },
  };
}

// Desk top: plank wood, a hatched shadow that leans away from the light, a ripple when the bell strikes.
export function deskTop(shared) {
  const uniforms = { ...shared, uRipple: { value: 0 }, uRippleAlpha: { value: 0 }, uFront: { value: 1.8 }, uBack: { value: -1.2 }, uLamp: { value: new THREE.Vector3(9, 0, 0) } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `varying vec3 vW;uniform sampler2D uTile,uTooth;uniform vec3 uLight,uLamp;uniform float uBoil,uPixel,uRipple,uRippleAlpha,uFront,uBack;
      float h1(float n){return fract(sin(n*91.7)*43758.5453);}
      void main(){
        float j=floor(uBoil);vec2 sc=gl_FragCoord.xy/uPixel;vec2 off=vec2(fract(j*.37)*97.,fract(j*.71)*61.);
        float row=floor(vW.z*2.3+40.),inRow=fract(vW.z*2.3+40.);
        float joint=floor((vW.x+h1(row)*9.)*.46);
        float tone=h1(row*3.1+joint*7.7);
        vec3 col=mix(vec3(.62,.35,.15),vec3(.76,.47,.21),tone);
        float grain=texture2D(uTile,vec2(vW.x*.22+tone*3.+joint*.31,vW.z*2.6)).r;
        col*=.74+grain*.5;
        float seam=smoothstep(.03,.0,inRow)+smoothstep(.97,1.,inRow)+smoothstep(.012,.0,abs(fract((vW.x+h1(row)*9.)*.46)-.5)-.488)*0.;
        col=mix(col,vec3(.27,.13,.06),clamp(seam,0.,1.)*.8);
        float tooth=texture2D(uTooth,(sc+off)/170.).r;
        col=mix(col,vec3(1.,.9,.72),smoothstep(.68,.86,tooth)*.24);
        // Hatched contact shadow leaning away from the pointer's light.
        vec2 sq=(vW.xz-vec2(-uLight.x*.3,-.06))/vec2(1.68,1.52);
        float d=length(sq);
        float wob=(texture2D(uTooth,(sc+off)/900.).r-.5)*.5;
        float hatch=smoothstep(-.1,.5,sin((sc.x+sc.y*1.4)/2.7+wob*5.+j*1.7));
        float body=smoothstep(1.08,.86,d+wob*.12);
        col=mix(col,vec3(.13,.09,.2),body*(.28+.5*hatch));
        float halo=smoothstep(1.,1.35,d)*smoothstep(1.9,1.35,d);
        col*=1.+halo*.05;
        float ring=exp(-pow((length(vW.xz*vec2(1.,1.))-uRipple)*7.,2.));
        col=mix(col,vec3(1.,.9,.58),ring*uRippleAlpha*.75);
        col*=mix(.84,1.04,smoothstep(uBack,uFront,vW.z));
        // The banker's lamp pools on the wood and breathes with the band.
        float pool=exp(-dot((vW.xz-uLamp.xy)/vec2(1.05,.8),(vW.xz-uLamp.xy)/vec2(1.05,.8)));
        col+=vec3(.5,.34,.13)*pool*uLamp.z;
        gl_FragColor=vec4(col,1.);
      }`,
  });
  material.toneMapped = false;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.rotation.x = -Math.PI / 2;
  return { mesh, uniforms, dispose() { mesh.geometry.dispose(); material.dispose(); } };
}

// Desk front: walnut relief panels in real depth, a brass rail, and a plain brass plate for the two actions.
export function deskFront(shared, kit) {
  const group = new THREE.Group(), disposables = [];
  const keep = thing => { disposables.push(thing); return thing; };
  const walnut = keep(walnutMaterial(shared));
  const plate = keep(pencilMaterial(shared, kit.matcap.cream, { hatch: .05, hatchColor: '#7a4d18', rim: 0, fleck: .16, grain: .7, tint: '#d8c27a' }));
  const cobalt = keep(pencilMaterial(shared, kit.matcap.cobalt, { hatch: .3, hatchColor: '#0d1548', rim: 0, fleck: .42 }));
  const brass = keep(pencilMaterial(shared, kit.matcap.brass, { hatch: .4, hatchColor: '#4a2a0f', rim: 0, fleck: .26, tint: '#ffe39a' }));
  const gold = keep(pencilMaterial(shared, kit.matcap.cream, { hatch: .08, hatchColor: '#7a4d18', rim: 0, fleck: .3, tint: '#efb63e' }));
  const line = keep(new THREE.MeshBasicMaterial({ color: INK, toneMapped: false }));
  const railInk = keep(inkMaterial(shared, .011));
  let built = [], batches = new Map();
  // Everything sharing a material lands in one draw call.
  const put = (geometry, material) => { if (!batches.has(material)) batches.set(material, []); batches.get(material).push(geometry); };
  const box = (x, y, w, h, depth, z, material) => { const g = new THREE.BoxGeometry(w, h, depth); g.translate(x, y, z + depth / 2); put(g, material); };
  const extrude = (shape, depth, z, material, bevel = 0) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 12 });
    g.translate(0, 0, z); put(g, material);
  };
  const steppedPoints = (cx, top, bottom, halfWidth, step) => {
    // Three stepped shoulders: the silhouette of The Jolly's facade.
    const w = halfWidth;
    return [[cx - w, bottom], [cx + w, bottom], [cx + w, top - step * 2], [cx + w * .72, top - step * 2], [cx + w * .72, top - step], [cx + w * .42, top - step], [cx + w * .42, top],
      [cx - w * .42, top], [cx - w * .42, top - step], [cx - w * .72, top - step], [cx - w * .72, top - step * 2], [cx - w, top - step * 2]].map(([x, y]) => new THREE.Vector2(x, y));
  };
  const stepped = (...args) => new THREE.Shape(steppedPoints(...args));
  // A pen line of even weight round a stepped shape, lying on its front face so the viewing angle can't break it.
  const penLine = (cx, top, bottom, halfWidth, step, weight, z, material) => {
    const shape = stepped(cx, top, bottom, halfWidth, step);
    shape.holes.push(new THREE.Path(steppedPoints(cx, top - weight, bottom + weight, halfWidth - weight, step)));
    extrude(shape, .002, z, material);
  };
  return {
    group,
    // width and height describe the part of the desk the viewer can see; x/y span the plaque.
    build({ width, height, plaqueWidth }) {
      built.forEach(mesh => { group.remove(mesh); mesh.geometry.dispose(); });
      built = []; batches = new Map();
      box(0, -height * .6, width * 1.5, height * 1.2, .02, -.02, walnut);
      // Brass rail and two inlay stripes along the top.
      const rail = new THREE.CylinderGeometry(.052, .052, width * 1.5, 16); rail.rotateZ(Math.PI / 2); rail.translate(0, -.012, .06);
      const railMesh = new THREE.Mesh(rail, brass); railMesh.frustumCulled = false; group.add(railMesh); built.push(railMesh);
      const railLine = new THREE.Mesh(rail, railInk); railLine.frustumCulled = false; group.add(railLine);
      box(0, -.092, width * 1.5, .026, .008, 0, cobalt);
      box(0, -.128, width * 1.5, .009, .006, 0, brass);
      // Cobalt kick plate.
      const kick = Math.min(.17, height * .13);
      box(0, -height + kick / 2 - .04, width * 1.5, kick, .04, 0, cobalt);
      box(0, -height + kick + .002 - .04, width * 1.5, .012, .05, 0, brass);
      const top = -.165, bottom = -height + kick + .012;
      // Plaque, recessed, with brass and ink borders and corner studs.
      const pw = plaqueWidth / 2, plaque = new THREE.Shape();
      plaque.moveTo(-pw, bottom + .03); plaque.lineTo(pw, bottom + .03); plaque.lineTo(pw, top - .02); plaque.lineTo(-pw, top - .02); plaque.closePath();
      box(0, (top + bottom) / 2 + .005, plaqueWidth + .05, top - bottom - .018, .012, .004, line);
      box(0, (top + bottom) / 2 + .005, plaqueWidth + .03, top - bottom - .036, .016, .006, brass);
      extrude(plaque, .012, .012, plate);
      // An engraved line just inside the plate's edge.
      const rule = new THREE.Shape(); rule.moveTo(-pw + .07, bottom + .055); rule.lineTo(pw - .07, bottom + .055); rule.lineTo(pw - .07, top - .042); rule.lineTo(-pw + .07, top - .042); rule.closePath();
      const ruleHole = new THREE.Path(); ruleHole.moveTo(-pw + .078, bottom + .063); ruleHole.lineTo(pw - .078, bottom + .063); ruleHole.lineTo(pw - .078, top - .05); ruleHole.lineTo(-pw + .078, top - .05); ruleHole.closePath();
      rule.holes.push(ruleHole);
      extrude(rule, .001, .0245, brass);
      for (const sx of [-1, 1]) for (const sy of [bottom + .07, top - .06]) {
        const stud = new THREE.SphereGeometry(.02, 12, 10); stud.translate(sx * (pw - .04), sy, .03); put(stud, brass);
      }
      // Stepped walnut panels marching outward from the plaque, each framing a cobalt field with the hotel's sunrise in it.
      const panelWidth = Math.max(.62, Math.min(1.1, (top - bottom) * .95)), gap = .05, step = Math.min(.09, (top - bottom) * .1);
      let x = pw + .1 + panelWidth / 2;
      while (x - panelWidth / 2 < width * .75) {
        for (const side of [-1, 1]) {
          const cx = side * x, half = panelWidth / 2, faceTop = top - .02, faceBottom = bottom + .016;
          extrude(stepped(cx, faceTop, faceBottom, half, step), .03, .004, walnut, .004);
          penLine(cx, faceTop, faceBottom, half, step, .009, .039, gold);
          const inset = .06, fieldTop = faceTop - inset, fieldBottom = faceBottom + inset, fieldHalf = half - inset;
          extrude(stepped(cx, fieldTop, fieldBottom, fieldHalf, step), .004, .038, cobalt);
          penLine(cx, fieldTop, fieldBottom, fieldHalf, step, .012, .043, gold);
          const tall = fieldTop - fieldBottom;
          for (let ray = -3; ray <= 3; ray++) {
            const angle = ray * .36, reach = Math.min(tall * .86, (fieldHalf - .03) / Math.max(.01, Math.abs(Math.sin(angle)))), spread = .055;
            const wedge = new THREE.Shape([new THREE.Vector2(cx + Math.sin(angle - spread) * .05, fieldBottom + .02 + Math.cos(angle - spread) * .05), new THREE.Vector2(cx + Math.sin(angle - spread) * reach, fieldBottom + .02 + Math.cos(angle - spread) * reach), new THREE.Vector2(cx + Math.sin(angle + spread) * reach, fieldBottom + .02 + Math.cos(angle + spread) * reach), new THREE.Vector2(cx + Math.sin(angle + spread) * .05, fieldBottom + .02 + Math.cos(angle + spread) * .05)]);
            extrude(wedge, .002, .043, gold);
          }
          const sun = new THREE.Shape(); sun.absarc(cx, fieldBottom + .012, Math.min(.13, fieldHalf * .34), 0, Math.PI, false); sun.closePath();
          extrude(sun, .004, .045, gold);
        }
        x += panelWidth + gap;
      }
      for (const [material, list] of batches) {
        const mesh = new THREE.Mesh(mergeGeometries(list), material); mesh.frustumCulled = false; group.add(mesh); built.push(mesh);
      }
    },
    dispose() {
      built.forEach(mesh => mesh.geometry.dispose());
      disposables.forEach(thing => thing.dispose());
    },
  };
}
