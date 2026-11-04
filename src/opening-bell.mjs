// The Jolly desk bell in three dimensions: turned brass, a sprung plunger, a star that rides the dome, sound strokes.
import * as THREE from 'three';
import { inkMaterial, mergeGeometries, pencilMaterial, PI_GLSL, turnedNormals } from './opening-pencil.mjs';

// Every part of the shell shares this bend so dome, skirt and engraving wobble as one casting.
const SHELL_DEFORM = `uniform float uSquash,uOval,uOvalPhase,uRingLift;
void deform(inout vec3 p,inout vec3 n){
  float h=clamp((p.y-.3)/.95,0.,1.);
  float oval=uOval*sin(h*3.14159)*cos(2.*atan(p.z,p.x)+uOvalPhase);
  p.xz*=1.+oval+uSquash*.55*sin(h*3.14159);
  p.y=.3+(p.y-.3)*(1.-uSquash)+uRingLift*h;
}`;

const DOME = { a: 1.03, b: .94, y0: .3 };
const STAR_MAPPING = `uniform vec3 uStar;uniform float uStarLift,uStarScale;
vec3 domePoint(float az,float el){return vec3(${DOME.a}*cos(el)*sin(az),${DOME.y0}+${DOME.b}*sin(el),${DOME.a}*cos(el)*cos(az));}
void starPlace(vec3 raw,vec3 rawNormal,out vec3 p,out vec3 n){
  float c=cos(uStar.z),s=sin(uStar.z);
  vec2 q=vec2(c*raw.x-s*raw.y,s*raw.x+c*raw.y)*uStarScale;
  float el=clamp(uStar.y+q.y/${DOME.b},-.05,1.5);
  float az=uStar.x+q.x/(${DOME.a}*max(cos(el),.2));
  vec3 base=domePoint(az,el);
  vec3 tu=normalize(vec3(cos(az),0.,-sin(az)));
  vec3 tv=normalize(vec3(-${DOME.a}*sin(el)*sin(az),${DOME.b}*cos(el),-${DOME.a}*sin(el)*cos(az)));
  vec3 up=normalize(cross(tu,tv));
  p=base+up*(raw.z+uStarLift);
  vec2 rn=vec2(c*rawNormal.x-s*rawNormal.y,s*rawNormal.x+c*rawNormal.y);
  n=normalize(tu*rn.x+tv*rn.y+up*rawNormal.z);
}`;

function lathe(points, segments = 128) {
  // Round each corner with a short curve so the ink hull never tears at a seam.
  return turnedNormals(new THREE.LatheGeometry(new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(points.length * 7), segments), segments);
}

// Profile of a 1960s counter bell. Radius one is the shoulder of the dome.
const PROFILES = {
  plinth: [[0, 0], [1.08, 0], [1.3, .012], [1.38, .05], [1.38, .1], [1.33, .135], [1.21, .15], [1.18, .175], [0, .178]],
  ring: [[0, .17], [1.17, .17], [1.235, .18], [1.25, .21], [1.23, .245], [1.14, .258], [0, .262]],
  skirt: [[0, .25], [1.1, .252], [1.185, .262], [1.205, .29], [1.17, .325], [1.08, .345], [1.04, .35], [0, .36]],
  collar: [[0, 1.2], [.2, 1.205], [.27, 1.228], [.255, 1.255], [.17, 1.28], [.115, 1.305], [0, 1.31]],
  post: [[0, 1.27], [.085, 1.28], [.08, 1.5], [.11, 1.52], [.1, 1.56], [0, 1.57]],
  button: [[0, 1.54], [.2, 1.545], [.38, 1.575], [.43, 1.62], [.415, 1.665], [.34, 1.7], [.2, 1.742], [.08, 1.758], [0, 1.76]],
};

function domeGeometry(lift = 0) {
  const points = [];
  for (let i = 0; i <= 56; i++) {
    const el = i / 56 * Math.PI / 2;
    points.push(new THREE.Vector2(DOME.a * Math.cos(el) + lift, DOME.y0 + DOME.b * Math.sin(el) + lift));
  }
  return turnedNormals(new THREE.LatheGeometry(points, 128), 128);
}

function starGeometry(outer, inner, height) {
  const corners = [];
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? inner : outer; corners.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
  const positions = [], normals = [];
  const emit = (a, b, c, normal, depth) => {
    if (depth) {
      const ab = a.clone().lerp(b, .5), bc = b.clone().lerp(c, .5), ca = c.clone().lerp(a, .5);
      emit(a, ab, ca, normal, depth - 1); emit(ab, b, bc, normal, depth - 1); emit(ca, bc, c, normal, depth - 1); emit(ab, bc, ca, normal, depth - 1);
      return;
    }
    for (const point of [a, b, c]) { positions.push(point.x, point.y, point.z); normals.push(normal.x, normal.y, normal.z); }
  };
  const peak = new THREE.Vector3(0, 0, height);
  for (let i = 0; i < 10; i++) {
    const p = corners[i], q = corners[(i + 1) % 10];
    const a = new THREE.Vector3(p.x, p.y, 0), b = new THREE.Vector3(q.x, q.y, 0);
    // One gem facet per star edge, so the MatCap catches each face differently.
    const normal = b.clone().sub(a).cross(peak.clone().sub(a)).normalize();
    emit(a, b, peak, normal, 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

const STROKE_VERTEX = `${PI_GLSL}
uniform float uLength,uWidth,uStretch,uPluck,uPluckPhase,uBend,uBoil,uReveal;
attribute float aS;attribute float aSide;
varying float vS;varying float vSide;
void main(){
  float s=aS;
  float len=uLength*uStretch;
  float jitter=sin(s*9.+floor(uBoil)*2.1)*.006;
  float offset=uBend*s*s+uPluck*sin(PI*s)*sin(uPluckPhase-s*1.6)+jitter;
  // Brush shape: a point where the sound leaves, a soft round end where it lands.
  float wide=uWidth*smoothstep(0.,.3,s)*sqrt(max(0.,1.-pow(s,6.)))*(1./mix(1.,uStretch,.55));
  vec3 p=vec3(s*len,offset+aSide*wide,0.);
  vS=s;vSide=aSide;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;

const STROKE_FRAGMENT = `uniform sampler2D uTile,uTooth;uniform vec3 uColor;uniform float uBoil,uPixel,uReveal,uOpacity;
varying float vS;varying float vSide;
void main(){
  if(vS>uReveal)discard;
  vec2 sc=gl_FragCoord.xy/uPixel;float j=floor(uBoil);vec2 off=vec2(fract(j*.37)*97.,fract(j*.71)*61.);
  float tooth=texture2D(uTooth,(sc+off)/150.).r;float strokes=texture2D(uTile,(sc+off.yx)/360.).r;
  // A pen line of even weight, as round the star, that wavers slowly the way a hand does and stays smooth at any size.
  float side=abs(vSide),perPixel=fwidth(vSide),limit=1.-texture2D(uTooth,(sc+off)/640.).r*.1;
  float alpha=1.-smoothstep(limit-perPixel*1.2,limit,side);
  if(alpha<=0.)discard;
  vec3 col=uColor*(.88+strokes*.26);
  col=mix(col,vec3(1.,.97,.9),smoothstep(.68,.82,tooth)*.6);
  float line=min(.6,perPixel*2.4*uPixel);
  col=mix(col,vec3(.086,.141,.431),smoothstep(limit-line-perPixel,limit-line,side));
  gl_FragColor=vec4(col,uOpacity*alpha);
}`;

function strokeGeometry(segments = 28) {
  const positions = [], s = [], side = [], index = [];
  for (let i = 0; i <= segments; i++) for (const edge of [-1, 0, 1]) { positions.push(0, 0, 0); s.push(i / segments); side.push(edge); }
  for (let i = 0; i < segments; i++) for (let j = 0; j < 2; j++) {
    const a = i * 3 + j, b = a + 3;
    index.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1));
  geometry.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  geometry.setIndex(index);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);
  return geometry;
}

export function buildBell(shared, kit) {
  const disposables = [];
  const keep = thing => { disposables.push(thing); return thing; };
  const root = new THREE.Group();
  const tilt = new THREE.Group(), shell = new THREE.Group(), plunger = new THREE.Group();
  root.add(tilt); tilt.add(shell, plunger);
  const shellUniforms = { uSquash: { value: 0 }, uOval: { value: 0 }, uOvalPhase: { value: 0 }, uRingLift: { value: 0 } };
  const makeMaterial = (matcap, options = {}) => keep(pencilMaterial(shared, kit.matcap[matcap], options));
  const shellMaterial = (matcap, options = {}) => keep(pencilMaterial(shared, kit.matcap[matcap], { ...options, deformChunk: SHELL_DEFORM, extraUniforms: shellUniforms }));
  const shellInk = keep(inkMaterial(shared, .0135, { deformChunk: SHELL_DEFORM }));
  shellInk.uniforms = { ...shellInk.uniforms, ...shellUniforms };
  const bodyInk = keep(inkMaterial(shared, .0135));
  const fineInk = keep(inkMaterial(shared, .0085));
  const part = (geometry, material, parent, ink = bodyInk) => {
    keep(geometry);
    const mesh = new THREE.Mesh(geometry, material); parent.add(mesh);
    if (ink) mesh.add(new THREE.Mesh(geometry, ink));
    return mesh;
  };

  // Cast base: cobalt plinth, bottle-green ring.
  const cobalt = makeMaterial('cobalt', { hatch: .75, hatchColor: '#0d1548', rim: .1, fleck: .45 });
  const green = makeMaterial('green', { hatch: .7, hatchColor: '#0b2a1d', rim: .08, fleck: .5 });
  part(lathe(PROFILES.plinth), cobalt, tilt);
  part(lathe(PROFILES.ring), green, tilt);

  // Brass shell with meridian hatching, as on the original drawing.
  const brass = shellMaterial('brass', { hatch: .85, hatchMode: 1, hatchColor: '#4a2a0f', rim: .24, fleck: .3, gain: 1.16 });
  const brassBody = makeMaterial('brass', { hatch: .7, hatchColor: '#4a2a0f', rim: .16, fleck: .3, gain: 1.16 });
  part(lathe(PROFILES.skirt), brass, shell, shellInk);
  part(domeGeometry(), brass, shell, shellInk);

  // Engraved double groove and a bead course on the skirt.
  const grooveMaterial = keep(new THREE.MeshBasicMaterial({ color: '#5a3512', toneMapped: false }));
  for (const [radius, y] of [[1.1, .322], [1.0, .402]]) {
    const groove = new THREE.Mesh(keep(new THREE.TorusGeometry(radius, .0058, 6, 128)), grooveMaterial);
    groove.rotation.x = Math.PI / 2; groove.position.y = y; shell.add(groove);
  }
  const beadGeometry = keep(new THREE.SphereGeometry(.021, 12, 10));
  const beads = new THREE.InstancedMesh(beadGeometry, brassBody, 72);
  const beadInk = new THREE.InstancedMesh(beadGeometry, keep(inkMaterial(shared, .0052)), 72);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < 72; i++) {
    const a = i / 72 * Math.PI * 2;
    matrix.setPosition(Math.sin(a) * 1.205, .205, Math.cos(a) * 1.205);
    beads.setMatrixAt(i, matrix); beadInk.setMatrixAt(i, matrix);
  }
  matrix.identity();
  tilt.add(beads, beadInk);
  // Sunray engraving radiating from the collar.
  const rayMaterial = keep(new THREE.MeshBasicMaterial({ color: '#7a4d18', toneMapped: false, transparent: true, opacity: .62 }));
  const engraved = [];
  for (let i = 0; i < 36; i++) {
    const a = i / 36 * Math.PI * 2, top = 1.32, end = i % 2 ? .97 : 1.04;
    const pts = [];
    for (let t = 0; t <= 8; t++) {
      const el = THREE.MathUtils.lerp(top, end, t / 8);
      const r = DOME.a * Math.cos(el) + .0035;
      pts.push(new THREE.Vector3(Math.sin(a) * r, DOME.y0 + DOME.b * Math.sin(el) + .0035, Math.cos(a) * r));
    }
    engraved.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, .0034, 4, false));
  }
  shell.add(new THREE.Mesh(keep(mergeGeometries(engraved)), rayMaterial));

  // The plunger is one rigid assembly travelling on a visible spring.
  const crown = new THREE.Group(); shell.add(crown);
  part(lathe(PROFILES.collar, 72), brassBody, crown);
  const springCurve = [];
  for (let i = 0; i <= 90; i++) { const t = i / 90, a = t * Math.PI * 2 * 6; springCurve.push(new THREE.Vector3(Math.cos(a) * .118, 1.3 + t * .22, Math.sin(a) * .118)); }
  const spring = new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springCurve), 240, .0125, 6, false)), brassBody);
  spring.add(new THREE.Mesh(spring.geometry, fineInk));
  const springPivot = new THREE.Group(); springPivot.position.y = 1.3; spring.position.y = -1.3; springPivot.add(spring); plunger.add(springPivot);
  const post = new THREE.Group(); plunger.add(post);
  part(lathe(PROFILES.post, 48), brassBody, post);
  const crimson = makeMaterial('crimson', { hatch: .75, hatchColor: '#2c0612', rim: .12, fleck: .42 });
  part(lathe(PROFILES.button, 96), crimson, post);

  // Star: gem-cut, wrapped to the dome in the vertex shader so it can travel across it.
  const starUniforms = { uStar: { value: new THREE.Vector3(0, .62, 0) }, uStarLift: { value: 0 }, uStarScale: { value: 1 } };
  const starChunk = `${SHELL_DEFORM}${STAR_MAPPING}`;
  const starVertex = `varying vec3 vN;varying vec3 vObject;varying vec3 vView;${starChunk}
    void main(){vec3 p;vec3 n;starPlace(position,normal,p,n);vec3 dummy=n;deform(p,dummy);vObject=p;
    vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*n);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
  const starMaterial = keep(pencilMaterial(shared, kit.matcap.coral, { hatch: .55, hatchColor: '#5d0f22', rim: .08, fleck: .34, extraUniforms: { ...shellUniforms, ...starUniforms } }));
  starMaterial.vertexShader = starVertex;
  const starMesh = new THREE.Mesh(keep(starGeometry(.385, .172, .045)), starMaterial);
  starMesh.frustumCulled = false; shell.add(starMesh);
  const starInkMaterial = keep(new THREE.ShaderMaterial({
    uniforms: { ...shellUniforms, ...starUniforms, uBoil: shared.uBoil, uColor: { value: new THREE.Color('#16246e') } },
    vertexShader: `${starChunk}uniform float uBoil;void main(){vec3 p;vec3 n;vec3 raw=vec3(position.xy*1.085+vec2(sin(position.x*31.+floor(uBoil)),cos(position.y*29.+floor(uBoil)))*.004,.0);starPlace(raw,vec3(0.,0.,1.),p,n);vec3 d=n;deform(p,d);gl_Position=projectionMatrix*modelViewMatrix*vec4(p+normalize(p-vec3(0.,.3,0.))*.003,1.);}`,
    fragmentShader: 'uniform vec3 uColor;void main(){gl_FragColor=vec4(uColor,1.);}',
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  }));
  starInkMaterial.toneMapped = false;
  const starInk = new THREE.Mesh(starMesh.geometry, starInkMaterial);
  starInk.frustumCulled = false; shell.add(starInk);

  // Sound strokes: four from the original drawing, plus a burst that exists only while ringing.
  const strokeShape = keep(strokeGeometry());
  const strokes = [];
  const strokeLayer = new THREE.Group(); strokeLayer.position.z = .28; root.add(strokeLayer);
  const addStroke = (side, angle, radius, length, width, color, extra) => {
    const uniforms = {
      uTile: shared.uTile, uTooth: shared.uTooth, uBoil: shared.uBoil, uPixel: shared.uPixel,
      uLength: { value: length }, uWidth: { value: width }, uStretch: { value: extra ? .001 : 1 }, uPluck: { value: 0 }, uPluckPhase: { value: 0 },
      uBend: { value: 0 }, uReveal: { value: extra ? 0 : 1.01 }, uOpacity: { value: 1 }, uColor: { value: new THREE.Color(color) },
    };
    const material = keep(new THREE.ShaderMaterial({ uniforms, vertexShader: STROKE_VERTEX, fragmentShader: STROKE_FRAGMENT, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    material.toneMapped = false;
    const mesh = new THREE.Mesh(strokeShape, material);
    const direction = new THREE.Vector2(Math.sin(angle) * side, Math.cos(angle));
    mesh.position.set(direction.x * radius, .4 + direction.y * radius, 0);
    mesh.rotation.z = Math.atan2(direction.y, direction.x);
    mesh.renderOrder = 6;
    strokeLayer.add(mesh);
    strokes.push({ mesh, uniforms, side, angle, radius, length, extra, bend: 0, bendVelocity: 0, pluck: 0, phase: Math.random() * 6, stretch: extra ? 0 : 1, stretchVelocity: 0, hover: 0, glow: 0, touching: false, width, base: new THREE.Color(color), target: new THREE.Color(color), hot: new THREE.Color(color), birth: -Infinity, delay: 0 });
  };
  addStroke(-1, .56, 1.42, .5, .084, '#e4676f');
  addStroke(-1, 1.0, 1.42, .44, .076, '#e3a82b');
  addStroke(1, .56, 1.42, .5, .084, '#e4676f');
  addStroke(1, 1.0, 1.42, .44, .076, '#e3a82b');
  for (const side of [-1, 1]) {
    addStroke(side, .24, 1.58, .46, .05, '#e97780', true);
    addStroke(side, .78, 1.72, .62, .05, '#d9a33a', true);
    addStroke(side, 1.24, 1.5, .52, .046, '#e97780', true);
    addStroke(side, 1.5, 1.34, .4, .044, '#2140d6', true);
  }

  return {
    root, tilt, shell, plunger, post, springPivot, crown, strokes, strokeLayer, starMesh, starInk,
    shellUniforms, starUniforms,
    materials: { brass, brassBody, cobalt, green, crimson, star: starMaterial },
    dispose() { disposables.forEach(thing => thing.dispose()); beads.dispose(); beadInk.dispose(); },
  };
}
