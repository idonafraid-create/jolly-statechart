// Small things that make the desk a place: a banker's lamp keeping time, a register to sign and a card asking you, politely, to ring.
import * as THREE from 'three';
import { inkMaterial, mergeGeometries, pencilMaterial, turnedNormals } from './opening-pencil.mjs';
import { brassFill, paintWalnut } from './opening-wood.mjs';

function paintCard() {
  const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 480;
  const g = canvas.getContext('2d');
  paintWalnut(g, 720, 480, { seed: 71 });
  g.strokeStyle = brassFill(g, 0, 480); g.lineWidth = 12; g.strokeRect(20, 20, 680, 440);
  g.lineWidth = 2.5; g.strokeRect(40, 40, 640, 400);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const letters = (text, y, font, top, bottom) => {
    g.font = font;
    g.fillStyle = 'rgba(10,3,1,.75)'; g.fillText(text, 362, y + 4);
    g.fillStyle = brassFill(g, top, bottom); g.fillText(text, 360, y);
  };
  letters('PLEASE', 150, '100px "Special Elite",serif', 104, 196);
  letters('RING', 262, '100px "Special Elite",serif', 216, 308);
  g.fillStyle = '#e4676f'; g.fillRect(180, 318, 360, 8);
  letters('once. allegedly.', 376, 'italic bold 38px "Courier Prime",monospace', 356, 396);
  return canvas;
}

// The hotel register, open at tonight's page. Who signed in is the joke; nobody will read it, but it should be true.
function paintRegister() {
  // Drawn on a 1024-wide page and shrunk: it is never more than about 400px across on screen.
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 528;
  const g = canvas.getContext('2d'); g.scale(.75, .75);
  g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, 1024, 704);
  const spine = g.createLinearGradient(512 - 120, 0, 512 + 120, 0);
  spine.addColorStop(0, 'rgba(90,60,30,0)'); spine.addColorStop(.5, 'rgba(90,60,30,.42)'); spine.addColorStop(1, 'rgba(90,60,30,0)');
  g.fillStyle = spine; g.fillRect(0, 0, 1024, 704);
  g.textBaseline = 'alphabetic';
  for (const left of [52, 564]) {
    g.fillStyle = '#16246e'; g.font = '46px "Special Elite",serif';
    g.fillText(left < 500 ? 'THE REGISTER' : 'TONIGHT', left, 84);
    g.strokeStyle = 'rgba(33,64,214,.5)'; g.lineWidth = 3;
    for (let row = 0; row < 7; row++) { g.beginPath(); g.moveTo(left, 138 + row * 80); g.lineTo(left + 408, 138 + row * 80); g.stroke(); }
    g.strokeStyle = 'rgba(178,50,70,.55)'; g.beginPath(); g.moveTo(left + 300, 102); g.lineTo(left + 300, 648); g.stroke();
  }
  g.fillStyle = '#2140d6'; g.font = 'italic bold 40px "Courier Prime",monospace';
  [['JOJO', 'no talk', 128], ['LYLY', 'all bark', 208], ['YOYO', 'all bite', 288]].forEach(([who, how, y]) => { g.fillText(who, 62, y); g.font = 'italic 30px "Courier Prime",monospace'; g.fillText(how, 200, y); g.font = 'italic bold 40px "Courier Prime",monospace'; });
  g.fillStyle = '#a03953';
  g.fillText('room?', 62, 368);
  return canvas;
}

export function deskProps(shared, kit) {
  const group = new THREE.Group(), disposables = [];
  const keep = thing => { disposables.push(thing); return thing; };
  const brass = keep(pencilMaterial(shared, kit.matcap.brass, { hatch: .5, hatchColor: '#4a2a0f', rim: .1, fleck: .26, gain: 1.12 }));
  const green = keep(pencilMaterial(shared, kit.matcap.green, { hatch: .6, hatchColor: '#0b2a1d', rim: .06, fleck: .4, gain: 1.2 }));
  const ink = keep(inkMaterial(shared, .011)), fine = keep(inkMaterial(shared, .006));
  const mesh = (geometry, material, parent, inkMaterial_ = ink) => {
    keep(geometry);
    const part = new THREE.Mesh(geometry, material); parent.add(part);
    if (inkMaterial_) part.add(new THREE.Mesh(geometry, inkMaterial_));
    return part;
  };

  // Banker's lamp.
  const lamp = new THREE.Group(); group.add(lamp);
  const baseProfile = [[0, 0], [.3, 0], [.36, .012], [.37, .04], [.3, .07], [.13, .1], [.07, .15], [0, .16]].map(([x, y]) => new THREE.Vector2(x, y));
  const baseGeometry = turnedNormals(new THREE.LatheGeometry(new THREE.SplineCurve(baseProfile).getPoints(28), 48), 48);
  mesh(baseGeometry, brass, lamp);
  const stem = new THREE.CatmullRomCurve3([[0, .12, 0], [0, .55, 0], [.0, .92, 0], [-.1, 1.1, .02], [-.26, 1.14, .04]].map(point => new THREE.Vector3(...point)));
  mesh(new THREE.TubeGeometry(stem, 40, .026, 10, false), brass, lamp);
  const shade = new THREE.Group(); shade.position.set(-.3, 1.12, .05); shade.rotation.z = .1; lamp.add(shade);
  const hood = new THREE.SphereGeometry(.2, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2); hood.scale(2, 1.02, 1.05);
  mesh(hood, green, shade);
  const lip = new THREE.TorusGeometry(.2, .012, 8, 48); lip.rotateX(Math.PI / 2); lip.scale(2, 1, 1.05);
  mesh(lip, brass, shade, null);
  // Lit underside: the bulb that the beat reaches first.
  const bulbMaterial = keep(new THREE.MeshBasicMaterial({ color: '#ffe9a8', toneMapped: false }));
  const glow = new THREE.Mesh(keep(new THREE.CircleGeometry(.195, 40)), bulbMaterial); glow.rotation.x = Math.PI / 2; glow.scale.set(2, 1.04, 1); glow.position.y = -.002; shade.add(glow);
  // Pull chain, which swings when the bell rings.
  const chain = new THREE.Group(); chain.position.set(.14, -.02, .1); shade.add(chain);
  mesh(new THREE.CylinderGeometry(.0048, .0048, .2, 6).translate(0, -.1, 0), brass, chain, null);
  mesh(new THREE.SphereGeometry(.018, 10, 8).translate(0, -.21, 0), brass, chain, fine);

  const cream = keep(pencilMaterial(shared, kit.matcap.cream, { hatch: .1, hatchColor: '#7a6650', rim: 0, fleck: .14, lift: .3 }));
  const cobalt = keep(pencilMaterial(shared, kit.matcap.cobalt, { hatch: .35, hatchColor: '#0d1548', rim: 0, fleck: .3 }));
  const crimson = keep(pencilMaterial(shared, kit.matcap.crimson, { hatch: .3, hatchColor: '#3a0a16', rim: .05, fleck: .22, gain: 1.05 }));
  const wood = keep(pencilMaterial(shared, kit.matcap.wood, { hatch: .3, hatchColor: '#1c0c06', rim: 0, fleck: .2 }));

  // Tent card.
  const cardTexture = keep(new THREE.CanvasTexture(paintCard())); cardTexture.anisotropy = 8;
  const faceMaterial = keep(new THREE.ShaderMaterial({
    uniforms: { uMap: { value: cardTexture }, uTile: shared.uTile, uBoil: shared.uBoil, uPixel: shared.uPixel },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform sampler2D uMap,uTile;uniform float uBoil,uPixel;varying vec2 vUv;void main(){float j=floor(uBoil);vec2 sc=gl_FragCoord.xy/uPixel;vec3 c=texture2D(uMap,vUv).rgb;c*=.9+texture2D(uTile,(sc+vec2(fract(j*.37)*97.,fract(j*.71)*61.))/400.).r*.17;gl_FragColor=vec4(c,1.);}',
  }));
  faceMaterial.toneMapped = false;
  const card = new THREE.Group(); group.add(card);
  const cardFront = new THREE.Group(); cardFront.rotation.x = -.26; card.add(cardFront);
  const face = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.02, .68).translate(0, .34, 0)), faceMaterial); cardFront.add(face);
  const edge = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.05, .71).translate(0, .34, -.004)), keep(new THREE.MeshBasicMaterial({ color: '#16246e', toneMapped: false }))); cardFront.add(edge);
  const shadowMaterial = keep(new THREE.MeshBasicMaterial({ color: '#1a1030', transparent: true, opacity: .28, toneMapped: false, depthWrite: false }));
  const cardShadow = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.08, .26)), shadowMaterial); cardShadow.rotation.x = -Math.PI / 2; cardShadow.position.set(.05, .002, -.16); card.add(cardShadow);

  // The register, open on a slanted walnut stand, with a pen lying across it. Everything is laid out from the front edge back, then merged by material: it is a small prop and shouldn't cost a dozen draws.
  const WIDE = 1.06, DEEP = .76, TILT = .3;
  const register = new THREE.Group(); group.add(register);
  const onLean = new THREE.Matrix4().compose(new THREE.Vector3(0, .018, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(TILT, 0, 0)), new THREE.Vector3(1, 1, 1));
  const onPen = onLean.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(.27, .1, -.36), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, .62, 0)), new THREE.Vector3(1, 1, 1)));
  const lots = new Map(), inkLots = new Map();
  const part = (geometry, material, shell, matrix) => {
    if (matrix) geometry.applyMatrix4(matrix);
    (lots.get(material) ?? lots.set(material, []).get(material)).push(geometry);
    (inkLots.get(shell) ?? inkLots.set(shell, []).get(shell)).push(geometry.clone());
  };
  const wedgeShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(-DEEP * Math.cos(TILT), 0), new THREE.Vector2(-DEEP * Math.cos(TILT), DEEP * Math.sin(TILT))]);
  part(new THREE.ExtrudeGeometry(wedgeShape, { depth: WIDE - .1, bevelEnabled: false }).rotateY(-Math.PI / 2).translate((WIDE - .1) / 2, 0, 0), wood, ink);
  part(new THREE.BoxGeometry(WIDE, .03, DEEP).translate(0, 0, -DEEP / 2), cobalt, ink, onLean);
  part(new THREE.BoxGeometry(WIDE - .05, .034, DEEP - .05).translate(0, .026, -DEEP / 2), cream, fine, onLean);
  // A ribbon and the brass ledge that stops the book sliding off.
  part(new THREE.BoxGeometry(.05, .006, .2).translate(.2, .02, .07), crimson, fine, onLean);
  part(new THREE.BoxGeometry(WIDE + .05, .05, .03).translate(0, .01, .012), brass, ink, onLean);
  // A fountain pen: barrel, cap band, nib.
  part(new THREE.CylinderGeometry(.021, .017, .42, 12).rotateZ(Math.PI / 2), crimson, ink, onPen);
  part(new THREE.CylinderGeometry(.023, .023, .035, 12).rotateZ(Math.PI / 2).translate(.08, 0, 0), brass, fine, onPen);
  part(new THREE.ConeGeometry(.016, .09, 10).rotateZ(Math.PI / 2).translate(-.255, 0, 0), brass, fine, onPen);
  for (const lot of [lots, inkLots]) for (const [material, geometries] of lot) register.add(new THREE.Mesh(keep(mergeGeometries(geometries)), material));
  // The open pages swell away from the gutter.
  const leaning = new THREE.Group(); leaning.position.set(0, .018, 0); leaning.rotation.x = TILT; register.add(leaning);
  const pagesShape = new THREE.PlaneGeometry(WIDE - .07, DEEP - .06, 36, 1).rotateX(-Math.PI / 2).translate(0, 0, -DEEP / 2);
  const pageAt = pagesShape.attributes.position;
  for (let i = 0; i < pageAt.count; i++) pageAt.setY(i, .046 + .03 * Math.sin(Math.min(1, Math.abs(pageAt.getX(i)) / ((WIDE - .07) / 2) * 1.05) * Math.PI) ** .7);
  const pageTexture = keep(new THREE.CanvasTexture(paintRegister())); pageTexture.anisotropy = 8;
  const pagesMaterial = keep(new THREE.ShaderMaterial({ uniforms: { ...faceMaterial.uniforms, uMap: { value: pageTexture } }, vertexShader: faceMaterial.vertexShader, fragmentShader: faceMaterial.fragmentShader }));
  pagesMaterial.toneMapped = false;
  leaning.add(new THREE.Mesh(keep(pagesShape), pagesMaterial));
  const registerShadow = new THREE.Mesh(keep(new THREE.PlaneGeometry(WIDE + .16, .3)), shadowMaterial); registerShadow.rotation.x = -Math.PI / 2; registerShadow.position.set(.05, .002, -.06); register.add(registerShadow);

  const chainState = { value: 0, velocity: 0 }, cardState = { value: 0, velocity: 0 };
  let power = 0;
  return {
    group, lamp, card,
    place({ cardX, cardZ, lampX, lampZ, visible }) {
      group.visible = visible;
      card.position.set(cardX, 0, cardZ); card.rotation.y = .36;
      lamp.position.set(lampX, 0, lampZ); lamp.rotation.y = .28;
      // In front of the lamp, turned a little toward whoever is about to sign.
      register.position.set(lampX + .1, 0, lampZ + 1.46); register.rotation.y = -.2; register.scale.setScalar(.9);
    },
    strike() { chainState.velocity += 5.5; cardState.velocity += 1.2; power = 1; },
    beat(strength) { chainState.velocity += strength * .9; power = Math.max(power, .55 + strength * .35); },
    update(dt) {
      chainState.velocity += (-chainState.value * 90 - chainState.velocity * 2.6) * dt; chainState.value += chainState.velocity * dt;
      chain.rotation.z = chainState.value;
      cardState.velocity += (-cardState.value * 260 - cardState.velocity * 9) * dt; cardState.value += cardState.velocity * dt;
      cardFront.rotation.x = -.26 - cardState.value * .05;
      power *= Math.exp(-dt / .26);
      const lit = .32 + power * .68;
      bulbMaterial.color.setRGB(1, .72 + lit * .22, .36 + lit * .4);
      green.uniforms.uFlash.value = power * .32;
      return Math.abs(chainState.velocity) > .01 || Math.abs(cardState.velocity) > .01 || power > .02;
    },
    get lit() { return power; },
    dispose() { disposables.forEach(thing => thing.dispose()); },
  };
}
