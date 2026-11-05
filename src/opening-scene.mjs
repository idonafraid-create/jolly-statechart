// The Jolly's night desk. Every ring changes the shift: colour floods from the bell and someone new answers.
import * as THREE from 'three';
import { buildBell } from './opening-bell.mjs';
import { deskProps } from './opening-props.mjs';
import { keyRacks } from './opening-racks.mjs';
import { deskFront, deskTop, farStars, lobbyClock, stageDrape, valance, wallPass, waveHoop } from './opening-set.mjs';
import { marquee } from './opening-marquee.mjs';
import { loadPencilKit, plateMaterial, sharedUniforms } from './opening-pencil.mjs';
import { castPose } from './opening-cast.mjs';

export const SHIFTS = [
  // strokes: the four sound marks round the bell; strokeHot: what they flash to on the beat or under the pointer.
  { id: 'midnight', cast: [], cues: [], wall: '#1b2bb4', ray: '#2439ce', bandA: '#f6f1e6', bandB: '#e97780', strokes: ['#e4676f', '#e3a82b', '#e4676f', '#e3a82b'], strokeHot: '#b1d42a' },
  { id: 'jojo', cast: ['jojo'], cues: ['sax'], wall: '#e4676f', ray: '#ee8086', bandA: '#f6f1e6', bandB: '#d9a33a', strokes: ['#a03953', '#e4676f', '#a03953', '#e4676f'], strokeHot: '#e3a82b' },
  { id: 'lyly', cast: ['lyly'], cues: ['bass'], wall: '#b1d42a', ray: '#c2e04a', bandA: '#f6f1e6', bandB: '#2140d6', strokes: ['#7fa51a', '#2140d6', '#7fa51a', '#2140d6'], strokeHot: '#e4676f' },
  { id: 'yoyo', cast: ['yoyo'], cues: ['guitar'], wall: '#7f1f3b', ray: '#932a48', bandA: '#f6f1e6', bandB: '#b1d42a', strokes: ['#7f1f3b', '#ed9ba9', '#7f1f3b', '#ed9ba9'], strokeHot: '#b1d42a' },
  // Keep ringing and the whole staff turns up.
  { id: 'trio', cast: ['jojo', 'lyly', 'yoyo'], cues: ['sax', 'bass', 'guitar'], wall: '#d99c24', ray: '#e6b03e', bandA: '#f6f1e6', bandB: '#e97780', strokes: ['#e4676f', '#e3a82b', '#7fa51a', '#2140d6'], strokeHot: '#ed9ba9' },
];
const SIDE = { jojo: -1, lyly: 1, yoyo: -1 };
// The beat walks over the bell in an arc, one sound mark per beat: low left, high left, high right, low right.
const BEAT_ARC = [1, 0, 2, 3];
// Each player changes pose in their own time: JOJO rarely, LYLY constantly, YOYO just before the downbeat.
const POSE_CYCLE = { jojo: ['play', 'big', 'play', 'stop'], lyly: ['play', 'big'], yoyo: ['play', 'big', 'play', 'stop'] };
const changesPose = (who, event) => (who === 'jojo' ? event.inBar === 0 && event.bar % 2 === 0 : who === 'lyly' ? event.inBar % 2 === 0 : event.inBar === 3);
// The film opens on this colour, so wall and star arrive at the same place.
const ENTERING = { id: 'entering', wall: '#e4676f', ray: '#ee8086', bandA: '#f6f1e6', bandB: '#d9a33a' };
const FOV = 24, PITCH = 11 * Math.PI / 180, CLOCK_Z = -1.5, ACTOR_Z = -1.28, DESK_BACK = -1.25, DESK_FRONT = 1.62, DRAPE_Z = 2.2, SIGN_Z = 2.42;
// The curtain's run, and how long the bell waits so it lands on the loop's third beat (1.133s).
const DRAPE_SECONDS = 1.2, BELL_WAIT = 180;
const easeOutBack = t => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
const easeOutCubic = t => 1 - (1 - t) ** 3;
const clamp01 = t => Math.max(0, Math.min(1, t));
function step(state, target, stiffness, damping, dt) {
  state.velocity += (target - state.value) * stiffness * dt - state.velocity * damping * dt;
  state.value += state.velocity * dt;
  return Math.abs(state.velocity) > .002 || Math.abs(target - state.value) > .001;
}

export async function createOpeningScene(host, { onRing, onLand, onShift, onStrum, onActorTap, reportPhase, beats } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.className = 'opening-stage';
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y';
  const kit = await loadPencilKit(renderer);
  const shared = sharedUniforms(kit);
  // The same paper tooth the pencil shader breaks its pigment with, thresholded the same way, for the page-layer buttons on the plate.
  const paintFlecks = () => {
    const { data, width, height } = kit.tooth.image, canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const g = canvas.getContext('2d'), image = g.createImageData(width, height);
    for (let i = 0; i < width * height; i++) {
      const tooth = data[i] / 255, t = Math.max(0, Math.min(1, (tooth - .72) / .12));
      image.data[i * 4] = 255; image.data[i * 4 + 1] = 247; image.data[i * 4 + 2] = 230; image.data[i * 4 + 3] = 255 * t * t * (3 - 2 * t) * .62;
    }
    g.putImageData(image, 0, 0);
    canvas.toBlob(blob => {
      if (!blob || disposed) return;
      fleckUrl = URL.createObjectURL(blob);
      plaque?.style.setProperty('--flecks', `url(${fleckUrl})`);
    });
  };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, .1, 60);
  const wall = wallPass(shared), hoop = waveHoop(wall.uniforms), stars = farStars(shared), clock = lobbyClock(shared, kit), racks = keyRacks(shared, kit);
  // The house lights for the closed curtain, shared by everything hanging in them.
  const stageLight = { uSpotCentre: { value: new THREE.Vector2() }, uSpotReach: { value: new THREE.Vector2(1, 1) }, uSpotTop: { value: 1 }, uSpotShade: { value: 1 }, uSpotFoot: { value: 1 }, uStageLight: { value: 1 } };
  const curtain = valance(shared, kit, stageLight), drape = stageDrape(shared, kit, stageLight), sign = marquee(shared, kit), top = deskTop(shared), front = deskFront(shared, kit), bell = buildBell(shared, kit), props = deskProps(shared, kit);
  // Everything behind the house curtain. While it is down there is nothing back there to draw.
  const stage = new THREE.Group();
  stage.add(wall.mesh, stars.mesh, racks.group, clock.group, hoop.mesh, top.mesh, front.group, props.group, bell.root);
  stage.visible = false;
  scene.add(stage, drape.group, sign.group, sign.lip, curtain.group);
  drape.group.position.z = DRAPE_Z; sign.group.position.z = SIGN_Z; sign.lip.position.z = SIGN_Z;
  racks.group.position.z = CLOCK_Z - .18;
  const dressStrokes = shift => shift.strokes?.forEach((color, index) => { bell.strokes[index].target.set(color); bell.strokes[index].hot.set(shift.strokeHot); });
  dressStrokes(SHIFTS[0]);
  // Paint order: everything behind the bell, then the paper hoop, then desk, bell and curtain over it.
  for (const group of [top.mesh, front.group, props.group, bell.root, drape.group, curtain.group]) group.traverse(child => { child.renderOrder = 3; });
  clock.group.position.z = CLOCK_Z; front.group.position.z = DESK_FRONT;
  top.uniforms.uFront.value = DESK_FRONT; top.uniforms.uBack.value = DESK_BACK;

  const view = { width: 1, height: 1, dpr: 1, portrait: false, distance: 8, targetY: .8, viewHeight: 3.6, pixelBudget: 4.2e6 };
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), ray = new THREE.Ray();
  const scratch = new THREE.Vector3(), pointerWorld = new THREE.Vector3();
  const pointer = { x: 0, y: 0, speed: 0, lastInput: -Infinity, seen: false };
  const smooth = { x: 0, y: 0 };
  const buttonState = { value: 0, velocity: 0 }, squash = { value: 0, velocity: 0 }, starHop = { value: 0, velocity: 0 }, clockPulse = { value: 1, velocity: 0 };
  const starAz = { value: 0, velocity: 0 }, starEl = { value: .62, velocity: 0 }, drop = { value: 6 };
  const minuteHand = { value: 10 / 60 * Math.PI * 2, velocity: 0 };
  const minutesToMidnight = () => midnight ? 0 : Math.max(1, 10 - minuteTicks * 2);
  const assembly = { start: Infinity, landed: false };
  let disposed = false, frame = 0, last = 0, lastPaint = 0, activeUntil = 0, pressing = false, pressTarget = 0, pressStart = 0, pressReleaseAt = Infinity, beatCursor = 0, lastInvite = 0, impactArmed = false, impactAt = -Infinity;
  let shiftIndex = -1, waveStart = -Infinity, waveFrom = 0, rayBase = 0, actors = {}, pending = [], launch = null, entering = false, midnight = false, minuteTicks = -1, lastSecond = -1, hoverBell = false, resizeTimer = 0, lastFrameAt = 0, slowFrames = 0, activeCast = [];
  const sway = { value: 0, phase: 0 }, textures = [], pointerDrape = new THREE.Vector3(), lastDrape = new THREE.Vector3();
  let stir = 0;
  let closed = true, curtainGone = false, drapeAt = Infinity, peek = 0, peekGoal = 0, give = 0, ambient = false;

  function project(x, y, z) {
    scratch.set(x, y, z).project(camera);
    return { x: (scratch.x * .5 + .5) * view.width, y: (.5 - scratch.y * .5) * view.height };
  }
  // World position under a screen point, on a plane facing the viewer.
  function onPlane(ndcX, ndcY, z, out) {
    ray.origin.copy(camera.position);
    ray.direction.set(ndcX, ndcY, .5).unproject(camera).sub(camera.position).normalize();
    plane.constant = -z;
    return ray.intersectPlane(plane, out);
  }
  // The words on the brass plate are a page layer over the 3D desk. They follow the plate's four corners as the camera moves, so they stay printed on it.
  const plaque = host.querySelector('.opening-plaque');
  paintFlecks();
  let plateRect = null, plateTransform = '', plateBoil = -1, fleckUrl = '', warming = false;
  const plateCorners = () => {
    const { halfWidth: x, top, bottom } = plateRect, z = DESK_FRONT + .013;
    return [project(-x, top, z), project(x, top, z), project(x, bottom, z), project(-x, bottom, z)];
  };
  function sizePlate() {
    if (!plaque) return;
    const [a, b, , d] = plateCorners();
    plateRect.width = Math.hypot(b.x - a.x, b.y - a.y); plateRect.height = Math.hypot(d.x - a.x, d.y - a.y);
    // Everything on the plate is sized in this one unit, so it fits however wide the plate comes out.
    const unit = matchMedia('(max-aspect-ratio:1/1)').matches ? Math.min(plateRect.width / 340, plateRect.height / 252) : Math.min(plateRect.width / 760, plateRect.height / 128);
    plaque.style.width = `${plateRect.width}px`; plaque.style.height = `${plateRect.height}px`;
    plaque.style.setProperty('--pu', `${unit}px`);
    syncPlate();
    plaque.dispatchEvent(new Event('plate-sized'));
  }
  function syncPlate() {
    if (!plaque || !plateRect) return;
    const [a, b, c, d] = plateCorners(), w = plateRect.width, h = plateRect.height;
    const dx1 = b.x - c.x, dx2 = d.x - c.x, dx3 = a.x - b.x + c.x - d.x, dy1 = b.y - c.y, dy2 = d.y - c.y, dy3 = a.y - b.y + c.y - d.y;
    const den = dx1 * dy2 - dx2 * dy1, g = (dx3 * dy2 - dx2 * dy3) / den, k = (dx1 * dy3 - dx3 * dy1) / den;
    const matrix = [(b.x - a.x + g * b.x) / w, (b.y - a.y + g * b.y) / w, 0, g / w, (d.x - a.x + k * d.x) / h, (d.y - a.y + k * d.y) / h, 0, k / h, 0, 0, 1, 0, a.x, a.y, 0, 1];
    const transform = `matrix3d(${matrix.map(value => +value.toFixed(7)).join(',')})`;
    if (transform !== plateTransform) { plateTransform = transform; plaque.style.transform = transform; }
  }
  function aimCamera(yaw = 0, pitch = 0) {
    const elevation = PITCH + pitch;
    camera.position.set(Math.sin(yaw) * Math.cos(elevation) * view.distance, view.targetY + Math.sin(elevation) * view.distance, Math.cos(yaw) * Math.cos(elevation) * view.distance);
    camera.lookAt(0, view.targetY, 0);
    camera.updateMatrixWorld();
  }

  function layout() {
    if (disposed) return;
    const width = host.clientWidth || innerWidth, height = host.clientHeight || innerHeight, aspect = width / height;
    Object.assign(view, { width, height, portrait: aspect < 1.02 });
    camera.aspect = aspect;
    // The bell is the subject: half the frame on a desktop, most of the width on a phone.
    const bellWidth = 2.86, bellHeight = 1.82;
    let baseFraction;
    if (view.portrait) {
      // Most of a phone's width; less on a tablet, which has room left above the bell for whoever answers.
      const share = THREE.MathUtils.lerp(.76, .5, clamp01((aspect - .5) / .5));
      view.viewHeight = bellWidth / share / aspect; baseFraction = .59;
    }
    else { view.viewHeight = Math.max(bellHeight / .41, bellWidth / .44 / aspect); baseFraction = .645; }
    view.distance = view.viewHeight / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    view.targetY = (baseFraction - .5) * view.viewHeight;
    camera.near = .1; camera.far = view.distance + 40;
    camera.updateProjectionMatrix(); aimCamera();

    const span = z => {
      const left = new THREE.Vector3(), right = new THREE.Vector3();
      onPlane(-1, 0, z, left); onPlane(1, 0, z, right);
      return right.x - left.x;
    };
    const atFront = span(DESK_FRONT);
    top.mesh.scale.set(atFront * 3, DESK_FRONT - DESK_BACK, 1);
    top.mesh.position.set(0, 0, (DESK_FRONT + DESK_BACK) / 2);

    // Find how much desk front the frame shows, then build its relief to exactly that height.
    const bottom = new THREE.Vector3();
    onPlane(0, -1, DESK_FRONT, bottom);
    const deskHeight = -bottom.y + .03;
    const plaqueWidth = view.portrait ? Math.min(atFront * .94, 3.4) : Math.min(atFront * .58, 4.5);
    plateRect = front.build({ width: atFront, height: deskHeight, plaqueWidth });
    sizePlate();

    // Clock rises from behind the desk like the sunrise on the theatre's crown.
    const radius = view.portrait ? 1.8 : 1.98, centreY = view.portrait ? .84 : .56;
    clock.group.scale.setScalar(radius); clock.group.position.y = centreY;
    Object.assign(view, { clockRadius: radius, clockY: centreY });
    view.clockAt = project(0, centreY, CLOCK_Z);
    applyResolution();
    stars.uniforms.uSpan.value.set(span(-4.5) * 1.1, view.viewHeight * 1.2); stars.uniforms.uBase.value = view.targetY - view.viewHeight * .25;

    // Racks fill the wall either side of the clock; on a phone, one band above it.
    const atRacks = span(CLOCK_Z - .18), rackTop = new THREE.Vector3();
    onPlane(0, 1, CLOCK_Z - .18, rackTop);
    let regions;
    if (view.portrait) {
      const rows = Math.max(1, Math.min(2, Math.floor((rackTop.y - (centreY + radius * 1.12)) / .68)));
      const columns = Math.ceil(atRacks / .5) + 2;
      racks.group.scale.setScalar(1);
      regions = [{ x: -columns * .25, y: centreY + radius * 1.14, direction: 1, columns, rows }];
    } else {
      // Two bays hard against each edge of the frame, so the wall between them can carry the colour.
      const scale = 1.2, columns = camera.aspect > 2 ? 3 : 2, rows = Math.ceil((rackTop.y + .1) / (.68 * scale));
      racks.group.scale.setScalar(scale);
      const inner = (atRacks / 2 - (columns - .1) * .5 * scale) / scale;
      regions = [-1, 1].map(direction => ({ x: direction * inner, y: .02, direction, columns, rows }));
    }
    view.rackScale = racks.group.scale.x;
    racks.layout(regions);

    const atValance = span(2.5), valanceTop = new THREE.Vector3();
    onPlane(0, 1, 2.5, valanceTop);
    curtain.build(atValance * 1.24, view.portrait ? .5 : .46);
    curtain.group.position.set(0, valanceTop.y + .08, 2.5);
    curtain.baseY = curtain.group.position.y;
    if (!curtainGone) layoutCurtain();

    const reach = span(0) / 2;
    props.place({ cardX: -Math.min(reach * .62, 2.36), cardZ: .62, lampX: Math.min(reach * .66, 2.5), lampZ: -.42, visible: !view.portrait && reach > 2.1 });
    top.uniforms.uLamp.value.x = props.group.visible ? props.lamp.position.x - .3 : 99; top.uniforms.uLamp.value.y = props.lamp.position.z + .24;

    // Keep the invisible keyboard/screen-reader target on top of the drawn bell.
    const crown = project(0, 1.78, 0), base = project(0, 0, 0), side = project(1.4, .6, 0);
    host.style.setProperty('--bell-x', `${base.x}px`); host.style.setProperty('--bell-top', `${crown.y}px`);
    host.style.setProperty('--bell-height', `${base.y - crown.y}px`); host.style.setProperty('--bell-width', `${(side.x - base.x) * 2}px`);
    placeActors();
    paint(performance.now());
  }

  // Sharp on any display, but never more pixels than the shaders can fill at speed.
  function layoutCurtain() {
    const { width, height } = view;
    const span = z => { const left = new THREE.Vector3(), right = new THREE.Vector3(); onPlane(-1, 0, z, left); onPlane(1, 0, z, right); return right.x - left.x; };
    const signTop = new THREE.Vector3(), signFloor = new THREE.Vector3();
    onPlane(0, 1, SIGN_Z, signTop); onPlane(0, -1, SIGN_Z, signFloor);

    sign.build({ width: span(SIGN_Z), top: signTop.y, floor: signFloor.y, portrait: view.portrait });
    // The hem hangs just behind the lip of the stage, wherever that falls on this screen.
    const drapeTop = new THREE.Vector3(), hem = new THREE.Vector3();
    onPlane(0, 1, DRAPE_Z, drapeTop);
    onPlane(0, scratch.set(0, sign.lipTop, SIGN_Z + .17).project(camera).y + .05, DRAPE_Z, hem);
    drape.build({ halfWidth: span(DRAPE_Z) * .62, top: drapeTop.y + .3, bottom: hem.y });
    for (const group of [drape.group, sign.group, sign.lip]) group.traverse(child => { child.renderOrder = Math.max(child.renderOrder, 3); });
    stageLight.uSpotCentre.value.set(width / 2, height * (view.portrait ? .5 : .52));
    stageLight.uSpotReach.value.set(width * (view.portrait ? .95 : .62), height * .74);
    stageLight.uSpotTop.value = height; stageLight.uSpotShade.value = height * .3; stageLight.uSpotFoot.value = height * .36;
    const signAt = project(0, sign.signY, SIGN_Z);
    const signEdge = project(sign.signHalfWidth, sign.signY, SIGN_Z), signCap = project(0, sign.signY + sign.signHalfHeight, SIGN_Z), signFoot = project(0, sign.signY - sign.signHalfHeight - sign.cordDrop, SIGN_Z);
    host.style.setProperty('--sign-x', `${signAt.x}px`); host.style.setProperty('--sign-top', `${signCap.y}px`);
    host.style.setProperty('--sign-width', `${(signEdge.x - signAt.x) * 2}px`); host.style.setProperty('--sign-height', `${signFoot.y - signCap.y}px`);
  }

  function applyResolution() {
    const { width, height, portrait, clockAt } = view;
    const dpr = view.dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(view.pixelBudget / (width * height)));
    renderer.setPixelRatio(dpr); renderer.setSize(width, height, false);
    shared.uPixel.value = dpr;
    wall.uniforms.uRes.value.set(width * dpr, height * dpr);
    wall.uniforms.uGapA.value = (portrait ? 26 : 44) * dpr; wall.uniforms.uGapB.value = (portrait ? 16 : 26) * dpr;
    wall.uniforms.uCenter.value.set(clockAt.x * dpr, (height - clockAt.y) * dpr);
    stars.uniforms.uCenterPx.value.copy(wall.uniforms.uCenter.value); stars.uniforms.uBuffer.value.set(width * dpr, height * dpr);
  }

  function placeActors() {
    for (const [who, item] of Object.entries(actors)) {
      const height = who === 'yoyo' ? (view.portrait ? 2 : 2.42) : (view.portrait ? 2.5 : 3.12);
      item.pxScale = height / item.poses.play.height;
      const side = SIDE[who], width = item.poses.play.width * item.pxScale;
      if (view.portrait) {
        item.restX = side * .5; item.feetY = view.clockY - .34;
        item.trioX = who === 'yoyo' ? -.05 : side * .86;
      } else {
        // Stand them just clear of the clock's bezel, cut off at the waist by the desk.
        const bay = Math.min(view.clockRadius * 1.36, view.viewHeight * camera.aspect * .36);
        item.restX = side * (bay + width * .06); item.feetY = who === 'yoyo' ? -.5 : -.98;
        item.trioX = who === 'yoyo' ? -1.86 : item.restX;
      }
      // With the whole staff up, the smallest of them hops on to the desk to be seen.
      item.trio = who === 'yoyo' && !view.portrait ? { feetY: 0, z: -.04, scale: .62 } : { feetY: item.feetY, z: ACTOR_Z, scale: 1 };
      applyPose(item);
    }
  }
  function applyPose(item) {
    const pose = item.poses[item.pose];
    item.width = pose.width * item.pxScale; item.height = pose.height * item.pxScale;
    item.material.uniforms.uMap.value = pose.texture;
  }

  function fireBeat(event, live) {
    racks.pulse(event, live ? 1 : .42);
    ambient = true;
    if (event.kind === 'beat') {
      const stroke = bell.strokes[BEAT_ARC[event.inBar]], level = (live ? 1 : .5) * (.55 + event.strength * .45);
      stroke.glow = Math.max(stroke.glow, level); stroke.stretchVelocity += level * 5.5;
    }
    if (event.kind === 'beat' && event.inBar % 2 === 0) props.beat(live ? event.strength : event.strength * .4);
    if (!live || event.kind !== 'beat') return;
    if (event.inBar === 0) { clockPulse.velocity += .1; racks.nudge(.5); }
    starHop.velocity += .22 * event.strength;
    for (const who of activeCast) {
      const item = actors[who];
      if (!item || !changesPose(who, event)) continue;
      const known = POSE_CYCLE[who].filter(pose => item.poses[pose]);
      if (known.length < 2) continue;
      item.step = (item.step + 1) % known.length;
      item.pose = known[item.step]; item.pop = .05;
      applyPose(item);
    }
  }
  function setShift(index) {
    shiftIndex = index;
    return applyShift(SHIFTS[index]);
  }
  function applyShift(next) {
    const u = wall.uniforms;
    u.uOldWall.value.copy(u.uNewWall.value); u.uOldRay.value.copy(u.uNewRay.value); u.uRotOld.value = u.uRotNew.value;
    u.uNewWall.value.set(next.wall); u.uNewRay.value.set(next.ray);
    u.uBandA.value.set(next.bandA); u.uBandB.value.set(next.bandB);
    waveFrom = rayBase; rayBase += .5;
    waveStart = performance.now(); u.uWave.value = 0;
    shared.uWall.value.set(next.ray);
    dressStrokes(next);
    host.dataset.shift = next.id;
    onShift?.(next);
    return next;
  }

  function impact(now, silent = false) {
    impactAt = now; impactArmed = false;
    squash.velocity += 1.7; starHop.velocity += 2.6; clockPulse.velocity += .55; sway.value = 1; props.strike();
    racks.wave(now, 0, view.clockY / view.rackScale);
    for (const stroke of bell.strokes) {
      if (stroke.extra) { stroke.birth = now + Math.random() * 70; stroke.life = 620 + Math.random() * 240; stroke.placed = false; }
      else { stroke.stretchVelocity += 8.5; stroke.pluck = .13; stroke.glow = 1; }
    }
    minuteTicks += 1;
    const next = entering ? applyShift(ENTERING) : setShift((shiftIndex + 1) % SHIFTS.length);
    const cast = entering ? [] : next.cast;
    for (const [who, item] of Object.entries(actors)) if (!cast.includes(who)) item.target = 'hide';
    activeCast = cast;
    cast.forEach((who, order) => pending.push({ at: now + 130 + order * 110, run: () => { const item = actors[who]; if (item && item.target !== 'show') { item.target = 'show'; item.rise.velocity = 0; item.step = 0; item.pose = 'play'; applyPose(item); } } }));
    reportPhase?.('rung');
    if (!silent && !entering) onRing?.(next);
    activeUntil = now + 2600;
  }

  function press(hold = false) {
    if (disposed || launch) return;
    pressing = hold; pressTarget = 1; impactArmed = true;
    pressStart = performance.now();
    pressReleaseAt = hold ? Infinity : pressStart + 120;
    activeUntil = performance.now() + 2600; requestPaint();
  }
  // A quick tap still gets one fully depressed drawing before the plunger comes back.
  function release() { pressing = false; pressReleaseAt = Math.max(performance.now(), pressStart + 120); requestPaint(); }

  function updateStrokes(now, dt) {
    let moving = false;
    for (const stroke of bell.strokes) {
      const { uniforms: u } = stroke;
      stroke.phase += dt * 62;
      if (stroke.extra) {
        const age = now - stroke.birth;
        if (age < 0 || age > stroke.life) { u.uReveal.value = 0; u.uOpacity.value = 0; continue; }
        const t = age / stroke.life;
        u.uStretch.value = .15 + 1.4 * easeOutCubic(clamp01(t * 2.4));
        u.uReveal.value = 1.01; u.uOpacity.value = 1 - clamp01((t - .55) / .45);
        stroke.mesh.position.x += Math.cos(stroke.mesh.rotation.z) * dt * 1.1 * (1 - t);
        stroke.mesh.position.y += Math.sin(stroke.mesh.rotation.z) * dt * 1.1 * (1 - t);
        if (!stroke.placed) { stroke.placed = true; stroke.mesh.position.set(Math.sin(stroke.angle) * stroke.side * stroke.radius, .4 + Math.cos(stroke.angle) * stroke.radius, 0); }
        u.uPluck.value = .05 * (1 - t); u.uPluckPhase.value = stroke.phase;
        moving = true;
        continue;
      }
      stroke.stretchVelocity += (1 - stroke.stretch) * 190 * dt - stroke.stretchVelocity * 13 * dt;
      stroke.stretch += stroke.stretchVelocity * dt;
      // The stroke is a whisker: it leans away from a nearby pointer and twangs when swept.
      const baseX = stroke.mesh.position.x, baseY = stroke.mesh.position.y, angle = stroke.mesh.rotation.z;
      const relX = pointerWorld.x - baseX, relY = pointerWorld.y - baseY;
      const along = relX * Math.cos(angle) + relY * Math.sin(angle), across = -relX * Math.sin(angle) + relY * Math.cos(angle);
      const near = pointer.seen ? clamp01(1 - Math.hypot(Math.max(0, Math.abs(along - stroke.length / 2) - stroke.length / 2), across) / .3) : 0;
      const push = near * -Math.sign(across || 1) * .17;
      const touching = near > .35, swept = near > 0 && pointer.speed > .004 && Math.sign(across) !== Math.sign(stroke.lastAcross || across);
      if (swept || (touching && !stroke.touching)) {
        stroke.pluck = Math.min(.15, .05 + pointer.speed * 1.6);
        stroke.glow = 1;
        onStrum?.(bell.strokes.indexOf(stroke));
      }
      stroke.touching = touching;
      stroke.lastAcross = across;
      // Colour and weight: the shift's own colour at rest, flashing on its beat and held while the pointer is on it.
      const hover = near > .2 ? 1 : 0;
      if (Math.abs(hover - stroke.hover) > .01 || stroke.glow > .01) moving = true;
      stroke.hover += (hover - stroke.hover) * (1 - Math.exp(-dt * 16));
      stroke.glow *= Math.exp(-dt * 6.5);
      stroke.base.lerp(stroke.target, 1 - Math.exp(-dt * 9));
      u.uColor.value.copy(stroke.base).lerp(stroke.hot, Math.max(stroke.hover, stroke.glow * .85));
      u.uWidth.value = stroke.width * (1 + stroke.hover * .24 + stroke.glow * .2);
      stroke.bendVelocity += (push - stroke.bend) * 150 * dt - stroke.bendVelocity * 11 * dt;
      stroke.bend += stroke.bendVelocity * dt;
      stroke.pluck *= Math.exp(-dt * 4.1);
      u.uStretch.value = Math.max(.5, stroke.stretch); u.uBend.value = stroke.bend;
      u.uPluck.value = stroke.pluck; u.uPluckPhase.value = stroke.phase;
      if (stroke.pluck > .002 || Math.abs(stroke.stretchVelocity) > .01 || Math.abs(stroke.bendVelocity) > .004) moving = true;
    }
    return moving;
  }

  // While the curtain is down only the cloth is awake.
  function updateClosed(now, dt) {
    smooth.x += ((pointer.seen ? pointer.x : 0) - smooth.x) * (1 - Math.exp(-dt * 4));
    smooth.y += ((pointer.seen ? pointer.y : 0) - smooth.y) * (1 - Math.exp(-dt * 4));
    aimCamera(smooth.x * .035, -smooth.y * .012);
    shared.uLight.value.set(-.58 + smooth.x * .62, .66 + smooth.y * .34, .62).normalize();
    shared.uMatShift.value.set(-smooth.x * .05, -smooth.y * .04);
    peek += (peekGoal - peek) * (1 - Math.exp(-dt * 7));
    give += ((pointer.seen ? 1 : 0) - give) * (1 - Math.exp(-dt * 6));
    const u = drape.uniforms;
    // How fast the hand is crossing the cloth: it rises at once and takes a while to settle.
    const crossing = Math.min(1, Math.hypot(pointerDrape.x - lastDrape.x, pointerDrape.y - lastDrape.y) / Math.max(dt, .008) * .16);
    lastDrape.copy(pointerDrape);
    stir += (crossing - stir) * (1 - Math.exp(-dt * (crossing > stir ? 12 : 1.5)));
    u.uStir.value = stir;
    u.uOpen.value = peek; u.uClock.value = now / 1000; u.uPress.value.set(pointerDrape.x, pointerDrape.y, give);
    drape.warmth(clamp01(peek / .05));
    const signMoving = sign.update(now, dt);
    return signMoving || stir > .01 || Math.abs(peekGoal - peek) > .001 || Math.abs((pointer.seen ? 1 : 0) - give) > .01;
  }

  function update(now, dt) {
    let moving = false;
    ambient = false;
    const idle = now - pointer.lastInput > 3200;
    const wander = idle ? { x: Math.sin(now * .00053) * .55, y: Math.sin(now * .00037 + 1) * .4 } : pointer;
    smooth.x += (wander.x - smooth.x) * (1 - Math.exp(-dt * 5.2));
    smooth.y += (wander.y - smooth.y) * (1 - Math.exp(-dt * 5.2));
    if (Math.abs(wander.x - smooth.x) + Math.abs(wander.y - smooth.y) > .002) ambient = true;
    aimCamera(smooth.x * .05, -smooth.y * .018);

    // Light follows the pointer, so the painted highlight and the pencil shadow both travel.
    shared.uLight.value.set(-.58 + smooth.x * .62, .66 + smooth.y * .34, .62).normalize();
    shared.uMatShift.value.set(-smooth.x * .05, -smooth.y * .04);

    // The star tracks the pointer across the dome, slightly under-damped so it arrives with life.
    if (!launch) {
      const az = smooth.x * .66 + (wander.x - smooth.x) * .4, el = .62 + smooth.y * .36 + (wander.y - smooth.y) * .3;
      if (step(starAz, az, 62, 8.8, dt)) moving = true;
      if (step(starEl, el, 62, 8.8, dt)) moving = true;
      bell.starUniforms.uStar.value.set(starAz.value, starEl.value, -starAz.velocity * .05 - starAz.value * .32);
      if (step(starHop, 0, 150, 9, dt)) moving = true;
      bell.starUniforms.uStarLift.value = Math.max(0, starHop.value) * .08;
      bell.starUniforms.uStarScale.value = 1 + Math.max(0, starHop.value) * .1 + Math.min(.07, Math.hypot(starAz.velocity, starEl.velocity) * .03);
    } else {
      const t = clamp01((now - launch.start) / 300);
      const k = easeOutCubic(t);
      bell.starUniforms.uStar.value.set(starAz.value, starEl.value, -starAz.value * .32 + k * 2.4);
      bell.starUniforms.uStarLift.value = k * .55;
      bell.starUniforms.uStarScale.value = 1 + k * .75;
      moving = true;
      if (t >= 1 && !launch.fired) {
        launch.fired = true;
        const anchor = starAnchor();
        bell.starMesh.visible = bell.starInk.visible = false;
        launch.resolve(anchor);
      }
    }

    // With nobody touching it the star only drifts, which doesn't need every frame.
    if (idle && !launch && moving) { ambient = true; moving = false; }
    bell.tilt.rotation.y = smooth.x * .075; bell.tilt.rotation.x = -smooth.y * .03;

    // Button, spring and the strike: the button must really bottom out before the dome answers.
    if (now >= pressReleaseAt && !pressing && !impactArmed) { pressTarget = 0; pressReleaseAt = Infinity; }
    // A real press keeps the frame rate up through activeUntil; the idle invitation below doesn't need it.
    if (step(buttonState, pressTarget, pressTarget ? 720 : 300, pressTarget ? 34 : 15, dt)) ambient = true;
    if (impactArmed && buttonState.value > .72) impact(now);
    const travel = buttonState.value * .17;
    if (step(squash, 0, 430, 15, dt)) moving = true;
    const age = impactAt === -Infinity ? 99 : (now - impactAt) / 1000;
    const heldFrame = Math.floor(age * 24) / 24;
    const decay = age >= 0 && age < 99 ? Math.exp(-age / .42) : 0;
    const oval = .085 * decay, rock = .032 * decay * Math.sin(heldFrame * 44);
    const u = bell.shellUniforms;
    u.uSquash.value = squash.value * .17; u.uOval.value = oval * Math.sin(heldFrame * 66); u.uOvalPhase.value = .4;
    bell.shell.rotation.z = rock;
    bell.crown.position.y = -u.uSquash.value * .9;
    bell.plunger.position.y = bell.crown.position.y;
    bell.plunger.rotation.z = rock * 1.4;
    bell.post.position.y = -travel;
    bell.springPivot.scale.y = Math.max(.25, 1 - travel / .22);
    const flash = Math.exp(-Math.max(0, now - impactAt) / 70) * (now > impactAt ? 1 : 0);
    for (const material of Object.values(bell.materials)) material.uniforms.uFlash.value = flash * .85;
    if (decay > .01) moving = true;

    // The wall keeps time. Before there is sound it only rehearses, softly, on the same chart.
    const chart = beats?.map?.();
    if (chart) {
      const playing = beats.time();
      const position = playing ?? (now / 1000) % chart.duration;
      if (position < beatCursor) { for (const event of chart.events) if (event.t > beatCursor) fireBeat(event, playing !== null); beatCursor = -1; }
      for (const event of chart.events) if (event.t > beatCursor && event.t <= position) fireBeat(event, playing !== null);
      beatCursor = position;
      if (playing !== null) ambient = true;
    }
    if (props.update(dt)) ambient = true;
    top.uniforms.uLamp.value.z = .12 + props.lit * .34;
    // Until someone rings, the plunger gives a small hopeful bounce now and then.
    if (shiftIndex <= 0 && !pressing && minuteTicks < 1 && assembly.start === Infinity && now - lastInvite > 3600) {
      lastInvite = now; buttonState.velocity -= 1.5; ambient = true;
    }
    if (updateStrokes(now, dt)) ambient = true;
    if (racks.update(Math.min(dt, 1 / 30), now)) ambient = true;

    // Paper wave and the rays turning behind it.
    const waveAge = (now - waveStart) / 860;
    const maxRadius = Math.hypot(view.width, view.height) * view.dpr * 1.06;
    if (waveAge >= 0 && waveAge < 1) {
      const radius = maxRadius * (.015 + .985 * (1 - (1 - waveAge) ** 2.6));
      wall.uniforms.uWave.value = radius;
      wall.uniforms.uRotNew.value = waveFrom + (rayBase - waveFrom) * easeOutBack(clamp01(waveAge * 1.25));
      stars.uniforms.uWave.value = radius;
      top.uniforms.uRipple.value = waveAge * 5.2; top.uniforms.uRippleAlpha.value = (1 - waveAge) ** 1.6;
      moving = true;
    } else if (waveAge >= 1) {
      wall.uniforms.uWave.value = maxRadius * 1.3; wall.uniforms.uRotNew.value = rayBase; stars.uniforms.uWave.value = -99999; top.uniforms.uRippleAlpha.value = 0;
    }

    if (step(clockPulse, 1, 210, 11, dt)) ambient = true;
    clock.group.scale.setScalar(view.clockRadius * clockPulse.value);
    const date = new Date();
    const second = date.getSeconds();
    if (second !== lastSecond) { lastSecond = second; activeUntil = Math.max(activeUntil, now + 150); }
    const tickAge = (date.getMilliseconds()) / 1000;
    const tick = second + Math.min(1, easeOutBack(clamp01(tickAge * 7)));
    clock.second.rotation.z = -tick / 60 * Math.PI * 2;
    // Minutes to midnight: each ring moves the hands on one minute.
    const minuteTarget = minutesToMidnight() / 60 * Math.PI * 2;
    if (step(minuteHand, minuteTarget, 320, 15, dt)) moving = true;
    clock.minute.rotation.z = minuteHand.value;
    clock.hour.rotation.z = minuteHand.value / 12;

    sway.value *= Math.exp(-dt * 2.3); sway.phase += dt * 9;
    curtain.uniforms.uSway.value = sway.value; curtain.uniforms.uSwayPhase.value = sway.phase;
    if (sway.value > .01) moving = true;

    for (const item of Object.values(actors)) {
      const goal = item.target === 'show' ? 1 : 0;
      if (step(item.rise, goal, goal ? 120 : 260, goal ? 12 : 24, dt)) moving = true;
      item.mesh.visible = item.rise.value > .01;
      if (step(item.together, activeCast.length > 1 ? 1 : 0, 70, 14, dt)) moving = true;
      const hop = clamp01(item.together.value), { lerp } = THREE.MathUtils;
      const size = lerp(1, item.trio.scale, hop), feet = lerp(item.feetY, item.trio.feetY, hop) + Math.sin(hop * Math.PI) * (item.trio.scale < 1 ? .9 : 0);
      item.pop *= Math.exp(-dt * 15);
      const tall = item.height * size * (1 - item.pop);
      item.mesh.scale.set(item.width * size * (1 + item.pop * .5), tall, 1);
      item.mesh.position.set(lerp(item.restX, item.trioX, hop), lerp(feet - tall * .68, feet + tall / 2, item.rise.value), lerp(ACTOR_Z, item.trio.z, hop));
      item.mesh.rotation.z = (1 - item.rise.value) * item.lean;
    }

    if (assembly.start !== Infinity) {
      const t = (now - assembly.start) / 1000;
      const rise = name => easeOutBack(clamp01((t - name) / .46));
      clock.group.position.y = view.clockY - (1 - rise(.05)) * view.clockRadius * 2.2;
      racks.group.position.x = 0; racks.group.position.y = -(1 - rise(.14)) * (view.viewHeight * 1.05);
      // The fall runs on wall time, so a slow first frame cannot leave the bell hanging in the air.
      const fall = Math.max(0, t - .36);
      drop.value = Math.max(0, 6 - 17 * fall * fall);
      if (drop.value <= 0 && !assembly.landed) { assembly.landed = true; impact(now, true); squash.velocity += 1.1; onLand?.(); }
      bell.root.position.y = Math.max(0, drop.value);
      if (t > 1.3) { assembly.start = Infinity; reportPhase?.('settled'); }
      moving = true;
    }
    if (drapeAt !== Infinity) {
      const run = clamp01((now - drapeAt) / 1000 / DRAPE_SECONDS);
      drape.uniforms.uOpen.value = Math.max(peek, run); drape.uniforms.uClock.value = now / 1000;
      drape.glow.visible = run < .06;
      stageLight.uStageLight.value = 1 - clamp01(run * 1.5);
      sign.lift(clamp01(run * 1.9));
      sign.update(now, dt);
      if (run >= 1) {
        // It never comes back, so its cloth and the sign's large textures can go.
        drapeAt = Infinity; curtainGone = true;
        scene.remove(drape.group, sign.group, sign.lip);
        drape.dispose(); sign.dispose();
      }
      moving = true;
    }
    for (let i = pending.length - 1; i >= 0; i--) if (now >= pending[i].at) { pending[i].run(); pending.splice(i, 1); }
    return moving;
  }

  function starAnchor() {
    const az = starAz.value, el = starEl.value;
    const local = new THREE.Vector3(1.03 * Math.cos(el) * Math.sin(az), .3 + .94 * Math.sin(el), 1.03 * Math.cos(el) * Math.cos(az));
    const centre = project(local.x, local.y, local.z);
    const tip = project(local.x, local.y + .46 * bell.starUniforms.uStarScale.value, local.z);
    return { x: centre.x, y: centre.y, radius: Math.abs(centre.y - tip.y), rotation: bell.starUniforms.uStar.value.z };
  }

  function paint(now) {
    if (disposed) return;
    const t = Math.floor(now / 195);
    shared.uBoil.value = t % 3;
    if (!closed) {
      syncPlate();
      if (plaque && plateBoil !== t % 3) { plateBoil = t % 3; plaque.dataset.boil = plateBoil; }
    }
    renderer.render(scene, camera);
    lastPaint = now;
  }

  function requestPaint() { if (!frame && !disposed) frame = requestAnimationFrame(loop); }
  function loop(now) {
    frame = 0;
    if (disposed) return;
    const dt = Math.min(.05, Math.max(.001, (now - last) / 1000)); last = now;
    const moving = closed ? updateClosed(now, dt) : update(now, dt);
    if (moving) activeUntil = Math.max(activeUntil, now + 180);
    // If the machine cannot keep up, trade resolution for motion rather than the other way round.
    const gap = now - lastFrameAt; lastFrameAt = now;
    if (now < activeUntil && gap < 200) slowFrames = gap > 36 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 40 && view.pixelBudget > 1.1e6) { slowFrames = 0; view.pixelBudget *= .68; applyResolution(); }
    // Three speeds: 60fps at most while something is really moving, half that for the band's lights and the drifting
    // star, and a resting drawing, the closed curtain included, redrawn on threes like the rest of the site's boil.
    const since = now - lastPaint;
    // The sign rocks smoothly once the page beneath has finished loading; until then the curtain must not compete with it.
    const curtainFrame = closed && document.readyState === 'complete' ? 48 : 190;
    if (!warming && (now < activeUntil ? since >= 14 : ambient && !closed ? since >= 31 : since >= curtainFrame)) paint(now);
    if (!document.hidden) requestPaint();
  }

  function onPointerMove(event) {
    const bounds = host.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width * 2 - 1, y = 1 - (event.clientY - bounds.top) / bounds.height * 2;
    const dx = x - pointer.x, dy = y - pointer.y;
    pointer.speed = Math.hypot(dx, dy);
    pointer.x = x; pointer.y = y; pointer.lastInput = performance.now(); pointer.seen = true;
    if (closed) {
      onPlane(x, y, DRAPE_Z, pointerDrape);
      activeUntil = pointer.lastInput + 400;
      requestPaint();
      return;
    }
    onPlane(x, y, .28, pointerWorld);
    const rackPoint = new THREE.Vector3();
    onPlane(x, y, CLOCK_Z - .18, rackPoint);
    racks.brush(rackPoint.x / view.rackScale, rackPoint.y / view.rackScale, dx * 90);
    const base = project(0, 0, 0), crown = project(0, 1.78, 0), wide = project(1.4, .6, 0);
    const rx = wide.x - base.x, ry = (base.y - crown.y) / 2, cy = (base.y + crown.y) / 2;
    hoverBell = ((event.clientX - bounds.left - base.x) / rx) ** 2 + ((event.clientY - bounds.top - cy) / ry) ** 2 < 1;
    renderer.domElement.style.cursor = hoverBell ? 'pointer' : '';
    activeUntil = pointer.lastInput + 900;
    requestPaint();
  }
  // Whoever has answered will play for you if you tap them.
  function actorUnder(event) {
    const bounds = host.getBoundingClientRect(), x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    for (const who of [...activeCast].reverse()) {
      const { mesh } = actors[who] ?? {};
      if (!mesh?.visible) continue;
      const low = project(mesh.position.x - mesh.scale.x / 2, mesh.position.y - mesh.scale.y / 2, mesh.position.z), high = project(mesh.position.x + mesh.scale.x / 2, mesh.position.y + mesh.scale.y / 2, mesh.position.z);
      if (x > low.x && x < high.x && y < low.y && y > high.y) return who;
    }
    return null;
  }
  function onPointerDown(event) {
    if (event.button || closed) return;
    if (!hoverBellAt(event)) {
      const who = actorUnder(event);
      if (!who) return;
      const item = actors[who], known = POSE_CYCLE[who].filter(pose => item.poses[pose]);
      item.step = (item.step + 1) % known.length; item.pose = known[item.step]; item.pop = .08;
      applyPose(item); activeUntil = performance.now() + 500; requestPaint();
      onActorTap?.(who);
      return;
    }
    event.preventDefault();
    press(true);
    renderer.domElement.setPointerCapture?.(event.pointerId);
  }
  function hoverBellAt(event) { onPointerMove(event); return hoverBell; }
  function onPointerUp() { if (pressing) release(); }
  function onLeave() { pointer.seen = false; pointer.x = 0; pointer.y = 0; pointerWorld.set(0, 0, -99); activeUntil = performance.now() + 700; requestPaint(); }
  const events = { pointerdown: onPointerDown, pointerup: onPointerUp, pointercancel: onPointerUp };
  for (const [name, listener] of Object.entries(events)) renderer.domElement.addEventListener(name, listener);
  // Bound to the door itself so the sign's invisible hit area and the plaque don't blind the scene to the pointer.
  host.addEventListener('pointermove', onPointerMove); host.addEventListener('pointerleave', onLeave);
  const contextLost = event => { event.preventDefault(); host.dispatchEvent(new CustomEvent('opening-error')); };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const resizeObserver = new ResizeObserver(() => {
    if (Math.abs(host.clientWidth - view.width) < 1 && Math.abs(host.clientHeight - view.height) < 1) return;
    // A phone's collapsing address bar fires this many times; rebuild the set once it has settled.
    clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 140);
  });
  const visibility = () => { if (!document.hidden) { last = performance.now(); requestPaint(); } };
  document.addEventListener('visibilitychange', visibility);

  function poseTexture(cut) {
    const texture = new THREE.CanvasTexture(cut);
    texture.premultiplyAlpha = true; texture.anisotropy = 4; texture.minFilter = THREE.LinearMipmapLinearFilter;
    textures.push(texture);
    return { texture, width: cut.width, height: cut.height };
  }
  async function loadActors() {
    const split = await castPose('action-2');
    if (disposed) return;
    for (const [who, cut] of Object.entries(split)) {
      const play = poseTexture(cut);
      const material = plateMaterial(shared, play.texture, { boil: .0007 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      mesh.visible = false; mesh.renderOrder = 1;
      stage.add(mesh);
      actors[who] = { mesh, material, poses: { play }, pose: 'play', step: 0, pop: 0, rise: { value: 0, velocity: 0 }, together: { value: 0, velocity: 0 }, target: 'hide', lean: who === 'lyly' ? -.1 : .1 };
    }
    placeActors();
  }
  // Called once the overture has cut the other pose sheets, so nothing here costs extra.
  async function learnPoses() {
    for (const [pose, sheet] of [['big', 'action-3'], ['stop', 'action-1']]) {
      const split = await castPose(sheet);
      if (disposed) return;
      for (const [who, cut] of Object.entries(split)) {
        if (!actors[who]) continue;
        actors[who].poses[pose] = poseTexture(cut);
        renderer.initTexture(actors[who].poses[pose].texture);
        await new Promise(resolve => setTimeout(resolve, 0));
        if (disposed) return;
      }
    }
  }

  function dispose() {
    if (fleckUrl) URL.revokeObjectURL(fleckUrl);
    if (disposed) return;
    disposed = true; cancelAnimationFrame(frame); resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    for (const [name, listener] of Object.entries(events)) renderer.domElement.removeEventListener(name, listener);
    host.removeEventListener('pointermove', onPointerMove); host.removeEventListener('pointerleave', onLeave);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    for (const item of Object.values(actors)) { item.mesh.geometry.dispose(); item.material.dispose(); }
    textures.forEach(texture => texture.dispose());
    clearTimeout(resizeTimer);
    props.dispose(); wall.dispose(); hoop.dispose(); stars.dispose(); clock.dispose(); racks.dispose(); curtain.dispose(); if (!curtainGone) { drape.dispose(); sign.dispose(); } top.dispose(); front.dispose(); bell.dispose(); kit.dispose();
    renderer.dispose(); renderer.domElement.remove();
  }

  // Compile every shader and upload every buffer behind the curtain, so the first frame of the reveal has nothing left to do.
  async function warmUp() {
    const cast = Object.values(actors);
    const show = visible => { stage.visible = visible; cast.forEach(item => { item.mesh.visible = visible; }); };
    show(true);
    if (renderer.extensions.has('KHR_parallel_shader_compile')) {
      const compiling = renderer.compileAsync(scene, camera).catch(() => {});
      show(false);
      // A slow machine finishes compiling on first use instead of keeping the curtain down.
      await Promise.race([compiling, new Promise(resolve => setTimeout(resolve, 2500))]);
    } else {
      // No background compiling here, so the first question put to any program waits for all the ones queued before it. Hand them over one material at a time and give the page a turn
      // in between, so a slow machine's curtain still answers the hand instead of freezing for seconds. The curtain stands still meanwhile, or its frames would wait for the compiler too.
      warming = true;
      const seen = new Set(), parts = [];
      scene.traverse(object => { if (object.isMesh && object.material && !seen.has(object.material)) { seen.add(object.material); parts.push(object); } });
      for (const part of parts) {
        renderer.compile(part, camera, scene);
        renderer.info.programs.at(-1)?.getUniforms();
        await new Promise(resolve => setTimeout(resolve, 0));
        if (disposed) return;
      }
      warming = false;
      show(false);
    }
    if (disposed) return;
    show(true);
    renderer.setScissorTest(true); renderer.setScissor(0, 0, 1, 1);
    renderer.render(scene, camera);
    renderer.setScissorTest(false);
    show(false);
    // That draw cleared the canvas, so put the curtain straight back before the browser can show the gap.
    paint(performance.now());
  }
  function raise() {
    if (!closed || disposed) return;
    closed = false; stage.visible = true;
    const now = performance.now();
    drapeAt = now; assembly.start = now + BELL_WAIT; sway.value = .7; last = now;
    host.dataset.phase = 'rising';
    activeUntil = now + 2600; requestPaint();
  }

  try {
    host.prepend(renderer.domElement);
    layout();
    resizeObserver.observe(host);
    last = performance.now();
    sign.enter(last); activeUntil = last + 900;
    requestPaint();
    const ready = (async () => {
      // A slow pose sheet shouldn't keep the curtain down; the actors can still join later.
      const actorsLoaded = loadActors().catch(() => {});
      await Promise.race([actorsLoaded, new Promise(resolve => setTimeout(resolve, 2500))]);
      await warmUp();
    })();
    return {
      ready, raise,
      // Hands the GPU's memory back at once, but blocks while it does, so it waits until nothing is animating.
      loseContext() { renderer.forceContextLoss(); },
      peek(amount) { peekGoal = amount; sign.hover(amount > 0); activeUntil = performance.now() + 900; requestPaint(); },
      pull() { sign.pull(performance.now()); activeUntil = performance.now() + 600; requestPaint(); },
      ring: () => press(false), press: () => press(true), release,
      learnPoses,
      pulse: (event, intensity = 1) => { racks.pulse(event, intensity); activeUntil = performance.now() + 500; requestPaint(); },
      launchStar() {
        if (launch) return launch.promise;
        let resolve; const promise = new Promise(done => { resolve = done; });
        entering = true; midnight = true;
        press(false);
        launch = { start: performance.now() + 130, resolve, promise };
        activeUntil = performance.now() + 2000; requestPaint();
        return promise;
      },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
}
