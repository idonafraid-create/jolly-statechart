// Hotel pigeonholes that double as the facade's windows. Rooms light up on the beat; keys swing when the bell rings.
import * as THREE from 'three';
import { inkMaterial, mergeGeometries, pencilMaterial } from './opening-pencil.mjs';

const seeded = seed => () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296);
export const CELL = { w: .5, h: .68, depth: .16 };
const CAPACITY = 180;

// Each storey of the facade cuts its windows differently: arches below, stepped Deco in the middle, portholes above.
function windowHole(kind) {
  const hole = new THREE.Path(), hw = CELL.w * .35, base = -CELL.h * .36;
  if (kind === 'arch') {
    const spring = CELL.h * .14;
    hole.moveTo(-hw, base); hole.lineTo(hw, base); hole.lineTo(hw, spring); hole.absarc(0, spring, hw, 0, Math.PI, false); hole.lineTo(-hw, base);
  } else if (kind === 'round') {
    hole.absarc(0, CELL.h * .02, CELL.w * .36, 0, Math.PI * 2, false);
  } else {
    const top = CELL.h * .38, step = CELL.h * .075;
    hole.moveTo(-hw, base); hole.lineTo(hw, base); hole.lineTo(hw, top - step * 2);
    hole.lineTo(hw * .68, top - step * 2); hole.lineTo(hw * .68, top - step); hole.lineTo(hw * .34, top - step); hole.lineTo(hw * .34, top);
    hole.lineTo(-hw * .34, top); hole.lineTo(-hw * .34, top - step); hole.lineTo(-hw * .68, top - step); hole.lineTo(-hw * .68, top - step * 2);
    hole.lineTo(-hw, top - step * 2); hole.lineTo(-hw, base);
  }
  return hole;
}
function frameGeometry(kind) {
  const tw = CELL.w * .5 - .012, th = CELL.h * .5 - .012, outer = new THREE.Shape();
  outer.moveTo(-tw, -th); outer.lineTo(tw, -th); outer.lineTo(tw, th); outer.lineTo(-tw, th); outer.closePath();
  outer.holes.push(windowHole(kind));
  const geometry = new THREE.ExtrudeGeometry(outer, { depth: CELL.depth, bevelEnabled: true, bevelSize: .01, bevelThickness: .01, bevelSegments: 1, curveSegments: 16 });
  geometry.translate(0, 0, -CELL.depth);
  return geometry;
}

export function keyRacks(shared, kit) {
  const disposables = [], group = new THREE.Group(), random = seeded(5501);
  const keep = thing => { disposables.push(thing); return thing; };
  const cream = keep(pencilMaterial(shared, kit.matcap.cream, { hatch: .36, hatchColor: '#7a6650', rim: .05, fleck: .3, lift: .46 }));
  const brass = keep(pencilMaterial(shared, kit.matcap.brass, { hatch: .3, hatchColor: '#4a2a0f', rim: 0, fleck: .2, gain: 1.1 }));
  const coral = keep(pencilMaterial(shared, kit.matcap.coral, { hatch: .3, hatchColor: '#5d0f22', rim: 0, fleck: .25 }));
  const cobalt = keep(pencilMaterial(shared, kit.matcap.cobalt, { hatch: .3, hatchColor: '#0d1548', rim: 0, fleck: .35, tint: '#a8b6ff' }));
  const paperMaterial = keep(pencilMaterial(shared, kit.matcap.cream, { hatch: .25, hatchColor: '#6d5a78', rim: 0, fleck: .22, lift: .72 }));
  const tagMaterial = keep(pencilMaterial(shared, kit.matcap.cream, { hatch: .3, hatchColor: '#2a2340', rim: 0, fleck: .24, instanceTint: true, lift: 0 }));
  tagMaterial.defines = { USE_INSTANCING_COLOR: '' };
  const fineInk = keep(inkMaterial(shared, .0045));

  const SHAPES = ['arch', 'stepped', 'round'];
  const frames = Object.fromEntries(SHAPES.map(kind => {
    const mesh = new THREE.InstancedMesh(keep(frameGeometry(kind)), cream, CAPACITY);
    mesh.frustumCulled = false; group.add(mesh);
    return [kind, mesh];
  }));

  // The room behind the window: a dark interior that a lamp can flood.
  const backGeometry = keep(new THREE.PlaneGeometry(CELL.w, CELL.h));
  backGeometry.translate(0, 0, -CELL.depth + .002);
  const glowAttribute = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY), 1); glowAttribute.setUsage(THREE.DynamicDrawUsage);
  const toneAttribute = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 3), 3), lampAttribute = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 3), 3);
  backGeometry.setAttribute('aGlow', glowAttribute); backGeometry.setAttribute('aTone', toneAttribute); backGeometry.setAttribute('aLamp', lampAttribute);
  const backMaterial = keep(new THREE.ShaderMaterial({
    uniforms: { uTile: shared.uTile, uTooth: shared.uTooth, uBoil: shared.uBoil, uPixel: shared.uPixel },
    vertexShader: `attribute float aGlow;attribute vec3 aTone,aLamp;varying vec2 vP;varying float vGlow;varying vec3 vTone,vLamp;
      void main(){vP=position.xy;vGlow=aGlow;vTone=aTone;vLamp=aLamp;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D uTile,uTooth;uniform float uBoil,uPixel;varying vec2 vP;varying float vGlow;varying vec3 vTone,vLamp;
      void main(){
        float j=floor(uBoil);vec2 sc=gl_FragCoord.xy/uPixel;vec2 off=vec2(fract(j*.37)*97.,fract(j*.71)*61.);
        float pool=exp(-dot(vP-vec2(0.,.14),vP-vec2(0.,.14))*13.);
        vec3 lit=mix(vLamp*.66,mix(vLamp,vec3(1.,.96,.78),.34),pool);
        vec3 col=mix(vTone*(.86+pool*.26),lit,smoothstep(.0,.82,vGlow));
        col*=.84+texture2D(uTile,(sc+off)/400.).r*.3;
        col=mix(col,vec3(1.,.96,.88),smoothstep(.68,.86,texture2D(uTooth,(sc+off.yx)/170.).r)*.16);
        gl_FragColor=vec4(col,1.);
      }`,
  }));
  backMaterial.toneMapped = false;
  const backs = new THREE.InstancedMesh(backGeometry, backMaterial, CAPACITY);
  backs.frustumCulled = false; group.add(backs);

  // Light spilling on to the facade around a lit window.
  const haloGeometry = keep(new THREE.PlaneGeometry(CELL.w * 1.9, CELL.h * 1.75));
  haloGeometry.translate(0, 0, .03);
  const haloAttribute = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY), 1); haloAttribute.setUsage(THREE.DynamicDrawUsage);
  haloGeometry.setAttribute('aGlow', haloAttribute); haloGeometry.setAttribute('aLamp', lampAttribute);
  const haloMaterial = keep(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float aGlow;attribute vec3 aLamp;varying vec2 vP;varying float vGlow;varying vec3 vLamp;void main(){vP=position.xy;vGlow=aGlow;vLamp=aLamp;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vP;varying float vGlow;varying vec3 vLamp;void main(){float d=dot(vP/vec2(${(CELL.w * .95).toFixed(3)},${(CELL.h * .875).toFixed(3)}),vP/vec2(${(CELL.w * .95).toFixed(3)},${(CELL.h * .875).toFixed(3)}));float a=exp(-d*4.)*(1.-smoothstep(.6,1.,d))*vGlow*.26;gl_FragColor=vec4(vLamp*a,a);}`,
  }));
  haloMaterial.toneMapped = false;
  const halos = new THREE.InstancedMesh(haloGeometry, haloMaterial, CAPACITY);
  halos.frustumCulled = false; halos.renderOrder = 1; group.add(halos);

  // What's in the room: mostly keys, sometimes a do-not-disturb, a letter, or a paper arrow that has checked in.
  const bow = new THREE.TorusGeometry(.042, .0115, 8, 20); bow.translate(0, -.042, 0);
  const shaft = new THREE.CylinderGeometry(.0098, .0098, .15, 8); shaft.translate(0, -.155, 0);
  const bitA = new THREE.BoxGeometry(.036, .014, .012); bitA.translate(.018, -.2, 0);
  const bitB = new THREE.BoxGeometry(.026, .012, .012); bitB.translate(.013, -.222, 0);
  const keyGeometry = keep(mergeGeometries([bow, shaft, bitA, bitB]));
  const tagShape = new THREE.Shape();
  tagShape.moveTo(-.036, 0); tagShape.lineTo(.036, 0); tagShape.lineTo(.046, -.03); tagShape.lineTo(.046, -.1); tagShape.lineTo(-.046, -.1); tagShape.lineTo(-.046, -.03); tagShape.closePath();
  const tagGeometry = keep(new THREE.ExtrudeGeometry(tagShape, { depth: .008, bevelEnabled: false }));
  tagGeometry.translate(-.072, -.06, 0);
  const hangerShape = new THREE.Shape();
  hangerShape.moveTo(-.056, -.27); hangerShape.lineTo(.056, -.27); hangerShape.lineTo(.056, -.05); hangerShape.absarc(0, -.05, .056, 0, Math.PI, false); hangerShape.lineTo(-.056, -.27);
  const hangerHole = new THREE.Path(); hangerHole.absarc(0, -.05, .026, 0, Math.PI * 2, true); hangerShape.holes.push(hangerHole);
  const hangerGeometry = keep(new THREE.ExtrudeGeometry(hangerShape, { depth: .007, bevelEnabled: false, curveSegments: 12 }));
  const letterGeometry = keep(new THREE.BoxGeometry(.22, .14, .006)); letterGeometry.translate(0, .07, 0);
  const sealGeometry = keep(new THREE.CircleGeometry(.021, 14)); sealGeometry.translate(0, .07, .005);
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(-.1, -.02); arrowShape.lineTo(.04, -.02); arrowShape.lineTo(.04, -.058); arrowShape.lineTo(.12, 0); arrowShape.lineTo(.04, .058); arrowShape.lineTo(.04, .02); arrowShape.lineTo(-.1, .02); arrowShape.closePath();
  const arrowGeometry = keep(new THREE.ExtrudeGeometry(arrowShape, { depth: .006, bevelEnabled: false }));
  arrowGeometry.translate(0, -.14, 0);

  const instanced = (geometry, material) => { const mesh = new THREE.InstancedMesh(geometry, material, CAPACITY); mesh.frustumCulled = false; mesh.count = 0; group.add(mesh); return mesh; };
  const tags = instanced(tagGeometry, tagMaterial);
  const palette = ['#e97780', '#b9dd4a', '#6f8cf0', '#fff4dc', '#e97780', '#fff4dc'].map(color => new THREE.Color(color));
  for (let i = 0; i < CAPACITY; i++) tags.setColorAt(i, palette[Math.floor(random() * palette.length)]);
  const contents = {
    key: { meshes: [instanced(keyGeometry, brass), instanced(keyGeometry, fineInk), tags], pivot: .17, used: 0, swing: 1 },
    hanger: { meshes: [instanced(hangerGeometry, coral)], pivot: .24, used: 0, swing: 1 },
    letter: { meshes: [instanced(letterGeometry, paperMaterial), instanced(sealGeometry, coral)], pivot: -.34, used: 0, swing: .16 },
    arrow: { meshes: [instanced(arrowGeometry, cobalt)], pivot: .08, used: 0, swing: 1 },
  };
  const cornice = new THREE.Group(); group.add(cornice);
  const corniceMaterial = keep(pencilMaterial(shared, kit.matcap.cobalt, { hatch: .35, hatchColor: '#0d1548', rim: 0, fleck: .4 }));
  const boxGeometry = keep(new THREE.BoxGeometry(1, 1, 1));

  const TONES = ['#10185a', '#10185a', '#10185a', '#1b2bb4', '#35123f', '#0f2f2a'].map(color => new THREE.Color(color));
  const LAMPS = ['#ffb733', '#ffb733', '#ffb733', '#ffc95c', '#ff9f33', '#ff8a70', '#cfe84f'].map(color => new THREE.Color(color));
  const cells = [];
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), axis = new THREE.Vector3(0, 0, 1), scale = new THREE.Vector3(1, 1, 1), at = new THREE.Vector3();
  const place = cell => {
    const content = contents[cell.content];
    quaternion.setFromAxisAngle(axis, cell.angle * content.swing);
    matrix.compose(at.set(cell.x, cell.y + CELL.h * content.pivot, -.07), quaternion, scale);
    for (const mesh of content.meshes) { mesh.setMatrixAt(cell.slot, matrix); mesh.instanceMatrix.needsUpdate = true; }
  };

  let glowDirty = false, moodScale = 1;
  const light = (cell, amount) => { if (amount > cell.glow) { cell.glow = amount; glowDirty = true; } };
  // Bars cycle through lighting figures, so the wall never settles into a single flashing pattern.
  function pulse(event, intensity = 1) {
    const { bar, inBar, kind, strength } = event, figure = bar % 4;
    const amount = (.5 + strength * .5) * intensity;
    if (kind === 'off') {
      for (let n = 0; n < 3; n++) { const cell = cells[Math.floor(random() * cells.length)]; if (cell) light(cell, amount * .7); }
      return;
    }
    const inner = Math.max(...cells.map(cell => cell.rank), 0) + 1, rows = Math.max(...cells.map(cell => cell.row), 0) + 1;
    for (const cell of cells) {
      let on = false;
      if (figure === 0) on = inBar === 0 ? true : cell.rank % inner === (inBar - 1) % inner;
      else if (figure === 1) on = cell.row % rows === inBar % rows;
      else if (figure === 2) on = (cell.row + cell.column + inBar) % 2 === 0;
      else on = inBar === 3 ? true : ((cell.row * 7 + cell.column * 5 + cell.index + inBar * 3) % 5) === 0;
      if (on) light(cell, amount);
    }
  }

  return {
    group, cells, pulse,
    layout(regions) {
      cells.length = 0; cornice.clear();
      const shapeCounts = Object.fromEntries(SHAPES.map(kind => [kind, 0]));
      for (const content of Object.values(contents)) content.used = 0;
      let index = 0;
      const pick = seeded(811);
      for (const region of regions) {
        let arrowPlaced = false;
        for (let row = 0; row < region.rows; row++) for (let column = 0; column < region.columns; column++) {
          if (index >= CAPACITY) break;
          const x = region.x + region.direction * (column + .5) * CELL.w, y = region.y + (row + .5) * CELL.h;
          const shape = SHAPES[row % 3];
          matrix.makeTranslation(x, y, 0);
          frames[shape].setMatrixAt(shapeCounts[shape]++, matrix);
          backs.setMatrixAt(index, matrix); halos.setMatrixAt(index, matrix);
          TONES[Math.floor(pick() * TONES.length)].toArray(toneAttribute.array, index * 3);
          LAMPS[Math.floor(pick() * LAMPS.length)].toArray(lampAttribute.array, index * 3);
          const roll = pick();
          let content = roll < .7 ? 'key' : roll < .82 ? 'hanger' : roll < .92 ? 'letter' : 'arrow';
          if (!arrowPlaced && row === 1 && column === 0) { content = 'arrow'; arrowPlaced = true; }
          const slot = contents[content].used++;
          cells.push({ index, slot, content, x, y, row, column, rank: column, angle: (pick() - .5) * .05, velocity: 0, frequency: 6.4 + pick() * 2.4, kickAt: Infinity, kick: 0, glow: 0 });
          index++;
        }
        const width = region.columns * CELL.w, cx = region.x + region.direction * width / 2, top = region.y + region.rows * CELL.h;
        const addBox = (bx, by, sx, sy, sz, material) => { const box = new THREE.Mesh(boxGeometry, material); box.position.set(bx, by, -.02); box.scale.set(sx, sy, sz); cornice.add(box); };
        addBox(cx, top + .05, width + .12, .1, .24, corniceMaterial);
        addBox(region.x - region.direction * .035, region.y + region.rows * CELL.h / 2, .07, region.rows * CELL.h, .22, cream);
      }
      for (const kind of SHAPES) { frames[kind].count = shapeCounts[kind]; frames[kind].instanceMatrix.needsUpdate = true; }
      backs.count = halos.count = index;
      backs.instanceMatrix.needsUpdate = halos.instanceMatrix.needsUpdate = true;
      toneAttribute.needsUpdate = lampAttribute.needsUpdate = true;
      for (const content of Object.values(contents)) for (const mesh of content.meshes) mesh.count = content.used;
      tags.instanceColor.needsUpdate = true;
      cells.forEach(place);
    },
    // Returns true while any key is swinging or any lamp is dying down.
    update(dt, now) {
      let moving = false;
      const fade = Math.exp(-dt / .2);
      for (const cell of cells) {
        if (now >= cell.kickAt) { cell.velocity += cell.kick; cell.kickAt = Infinity; light(cell, .95); }
        const acceleration = -cell.frequency * cell.frequency * Math.sin(cell.angle) - 1.5 * cell.velocity;
        cell.velocity += acceleration * dt; cell.angle += cell.velocity * dt;
        if (Math.abs(cell.velocity) > .004 || Math.abs(cell.angle) > .004) { moving = true; place(cell); }
        if (cell.glow > .004) {
          glowAttribute.array[cell.index] = haloAttribute.array[cell.index] = cell.glow * moodScale;
          cell.glow *= fade; glowDirty = true; moving = true;
        } else if (glowAttribute.array[cell.index] !== 0) { glowAttribute.array[cell.index] = haloAttribute.array[cell.index] = 0; glowDirty = true; }
      }
      if (glowDirty) { glowAttribute.needsUpdate = haloAttribute.needsUpdate = true; glowDirty = false; }
      return moving;
    },
    wave(now, originX, originY, speed = 8) {
      for (const cell of cells) {
        const distance = Math.hypot(cell.x - originX, cell.y - originY);
        cell.kickAt = now + distance / speed * 1000;
        cell.kick = (Math.sign(cell.x - originX) || 1) * (2.6 + random() * 1.8);
      }
    },
    // A passing cursor sets keys swinging and wakes the rooms it brushes.
    brush(x, y, push) {
      for (const cell of cells) {
        const distance = Math.hypot(cell.x - x, cell.y - y);
        if (distance < .5) { cell.velocity += push * (1 - distance / .5); light(cell, .85 * (1 - distance / .5)); }
      }
    },
    // A small nudge on the bar keeps the keys moving with the band.
    nudge(amount) { for (const cell of cells) cell.velocity += amount * (cell.column % 2 ? 1 : -1); },
    setMood(value) { moodScale = value; },
    dispose() {
      disposables.forEach(thing => thing.dispose());
      for (const mesh of Object.values(frames)) mesh.dispose();
      for (const content of Object.values(contents)) for (const mesh of content.meshes) mesh.dispose();
      backs.dispose(); halos.dispose();
    },
  };
}
