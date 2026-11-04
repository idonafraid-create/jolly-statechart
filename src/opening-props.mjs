// Small things that make the desk a place: a banker's lamp keeping time and a card asking you, politely, to ring.
import * as THREE from 'three';
import { inkMaterial, pencilMaterial, turnedNormals } from './opening-pencil.mjs';
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

  const chainState = { value: 0, velocity: 0 }, cardState = { value: 0, velocity: 0 };
  let power = 0;
  return {
    group, lamp, card,
    place({ cardX, cardZ, lampX, lampZ, visible }) {
      group.visible = visible;
      card.position.set(cardX, 0, cardZ); card.rotation.y = .36;
      lamp.position.set(lampX, 0, lampZ); lamp.rotation.y = .28;
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
