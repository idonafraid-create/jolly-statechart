// Coloured-pencil rendering for the opening: hand-painted MatCaps, redrawn hatching and ink contours.
import * as THREE from 'three';
import { paintPencilTile } from './pencil-tile.mjs';

// Painted textures stay display-referred: what the pencil drew is what reaches the screen.
THREE.ColorManagement.enabled = false;
export const PAPER = '#f6f1e6', INK = '#16246e';
export const PI_GLSL = 'const float PI=3.14159265;';
const MATCAPS = ['brass', 'cobalt', 'green', 'crimson', 'coral', 'cream'];

// A lathe starts and ends on the same meridian, and computeVertexNormals treats those two edges as strangers.
// Left alone that draws a line down the turned part, so both edges share one normal.
export function turnedNormals(geometry, segments) {
  geometry.computeVertexNormals();
  const normal = geometry.attributes.normal, rows = normal.count / (segments + 1), first = new THREE.Vector3(), last = new THREE.Vector3();
  for (let row = 0; row < rows; row++) {
    const end = segments * rows + row;
    first.fromBufferAttribute(normal, row).add(last.fromBufferAttribute(normal, end)).normalize();
    normal.setXYZ(row, first.x, first.y, first.z); normal.setXYZ(end, first.x, first.y, first.z);
  }
  return geometry;
}

// One draw call for many small parts that share a material.
export function mergeGeometries(geometries) {
  const flat = geometries.map(source => (source.index ? source.toNonIndexed() : source));
  const count = flat.reduce((total, source) => total + source.attributes.position.array.length, 0);
  const positions = new Float32Array(count), normals = new Float32Array(count);
  let at = 0;
  flat.forEach((source, i) => {
    positions.set(source.attributes.position.array, at); normals.set(source.attributes.normal.array, at);
    at += source.attributes.position.array.length;
    if (source !== geometries[i]) source.dispose();
    geometries[i].dispose();
  });
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return merged;
}

// Cloth has broad, soft light and deep folds. The hand-painted sphere's hot highlights turned the drape into raw meat.
const CLOTH_RAMP = [[0, 70, 8, 32], [.28, 148, 22, 52], [.56, 214, 56, 76], [.8, 238, 92, 98], [1, 250, 150, 136]];
const WOOD_RAMP = [[0, 30, 14, 8], [.3, 62, 32, 16], [.56, 100, 56, 28], [.8, 136, 84, 44], [1, 184, 124, 70]];
function paintedSphere(ramp, size = 256) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const g = canvas.getContext('2d'), image = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (x + .5) / size * 2 - 1, ny = 1 - (y + .5) / size * 2, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const light = Math.max(0, Math.min(1, (-.46 * nx + .5 * ny + .74 * nz) * .7 + .24));
    let stop = 1;
    while (stop < ramp.length - 1 && ramp[stop][0] < light) stop++;
    const [a0, ...from] = ramp[stop - 1], [a1, ...to] = ramp[stop], k = (light - a0) / (a1 - a0), at = (y * size + x) * 4;
    for (let c = 0; c < 3; c++) image.data[at + c] = from[c] + (to[c] - from[c]) * k;
    image.data[at + 3] = 255;
  }
  g.putImageData(image, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

function toothTexture(renderer, size = 256) {
  const data = new Uint8Array(size * size);
  let seed = 7191;
  const rand = () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296);
  const field = new Float32Array(size * size);
  for (let i = 0; i < field.length; i++) field[i] = rand();
  // Two blur passes turn white noise into paper-sized bumps that tile without seams.
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float32Array(field.length);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let total = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) total += field[((y + j + size) % size) * size + (x + i + size) % size];
      next[y * size + x] = total / 9;
    }
    field.set(next);
  }
  let low = 1, high = 0;
  for (const value of field) { low = Math.min(low, value); high = Math.max(high, value); }
  field.forEach((value, i) => { data[i] = (value - low) / (high - low) * 255; });
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function pencilTile(renderer) {
  const texture = new THREE.CanvasTexture(paintPencilTile());
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

export async function loadPencilKit(renderer, base = '/jolly-statechart/assets/opening') {
  const loader = new THREE.TextureLoader();
  const matcaps = await Promise.all(MATCAPS.map(async name => {
    const texture = await loader.loadAsync(`${base}/matcap-${name}.webp`);
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }));
  const tooth = toothTexture(renderer), tile = pencilTile(renderer), cloth = paintedSphere(CLOTH_RAMP), wood = paintedSphere(WOOD_RAMP);
  const kit = { tile, tooth, matcap: { ...Object.fromEntries(MATCAPS.map((name, i) => [name, matcaps[i]])), cloth, wood } };
  kit.dispose = () => { [...matcaps, tile, tooth, cloth, wood].forEach(texture => texture.dispose()); };
  return kit;
}

// Values every pencil material reads, updated once per frame by the scene.
export function sharedUniforms(kit) {
  return {
    uTile: { value: kit.tile }, uTooth: { value: kit.tooth },
    uBoil: { value: 0 }, uTime: { value: 0 },
    uLight: { value: new THREE.Vector3(-.6, .68, .62).normalize() },
    uMatShift: { value: new THREE.Vector2() },
    uWall: { value: new THREE.Color('#2140d6') },
    uPixel: { value: 1 },
  };
}

const VIEW_VARYINGS = 'varying vec3 vN;varying vec3 vObject;varying vec3 vView;';
const PENCIL_VERTEX = `${VIEW_VARYINGS}
#ifdef USE_INSTANCING_COLOR
varying vec3 vTint;
#endif
__DEFORM__
void main(){
  vec3 p=position;vec3 n=normal;
  deform(p,n);
  vObject=position;
#ifdef USE_INSTANCING
  vec4 mv=modelViewMatrix*instanceMatrix*vec4(p,1.);
  vN=normalize(normalMatrix*mat3(instanceMatrix)*n);
#else
  vec4 mv=modelViewMatrix*vec4(p,1.);
  vN=normalize(normalMatrix*n);
#endif
#ifdef USE_INSTANCING_COLOR
  vTint=instanceColor;
#endif
  vView=-mv.xyz;
  gl_Position=projectionMatrix*mv;
}`;

const PENCIL_FRAGMENT = `${PI_GLSL}${VIEW_VARYINGS}
#ifdef USE_INSTANCING_COLOR
varying vec3 vTint;
#endif
uniform sampler2D uMatcap,uTile,uTooth;
uniform float uBoil,uHatch,uFleck,uRim,uPixel,uFlash,uGrain,uLift,uGain;
uniform vec3 uLight,uWall,uHatchColor,uTintColor;
uniform vec2 uMatShift;
uniform int uHatchMode;
#ifdef USE_STAGE_LIGHT
uniform vec2 uSpotCentre,uSpotReach;uniform float uSpotTop,uSpotShade,uSpotFoot,uStageLight;
#endif
void main(){
  vec3 N=normalize(vN);
  // Keep the painted highlight alive: the MatCap leans toward the pointer's light.
  vec2 reach=N.xy*.485+uMatShift;
  // Stay inside the painted sphere: its corners are bare paper.
  float span=length(reach);
  if(span>.47)reach*=.47/span;
  vec3 col=texture2D(uMatcap,reach+.5).rgb;
#ifdef USE_INSTANCING_COLOR
  col*=vTint;
#endif
  col=mix(col*uTintColor*uGain,vec3(.965,.945,.9),uLift);
  vec2 sc=gl_FragCoord.xy/uPixel;
  float jump=floor(uBoil);
  vec2 off=vec2(fract(jump*.37)*97.,fract(jump*.71)*61.);
  float strokes=texture2D(uTile,(sc+off)/430.).r;
  float tooth=texture2D(uTooth,(sc+off.yx)/170.).r;
  col*=mix(1.,.72+strokes*.42,uGrain);
  float ndl=dot(N,uLight);
  // Redrawn hatching lives on the shadow side, so moving the light moves the pencil.
  float shade=smoothstep(.2,-.42,ndl);
  float wob=(texture2D(uTooth,(sc+off)/900.).r-.5)*2.4;
  float coord=uHatchMode==1?atan(vObject.x,vObject.z)*46.+vObject.y*5.:(sc.x+sc.y*.56)/4.6;
  float line=sin(coord+wob*1.4+jump*1.7);
  float weight=mix(.92,.2,shade);
  float hatch=smoothstep(weight,weight+.22,line)*smoothstep(.04,.42,shade);
  hatch*=.55+.45*smoothstep(.38,.62,tooth);
  col=mix(col,uHatchColor,hatch*uHatch);
  // Paper tooth breaks through light pencil more than heavy pigment.
  float lightness=dot(col,vec3(.3,.59,.11));
  float fleck=smoothstep(mix(.74,.63,lightness),mix(.86,.75,lightness),tooth);
  col=mix(col,vec3(1.,.97,.9),fleck*uFleck);
  float rim=pow(clamp(1.-N.z,0.,1.),3.2);
  col=mix(col,uWall,rim*uRim);
  col+=uFlash*vec3(.38,.3,.16);
#ifdef USE_STAGE_LIGHT
  // A follow spot on the house curtain, the valance's shadow above it and the footlights' glow below.
  float spot=smoothstep(1.,.28,length((sc-uSpotCentre)/uSpotReach));
  float under=smoothstep(uSpotTop-uSpotShade,uSpotTop,sc.y);
  float foot=pow(clamp(1.-sc.y/uSpotFoot,0.,1.),2.);
  vec3 stage=col*mix(.34,1.08,spot)*(1.-under*.5)+vec3(.6,.27,.1)*foot*.62*(.35+.65*col.r);
  col=mix(col,stage,uStageLight);
#endif
  gl_FragColor=vec4(col,1.);
}`;

const NO_DEFORM = 'void deform(inout vec3 p,inout vec3 n){}';

export function pencilMaterial(shared, matcap, { hatch = .85, hatchMode = 0, fleck = .55, rim = .3, grain = 1, lift = 0, gain = 1, hatchColor = '#2a2340', tint = '#ffffff', deformChunk = NO_DEFORM, extraUniforms = {}, instanceTint = false, stageLight = null } = {}) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...shared, ...extraUniforms, ...stageLight,
      uMatcap: { value: matcap }, uHatch: { value: hatch }, uFleck: { value: fleck }, uRim: { value: rim }, uGrain: { value: grain }, uLift: { value: lift }, uGain: { value: gain }, uFlash: { value: 0 },
      uHatchMode: { value: hatchMode }, uHatchColor: { value: new THREE.Color(hatchColor) }, uTintColor: { value: new THREE.Color(tint) },
    },
    vertexShader: PENCIL_VERTEX.replace('__DEFORM__', deformChunk),
    fragmentShader: PENCIL_FRAGMENT,
    defines: stageLight ? { USE_STAGE_LIGHT: '' } : {},
  });
  material.toneMapped = false;
  material.userData.instanceTint = instanceTint;
  return material;
}

const INK_VERTEX = `uniform float uInk,uBoil;
__DEFORM__
void main(){
  vec3 p=position;vec3 n=normal;
  deform(p,n);
#ifdef USE_INSTANCING
  mat4 m=modelViewMatrix*instanceMatrix;
  vec3 vn=normalize(normalMatrix*mat3(instanceMatrix)*n);
#else
  mat4 m=modelViewMatrix;
  vec3 vn=normalize(normalMatrix*n);
#endif
  vec4 mv=m*vec4(p,1.);
  float j=floor(uBoil);
  // A pressed pen line: thicker on some passes, thinner on others, redrawn on the boil.
  float pressure=.68+.42*sin(position.x*7.3+position.y*11.1+j*2.1)*sin(position.z*8.7-position.y*5.3+j*1.3)+.3*max(0.,-vn.y*.6+vn.x*.6);
  mv.xyz+=vn*uInk*pressure;
  gl_Position=projectionMatrix*mv;
}`;

export function inkMaterial(shared, width, { color = INK, deformChunk = NO_DEFORM } = {}) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uBoil: shared.uBoil, uInk: { value: width }, uColor: { value: new THREE.Color(color) } },
    vertexShader: INK_VERTEX.replace('__DEFORM__', deformChunk),
    fragmentShader: 'uniform vec3 uColor;void main(){gl_FragColor=vec4(uColor,1.);}',
    side: THREE.BackSide,
  });
  material.toneMapped = false;
  return material;
}

// Drawn cut-outs keep their pencil pixels and only shiver with the shared boil.
export function plateMaterial(shared, map, { transparent = true, boil = 0, extraUniforms = {}, fragmentBody = '' } = {}) {
  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, ...extraUniforms, uMap: { value: map }, uDim: { value: 1 }, uOpacity: { value: 1 }, uJitter: { value: boil } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv;uniform sampler2D uMap;uniform float uDim,uOpacity,uJitter,uBoil;
      void main(){float j=floor(uBoil);vec2 w=vec2(sin(vUv.y*71.+j*2.3),cos(vUv.x*63.+j*1.7))*uJitter;
      vec4 c=texture2D(uMap,vUv+w);${fragmentBody}
      c.rgb*=uDim;gl_FragColor=c*uOpacity;}`,
    transparent, depthWrite: !transparent, premultipliedAlpha: true,
  });
  material.toneMapped = false;
  return material;
}
