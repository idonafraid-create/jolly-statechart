// The house sign and the stage lip. Walnut and brass, lowered on chains in front of the curtain, with a bell-pull
// hanging from it. The raised letters are a height map, so they really catch the light as the pointer moves.
import * as THREE from 'three';
import { inkMaterial, mergeGeometries, pencilMaterial } from './opening-pencil.mjs';
import { tasselGeometry, walnutMaterial } from './opening-set.mjs';
import { paintWalnut } from './opening-wood.mjs';

// Half width, half height and shoulder height of the board, in its own units.
const W = 1.5, H = .93, STEP = .15, PX = 560, BOARD_DEPTH = .07;
const outline = (inset = 0) => {
  const w = W - inset, top = H - inset, bottom = -H + inset;
  return [[-w, bottom], [w, bottom], [w, top - STEP * 2], [w * .76, top - STEP * 2], [w * .76, top - STEP], [w * .46, top - STEP], [w * .46, top],
    [-w * .46, top], [-w * .46, top - STEP], [-w * .76, top - STEP], [-w * .76, top - STEP * 2], [-w, top - STEP * 2]];
};
const shapeOf = points => new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
const X = x => (x + W) * PX, Y = y => (H - y) * PX;

function paintFace() {
  const width = Math.round(W * 2 * PX), height = Math.round(H * 2 * PX);
  const makeLayer = () => { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; };
  const colorLayer = makeLayer(), reliefLayer = makeLayer();
  const g = colorLayer.getContext('2d'), m = reliefLayer.getContext('2d');
  paintWalnut(g, width, height);

  // Anything raised: a soft shadow on the wood, and a bevelled ramp in the relief map's red channel.
  const raised = (paint, bevel = 5) => {
    g.save(); g.shadowColor = 'rgba(10,3,1,.8)'; g.shadowBlur = 8; g.shadowOffsetX = 3; g.shadowOffsetY = 6; g.fillStyle = g.strokeStyle = '#2a1408'; g.lineJoin = 'round'; paint(g, 0); g.restore();
    m.save(); m.globalCompositeOperation = 'lighten'; m.lineJoin = 'round';
    for (let i = bevel; i >= 0; i--) { const level = Math.round(70 + 185 * (1 - i / bevel)); m.fillStyle = m.strokeStyle = `rgb(${level},0,0)`; paint(m, i); }
    m.restore();
  };
  const spaced = (ctx, text, x, y, font, track, grow) => {
    ctx.font = font; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const widths = [...text].map(letter => ctx.measureText(letter).width), total = widths.reduce((a, b) => a + b, 0) + track * (text.length - 1);
    let at = x - total / 2;
    [...text].forEach((letter, i) => {
      if (grow) { ctx.lineWidth = grow * 1.6; ctx.strokeText(letter, at, y); }
      ctx.fillText(letter, at, y);
      at += widths[i] + track;
    });
  };
  const fitted = (text, family, goal, track) => {
    m.font = `100px ${family}`;
    const natural = [...text].reduce((sum, letter) => sum + m.measureText(letter).width, 0);
    return (goal - track * (text.length - 1)) / natural * 100;
  };
  const trace = (ctx, points) => { ctx.beginPath(); points.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](X(x), Y(y))); ctx.closePath(); };
  const star = (ctx, x, y, r) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, s = i % 2 ? r * .4457 : r; ctx[i ? 'lineTo' : 'moveTo'](X(x) + Math.cos(a) * s * PX, Y(y) + Math.sin(a) * s * PX); }
    ctx.closePath();
  };
  // Enamel sits in the colour layer and is marked glossy in the relief map's green channel.
  const enamel = (paint, color) => {
    g.fillStyle = color; paint(g); g.fill();
    m.save(); m.globalCompositeOperation = 'lighten'; m.fillStyle = 'rgb(0,255,0)'; paint(m); m.fill(); m.restore();
  };

  // Two brass inlay lines following the board.
  raised((ctx, grow) => { trace(ctx, outline(.13)); ctx.lineWidth = 8 + grow * 1.4; ctx.stroke(); }, 3);
  raised((ctx, grow) => { trace(ctx, outline(.178)); ctx.lineWidth = 2.4 + grow * .8; ctx.stroke(); }, 2);
  // The hotel's sunrise in the top shoulder.
  raised((ctx, grow) => {
    ctx.beginPath(); ctx.arc(X(0), Y(.47), .105 * PX + grow, Math.PI, 0); ctx.closePath(); ctx.fill();
    for (let ray = -4; ray <= 4; ray++) {
      const a = ray * .33 - Math.PI / 2, inner = .135 * PX, outer = (ray % 2 ? .205 : .25) * PX, half = .017;
      ctx.beginPath(); ctx.moveTo(X(0) + Math.cos(a - half) * inner, Y(.47) + Math.sin(a - half) * inner); ctx.lineTo(X(0) + Math.cos(a) * outer, Y(.47) + Math.sin(a) * outer); ctx.lineTo(X(0) + Math.cos(a + half) * inner, Y(.47) + Math.sin(a + half) * inner); ctx.closePath();
      if (grow) { ctx.lineWidth = grow; ctx.stroke(); }
      ctx.fill();
    }
  }, 3);
  // The name, in raised brass.
  const nameTrack = .02 * PX, nameSize = fitted('THE JOLLY', '"Special Elite"', 2.34 * PX, nameTrack);
  raised((ctx, grow) => spaced(ctx, 'THE JOLLY', X(0), Y(.205), `${nameSize}px "Special Elite"`, nameTrack, grow), 6);
  // A rule with a coral star, then the small print.
  raised((ctx, grow) => { ctx.lineWidth = 2.6 + grow; for (const [from, to] of [[-1.04, -.1], [.1, 1.04]]) { ctx.beginPath(); ctx.moveTo(X(from), Y(-.055)); ctx.lineTo(X(to), Y(-.055)); ctx.stroke(); } }, 2);
  enamel(ctx => star(ctx, 0, -.055, .058), '#e4676f');
  const deptTrack = .019 * PX, deptSize = fitted('AFTER HOURS DEPARTMENT · EST. 1963', '"Courier Prime"', 2.3 * PX, deptTrack);
  raised((ctx, grow) => spaced(ctx, 'AFTER HOURS DEPARTMENT · EST. 1963', X(0), Y(-.17), `bold ${deptSize}px "Courier Prime"`, deptTrack, grow), 1);
  // What to do, on a cobalt enamel lozenge with a brass rim.
  const lozenge = ctx => { ctx.beginPath(); ctx.roundRect(X(-1.02), Y(-.33), 2.04 * PX, .36 * PX, .18 * PX); };
  enamel(lozenge, '#1b2bb4');
  raised((ctx, grow) => { lozenge(ctx); ctx.lineWidth = 6 + grow; ctx.stroke(); }, 3);
  const callTrack = .012 * PX, callSize = fitted('RAISE THE CURTAIN', '"Special Elite"', 1.52 * PX, callTrack);
  raised((ctx, grow) => spaced(ctx, 'RAISE THE CURTAIN', X(0), Y(-.513), `${callSize}px "Special Elite"`, callTrack, grow), 3);
  for (const x of [-.875, .875]) enamel(ctx => star(ctx, x, -.51, .055), '#e4676f');
  return { colorLayer, reliefLayer, width, height };
}

function faceMaterial(shared, kit, color, relief, texel) {
  const material = new THREE.ShaderMaterial({
    uniforms: { ...shared, uColor: { value: color }, uRelief: { value: relief }, uBrass: { value: kit.matcap.brass }, uTexel: { value: texel } },
    vertexShader: 'varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv;varying vec3 vN;
      uniform sampler2D uColor,uRelief,uBrass,uTile,uTooth;uniform vec2 uTexel,uMatShift;uniform vec3 uLight;uniform float uBoil,uPixel;
      void main(){
        vec2 sc=gl_FragCoord.xy/uPixel;float jump=floor(uBoil);vec2 off=vec2(fract(jump*.37)*97.,fract(jump*.71)*61.);
        vec4 here=texture2D(uRelief,vUv);
        float l=texture2D(uRelief,vUv-vec2(uTexel.x,0.)).r,r=texture2D(uRelief,vUv+vec2(uTexel.x,0.)).r,d=texture2D(uRelief,vUv-vec2(0.,uTexel.y)).r,u=texture2D(uRelief,vUv+vec2(0.,uTexel.y)).r;
        vec3 n=normalize(vN+vec3((l-r)*2.2,(d-u)*2.2,0.));
        // The brass is the bell's own painted sphere, leaning toward the same light.
        vec2 reach=n.xy*.485+uMatShift;float span=length(reach);if(span>.47)reach*=.47/span;
        vec3 brass=texture2D(uBrass,reach+.5).rgb*1.2;
        vec3 base=texture2D(uColor,vUv).rgb;
        float ndl=dot(n,uLight);
        base*=.86+.3*ndl;
        base+=here.g*pow(max(0.,dot(reflect(-uLight,n),vec3(0.,0.,1.))),26.)*.5;
        vec3 col=mix(base,brass,smoothstep(.1,.22,here.r));
        float strokes=texture2D(uTile,(sc+off)/430.).r,tooth=texture2D(uTooth,(sc+off.yx)/170.).r;
        col*=.8+strokes*.3;
        col=mix(col,vec3(1.,.93,.78),smoothstep(.72,.86,tooth)*.22);
        gl_FragColor=vec4(col,1.);
      }`,
  });
  material.toneMapped = false;
  return material;
}

// Little lights: an instanced glass bulb and an additive halo, sharing one brightness per lamp.
function lampSet(parent, positions, radius, haloSize, disposables) {
  const count = positions.length, lit = new THREE.InstancedBufferAttribute(new Float32Array(count).fill(.5), 1);
  lit.setUsage(THREE.DynamicDrawUsage);
  const bulbShape = new THREE.SphereGeometry(radius, 10, 8), haloShape = new THREE.PlaneGeometry(haloSize, haloSize);
  bulbShape.setAttribute('aLit', lit); haloShape.setAttribute('aLit', lit);
  const bulbMaterial = new THREE.ShaderMaterial({
    vertexShader: 'attribute float aLit;varying float vLit;varying vec3 vN;void main(){vLit=aLit;vN=normalize(normalMatrix*mat3(instanceMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
    fragmentShader: 'varying float vLit;varying vec3 vN;void main(){vec3 c=mix(vec3(.44,.25,.12),vec3(1.,.95,.72),vLit)*(.68+.32*max(0.,vN.z));gl_FragColor=vec4(c,1.);}',
  });
  const haloMaterial = new THREE.ShaderMaterial({
    vertexShader: 'attribute float aLit;varying float vLit;varying vec2 vUv;void main(){vLit=aLit;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
    fragmentShader: 'varying float vLit;varying vec2 vUv;void main(){float a=pow(max(0.,1.-length(vUv-.5)*2.),2.2)*vLit;gl_FragColor=vec4(1.,.8,.46,a*.72);}',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  bulbMaterial.toneMapped = haloMaterial.toneMapped = false;
  const bulbs = new THREE.InstancedMesh(bulbShape, bulbMaterial, count), halos = new THREE.InstancedMesh(haloShape, haloMaterial, count);
  const matrix = new THREE.Matrix4();
  positions.forEach(([x, y, z], i) => { matrix.makeTranslation(x, y, z); bulbs.setMatrixAt(i, matrix); matrix.makeTranslation(x, y, z + radius * .6); halos.setMatrixAt(i, matrix); });
  bulbs.frustumCulled = halos.frustumCulled = false; halos.renderOrder = 4;
  parent.add(bulbs, halos);
  disposables.push(bulbShape, haloShape, bulbMaterial, haloMaterial, bulbs, halos);
  return { lit, count };
}

export function marquee(shared, kit) {
  const group = new THREE.Group(), board = new THREE.Group(), cord = new THREE.Group(), lip = new THREE.Group(), disposables = [];
  const keep = thing => { disposables.push(thing); return thing; };
  group.add(board); board.add(cord);
  cord.position.y = -H;
  const wood = keep(pencilMaterial(shared, kit.matcap.wood, { hatch: .3, hatchColor: '#1c0c06', rim: 0, fleck: .2 }));
  const brass = keep(pencilMaterial(shared, kit.matcap.brass, { hatch: .3, hatchColor: '#4a2a0f', rim: 0, fleck: .22, gain: 1.08 }));
  const ink = keep(inkMaterial(shared, .009)), fineInk = keep(inkMaterial(shared, .005)), lipWood = keep(walnutMaterial(shared));

  const { colorLayer, reliefLayer, width, height } = paintFace();
  const colorTexture = keep(new THREE.CanvasTexture(colorLayer)), reliefTexture = keep(new THREE.CanvasTexture(reliefLayer));
  colorTexture.anisotropy = reliefTexture.anisotropy = 8;
  const faceShape = keep(new THREE.ShapeGeometry(shapeOf(outline())));
  const faceAt = faceShape.attributes.position, faceUv = faceShape.attributes.uv;
  for (let i = 0; i < faceAt.count; i++) faceUv.setXY(i, (faceAt.getX(i) + W) / (W * 2), (faceAt.getY(i) + H) / (H * 2));
  faceShape.translate(0, 0, BOARD_DEPTH + .001);
  board.add(new THREE.Mesh(faceShape, keep(faceMaterial(shared, kit, colorTexture, reliefTexture, new THREE.Vector2(1.6 / width, 1.6 / height)))));

  const body = keep(new THREE.ExtrudeGeometry(shapeOf(outline()), { depth: BOARD_DEPTH, bevelEnabled: false }));
  board.add(new THREE.Mesh(body, wood));
  const frameShape = shapeOf(outline(-.042));
  frameShape.holes.push(new THREE.Path(outline().map(([x, y]) => new THREE.Vector2(x, y))));
  const frame = keep(new THREE.ExtrudeGeometry(frameShape, { depth: BOARD_DEPTH + .03, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 1 }));
  frame.translate(0, 0, -.012);
  const frameMesh = new THREE.Mesh(frame, brass); frameMesh.add(new THREE.Mesh(frame, ink)); board.add(frameMesh);

  // Marquee lamps round the rim, spaced evenly along the stepped edge.
  const lampPath = outline(.072), lampSpots = [];
  const legs = lampPath.map((point, i) => [point, lampPath[(i + 1) % lampPath.length]]);
  const perimeter = legs.reduce((sum, [a, b]) => sum + Math.hypot(b[0] - a[0], b[1] - a[1]), 0), lampCount = Math.round(perimeter / .205);
  for (let n = 0; n < lampCount; n++) {
    let along = n / lampCount * perimeter;
    for (const [a, b] of legs) {
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (along <= length) { lampSpots.push([a[0] + (b[0] - a[0]) * along / length, a[1] + (b[1] - a[1]) * along / length, BOARD_DEPTH + .022]); break; }
      along -= length;
    }
  }
  const lamps = lampSet(board, lampSpots, .031, .3, disposables);
  const socketShape = keep(new THREE.CylinderGeometry(.045, .05, .018, 12).rotateX(Math.PI / 2));
  const sockets = new THREE.InstancedMesh(socketShape, brass, lampSpots.length), matrix = new THREE.Matrix4();
  lampSpots.forEach(([x, y], i) => { matrix.makeTranslation(x, y, BOARD_DEPTH + .008); sockets.setMatrixAt(i, matrix); });
  board.add(sockets); disposables.push(sockets);

  // The bell-pull: rope, knot and a big tassel, on a pivot so it can swing and be yanked.
  const ropeLength = .42, ropePath = new THREE.CatmullRomCurve3([[0, 0], [.012, -.14], [-.008, -.28], [0, -ropeLength]].map(([x, y]) => new THREE.Vector3(x, y, .05)));
  const cordShape = keep(mergeGeometries([
    new THREE.TubeGeometry(ropePath, 18, .017, 6, false),
    new THREE.SphereGeometry(.036, 10, 8).translate(0, 0, .05),
    new THREE.SphereGeometry(.03, 10, 8).translate(0, -ropeLength, .05),
    tasselGeometry().scale(1.7, 1.7, 1.7).translate(0, -ropeLength - .012, .05),
  ]));
  const cordMesh = new THREE.Mesh(cordShape, brass); cordMesh.add(new THREE.Mesh(cordShape, fineInk)); cord.add(cordMesh);

  let chainMesh = null, lipMeshes = [], footlights = null;
  const swing = { value: 0, velocity: 0 }, pullState = { value: 0, velocity: 0 };
  const view = { y: 0, scale: 1, travel: 3, lipHeight: .2, enterAt: -Infinity, lift: 0, hovering: false, pullUntil: 0, lastTick: -1 };

  function chain(x, topY) {
    const links = [];
    let i = 0;
    for (let y = H - STEP + .02; y < topY; y += .068, i++) {
      const link = new THREE.TorusGeometry(.026, .0078, 5, 10).scale(1, 1.42, 1);
      if (i % 2) link.rotateY(Math.PI / 2);
      links.push(link.translate(x, y, .035));
    }
    links.push(new THREE.SphereGeometry(.034, 10, 8).translate(x, H - STEP, BOARD_DEPTH + .012));
    return links;
  }

  return {
    group, lip,
    get lipTop() { return view.lipTop; },
    get signY() { return view.y; },
    get signHalfWidth() { return W * view.scale; },
    get signHalfHeight() { return H * view.scale; },
    get cordDrop() { return .95 * view.scale; },
    build({ width: viewWidth, top, floor, portrait }) {
      const viewHeight = top - floor;
      // Hung in the middle of the frame, not up against the valance.
      const scale = Math.min(viewWidth * (portrait ? .88 : .4) / (W * 2.06), viewHeight * .4 / (H * 2.04));
      view.scale = scale; view.travel = viewHeight * 1.5;
      view.y = floor + viewHeight * (portrait ? .6 : .57);
      board.scale.setScalar(scale);
      if (chainMesh) { board.remove(chainMesh); chainMesh.geometry.dispose(); }
      const reach = (top - view.y) / scale + .3;
      chainMesh = new THREE.Mesh(mergeGeometries([...chain(-W * .62, reach), ...chain(W * .62, reach)]), brass);
      chainMesh.frustumCulled = false; board.add(chainMesh);

      // The lip of the stage, with a row of shell footlights.
      lipMeshes.forEach(mesh => { lip.remove(mesh); mesh.geometry.dispose(); });
      lipMeshes = [];
      // A phone's small print can't fit between the lamps, so there the lip is taller and the lamps stand above the words.
      const lipHeight = view.lipHeight = viewHeight * (portrait ? .1 : .082), lampRise = portrait ? .76 : .52, shellSize = portrait ? .056 : .082;
      view.lipTop = floor + lipHeight;
      const reachX = viewWidth * .75, slab = new THREE.BoxGeometry(reachX * 2, lipHeight * 1.6, .34).translate(0, floor + lipHeight * .2, 0);
      const rail = new THREE.CylinderGeometry(.03, .03, reachX * 2, 10).rotateZ(Math.PI / 2).translate(0, floor + lipHeight, .17);
      const shellCount = Math.max(5, Math.round(viewWidth / .62)), shells = [], bulbSpots = [];
      // None in the corners, where the small print sits.
      for (let i = portrait ? 0 : 1; i < shellCount - (portrait ? 0 : 1); i++) {
        const x = (i + .5 - shellCount / 2) * viewWidth / shellCount;
        shells.push(new THREE.SphereGeometry(shellSize, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, floor + lipHeight * lampRise, .19));
        bulbSpots.push([x, floor + lipHeight * lampRise + shellSize * .3, .22]);
      }
      for (const [geometry, material] of [[slab, lipWood], [mergeGeometries([rail, ...shells]), brass]]) {
        const mesh = new THREE.Mesh(geometry, material); mesh.frustumCulled = false; lip.add(mesh); lipMeshes.push(mesh);
      }
      if (footlights) footlights.remove();
      const holder = new THREE.Group(); lip.add(holder);
      const ownDisposables = [];
      const set = lampSet(holder, bulbSpots, shellSize * .49, shellSize * 7.5, ownDisposables);
      footlights = { set, remove() { lip.remove(holder); ownDisposables.forEach(thing => thing.dispose()); } };
      for (let i = 0; i < set.count; i++) set.lit.setX(i, .92);
    },
    place(y) { view.y = y; },
    enter(now) { view.enterAt = now; },
    hover(on) { if (on && !view.hovering) swing.velocity += .5; view.hovering = on; },
    // The hand on the rope: down, and then the curtain goes.
    pull(now) { view.pullUntil = now + 170; swing.velocity += .3; },
    lift(amount) { view.lift = amount; if (amount >= 1) { group.visible = false; lip.visible = false; } },
    update(now, dt) {
      let moving = false;
      const pullGoal = now < view.pullUntil ? .24 : 0;
      pullState.velocity += (pullGoal - pullState.value) * 420 * dt - pullState.velocity * 20 * dt;
      pullState.value += pullState.velocity * dt;
      swing.velocity += -swing.value * 34 * dt - swing.velocity * 1.5 * dt;
      swing.value += swing.velocity * dt;
      if (Math.abs(pullState.velocity) > .004 || Math.abs(swing.velocity) > .01) moving = true;
      cord.position.y = -H - Math.max(0, pullState.value); cord.rotation.z = swing.value;
      const entering = Math.min(1, Math.max(0, (now - view.enterAt) / 760));
      const eased = 1 + 2.1 * (entering - 1) ** 3 + 1.1 * (entering - 1) ** 2;
      if (entering < 1) moving = true;
      const liftEase = view.lift * view.lift * view.lift;
      board.position.y = view.y + (1 - eased) * view.travel + liftEase * view.travel + Math.max(0, pullState.value) * -.1 * view.scale;
      lip.position.y = -liftEase * view.lipHeight * 3;
      // Everything held on the site's threes: the slight sway and the running lights.
      const tick = Math.floor(now / 195);
      if (tick !== view.lastTick) {
        view.lastTick = tick;
        board.rotation.z = Math.sin(tick * .37) * .0045;
        for (let i = 0; i < lamps.count; i++) lamps.lit.setX(i, view.hovering || (i + tick) % 3 === 0 ? 1 : .34);
        lamps.lit.needsUpdate = true;
        if (footlights) { for (let i = 0; i < footlights.set.count; i++) footlights.set.lit.setX(i, .82 + ((i * 7 + tick) % 5) * .04); footlights.set.lit.needsUpdate = true; }
      }
      return moving;
    },
    dispose() {
      chainMesh?.geometry.dispose(); lipMeshes.forEach(mesh => mesh.geometry.dispose()); footlights?.remove();
      disposables.forEach(thing => thing.dispose());
    },
  };
}
