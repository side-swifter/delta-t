// The rig, in 3D. A procedural model of the Delta-T test rack, animated by the same toy
// model that drives the readouts: fans spin at the controller's fan speed, coolant moves
// at the pump's speed, and the air warms as it crosses the heaters.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export interface RigVisualState {
  fan: number // 0..1 fan speed
  liquid: number // 0..1 share of heat on the liquid loop
  load: number // 0..1 server load
}

export interface RigScene {
  setChapter(c: number): void
  setState(s: RigVisualState): void
  setActive(on: boolean): void
}

interface Shot { pos: THREE.Vector3; target: THREE.Vector3 }
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

// One camera shot per chapter of the scroll story.
const SHOTS: Shot[] = [
  { pos: v(2.35, 1.6, 2.75), target: v(0.1, 0.6, 0) }, // the rack
  { pos: v(-1.6, 1.45, -1.95), target: v(0.0, 0.6, -0.02) }, // heaters and cold plates, from the open back
  { pos: v(0.5, 0.72, 2.45), target: v(0.0, 0.58, 0) }, // fan wall, head on
  { pos: v(2.8, 1.4, -0.7), target: v(0.3, 0.6, 0) }, // the liquid loop
  { pos: v(-2.3, 1.75, 2.1), target: v(0.0, 0.58, 0) }, // the controller
]

const TRAYS = [0.2, 0.4, 0.6, 0.8]
const COOL = new THREE.Color('#1a5cff')
const WARM = new THREE.Color('#ff6a2b')
const MID = new THREE.Color('#4f86ff')
const WARM_LIGHT = new THREE.Color('#ffa071')

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function createRig(canvas: HTMLCanvasElement, labelRoot: HTMLElement): RigScene | null {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.9

  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 30)

  const key = new THREE.DirectionalLight(0xffffff, 1.6)
  key.position.set(1.8, 3.2, 1.6)
  key.castShadow = true
  const small = Math.min(window.innerWidth, window.innerHeight) < 700
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048)
  key.shadow.camera.left = -1.4
  key.shadow.camera.right = 1.4
  key.shadow.camera.top = 1.4
  key.shadow.camera.bottom = -1.4
  key.shadow.radius = 6
  key.shadow.bias = -0.0004
  scene.add(key)

  // ---------- Materials ----------
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p)
  const M = {
    frame: std({ color: 0x1c1f25, metalness: 0.6, roughness: 0.42 }),
    alu: std({ color: 0xd3d7dd, metalness: 1, roughness: 0.3 }),
    aluDark: std({ color: 0x9ba2ac, metalness: 1, roughness: 0.42 }),
    sheet: std({ color: 0xeceef1, metalness: 0.15, roughness: 0.55 }),
    black: std({ color: 0x15171b, metalness: 0.1, roughness: 0.6 }),
    rubber: std({ color: 0x0d0e10, metalness: 0, roughness: 0.85 }),
    pcb: std({ color: 0x17351f, metalness: 0.1, roughness: 0.5 }),
    copper: std({ color: 0xc27a4a, metalness: 1, roughness: 0.35 }),
    ceramic: std({ color: 0xf3f1ea, metalness: 0, roughness: 0.75 }),
    led: std({ color: 0x1a5cff, emissive: 0x1a5cff, emissiveIntensity: 3 }),
    acrylic: new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.02, ior: 1.49, transparent: true,
    }),
    coolant: new THREE.MeshPhysicalMaterial({ color: 0x2f6bff, roughness: 0.15, transparent: true, opacity: 0.82, clearcoat: 1 }),
    droplet: new THREE.MeshPhysicalMaterial({ color: 0xe8f0ff, roughness: 0.02, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.9 }),
  }

  const root = new THREE.Group()
  scene.add(root)

  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D = root) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    parent.add(m)
    return m
  }
  const rbox = (w: number, h: number, d: number, r = 0.004) => new RoundedBoxGeometry(w, h, d, 2, r)

  // ---------- Ground ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.13 }))
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // ---------- Rack frame ----------
  const W = 0.6, H = 1.02, D = 0.6
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    mesh(rbox(0.032, H, 0.032, 0.003), M.frame, (sx * W) / 2, H / 2 + 0.03, (sz * D) / 2)
    mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.03, 20), M.rubber, (sx * W) / 2, 0.015, (sz * D) / 2)
  }
  for (const y of [0.05, H + 0.03]) {
    for (const sz of [-1, 1]) mesh(rbox(W, 0.026, 0.026, 0.003), M.frame, 0, y, (sz * D) / 2)
    for (const sx of [-1, 1]) mesh(rbox(0.026, 0.026, D, 0.003), M.frame, (sx * W) / 2, y, 0)
  }

  // Acrylic enclosure, drawn as quiet edges so it reads as glass without hiding the parts.
  const shell = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.32, 1.34, 0.92)),
    new THREE.LineBasicMaterial({ color: 0x9aa3b2, transparent: true, opacity: 0.35 }),
  )
  shell.position.set(0.04, 0.67, 0)
  root.add(shell)

  // ---------- Nodes: tray, heater block, then fins (air) or a cold plate (liquid) ----------
  const finGeo = new THREE.BoxGeometry(0.0035, 0.05, 0.13)
  const plateTops: THREE.Vector3[] = []
  TRAYS.forEach((y, i) => {
    mesh(rbox(W - 0.04, 0.012, D - 0.03, 0.003), M.sheet, 0, y, 0)
    for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.02, 0.02, D - 0.04), M.aluDark, sx * (W / 2 - 0.03), y + 0.012, 0)
    const blockY = y + 0.006 + 0.026
    mesh(rbox(0.2, 0.05, 0.15, 0.006), M.alu, 0, blockY, -0.02)
    // Two cartridge heaters entering from the back, with their leads.
    for (const sx of [-0.05, 0.05]) {
      const rod = mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.05, 16), M.copper, sx, blockY, -0.115)
      rod.rotation.x = Math.PI / 2
      const lead = mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.08, 8), M.black, sx, blockY, -0.18)
      lead.rotation.x = Math.PI / 2
    }
    if (i < 2) {
      const fins = new THREE.InstancedMesh(finGeo, M.aluDark, 14)
      const o = new THREE.Object3D()
      for (let k = 0; k < 14; k++) {
        o.position.set(-0.091 + k * 0.014, blockY + 0.05, -0.02)
        o.updateMatrix()
        fins.setMatrixAt(k, o.matrix)
      }
      root.add(fins)
    } else {
      const topY = blockY + 0.025 + 0.013
      mesh(rbox(0.19, 0.026, 0.15, 0.005), M.alu, 0, topY, -0.02)
      mesh(rbox(0.15, 0.006, 0.11, 0.002), M.black, 0, topY + 0.016, -0.02)
      for (const sx of [-0.05, 0.05]) mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.025, 20), M.black, sx, topY + 0.03, -0.065)
      plateTops.push(v(0, topY + 0.02, -0.02))
    }
  })

  // ---------- Fans ----------
  function makeFan(size: number) {
    const g = new THREE.Group()
    const s = size / 2
    const shape = new THREE.Shape()
    shape.moveTo(-s, -s); shape.lineTo(s, -s); shape.lineTo(s, s); shape.lineTo(-s, s); shape.lineTo(-s, -s)
    const hole = new THREE.Path()
    hole.absarc(0, 0, s * 0.92, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    const frame = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: size * 0.2, bevelEnabled: true, bevelSize: size * 0.012, bevelThickness: size * 0.012, bevelSegments: 2, curveSegments: 48 }),
      M.black,
    )
    frame.position.z = -size * 0.1
    g.add(frame)
    const rotor = new THREE.Group()
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.34, s * 0.34, size * 0.14, 32), M.black)
    hub.rotation.x = Math.PI / 2
    rotor.add(hub)
    const cap = new THREE.Mesh(new THREE.CircleGeometry(s * 0.2, 32), M.aluDark)
    cap.position.z = size * 0.071
    rotor.add(cap)
    const b = new THREE.Shape()
    const r0 = s * 0.3, r1 = s * 0.88
    b.moveTo(r0, -s * 0.1)
    b.quadraticCurveTo((r0 + r1) / 2, -s * 0.24, r1, -s * 0.02)
    b.quadraticCurveTo(r1 * 0.95, s * 0.26, (r0 + r1) / 2, s * 0.3)
    b.quadraticCurveTo(r0 * 1.2, s * 0.18, r0, s * 0.1)
    const bladeGeo = new THREE.ExtrudeGeometry(b, { depth: size * 0.012, bevelEnabled: false, curveSegments: 12 })
    for (let k = 0; k < 7; k++) {
      const arm = new THREE.Group()
      arm.rotation.z = (k / 7) * Math.PI * 2
      const blade = new THREE.Mesh(bladeGeo, M.rubber)
      blade.rotation.x = 0.42
      arm.add(blade)
      rotor.add(arm)
    }
    g.add(rotor)
    return { group: g, rotor }
  }

  const rotors: { rotor: THREE.Group; k: number }[] = []
  const FAN = 0.25
  for (const x of [-0.13, 0.13]) for (const y of [0.29, 0.54, 0.79]) {
    const f = makeFan(FAN)
    f.group.position.set(x, y, D / 2 + 0.03)
    root.add(f.group)
    rotors.push({ rotor: f.rotor, k: 1 })
  }

  // ---------- Radiator on the roof, with two fans pulling air up ----------
  const RY = H + 0.075
  mesh(rbox(0.46, 0.04, 0.22, 0.004), M.aluDark, 0, RY, 0)
  const radFins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0018, 0.036, 0.2), M.alu, 70)
  const o = new THREE.Object3D()
  for (let k = 0; k < 70; k++) {
    o.position.set(-0.22 + k * 0.0064, RY + 0.002, 0)
    o.updateMatrix()
    radFins.setMatrixAt(k, o.matrix)
  }
  root.add(radFins)
  for (const x of [-0.25, 0.25]) mesh(rbox(0.035, 0.05, 0.23, 0.006), M.black, x, RY, 0)
  for (const x of [-0.115, 0.115]) {
    const f = makeFan(0.2)
    f.group.rotation.x = -Math.PI / 2
    f.group.position.set(x, RY + 0.045, 0)
    root.add(f.group)
    rotors.push({ rotor: f.rotor, k: 0.8 })
  }

  // ---------- Liquid side: reservoir, DDC pump, Peltier chiller ----------
  const LX = 0.4
  // Reservoir: clear tube, coolant column, black caps.
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.24, 48, 1, true), M.acrylic, LX, 0.36, 0.2)
  const column = mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.2, 40), M.coolant, LX, 0.345, 0.2)
  for (const y of [0.235, 0.485]) mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.016, 48), M.black, LX, y, 0.2)
  // DDC pump under it.
  mesh(rbox(0.09, 0.05, 0.09, 0.008), M.black, LX, 0.2, 0.2)
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 32), M.aluDark, LX, 0.17, 0.2)
  mesh(rbox(0.12, 0.012, 0.12, 0.003), M.aluDark, LX, 0.168, 0.2)
  // Brackets back to the front post.
  for (const y of [0.17, 0.42]) mesh(new THREE.BoxGeometry(0.1, 0.012, 0.03), M.aluDark, LX - 0.05, y, 0.27)

  // Peltier stage: cold block, two TEC tiles, heatsink, small fan.
  const PY = 0.66, PZ = -0.17
  mesh(rbox(0.05, 0.11, 0.13, 0.005), M.alu, LX - 0.01, PY, PZ)
  for (const z of [-0.032, 0.032]) mesh(new THREE.BoxGeometry(0.006, 0.04, 0.04), M.ceramic, LX + 0.018, PY, PZ + z)
  mesh(new THREE.BoxGeometry(0.012, 0.11, 0.13), M.aluDark, LX + 0.027, PY, PZ)
  const hs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.11, 0.0025), M.alu, 16)
  for (let k = 0; k < 16; k++) {
    o.position.set(LX + 0.053, PY, PZ - 0.06 + k * 0.008)
    o.updateMatrix()
    hs.setMatrixAt(k, o.matrix)
  }
  root.add(hs)
  const pf = makeFan(0.1)
  pf.group.rotation.y = Math.PI / 2
  pf.group.position.set(LX + 0.085, PY, PZ)
  root.add(pf.group)
  rotors.push({ rotor: pf.rotor, k: 1.4 })
  mesh(new THREE.BoxGeometry(0.11, 0.014, 0.03), M.aluDark, LX - 0.06, PY + 0.06, -0.27)

  // ---------- Controller: ESP32-S3 and Pi 5 on a board by the left posts ----------
  const CX = -W / 2 - 0.07
  const board = new THREE.Group()
  board.position.set(CX, 0.62, 0.12)
  root.add(board)
  mesh(rbox(0.008, 0.16, 0.22, 0.002), M.pcb, 0, 0, 0, board)
  mesh(rbox(0.01, 0.06, 0.09, 0.002), M.black, -0.008, 0.035, -0.05, board) // Pi SoC + RAM area
  mesh(new THREE.BoxGeometry(0.008, 0.03, 0.03), M.alu, -0.008, 0.035, -0.05, board)
  mesh(rbox(0.01, 0.04, 0.06, 0.002), M.alu, -0.008, -0.045, 0.06, board) // ESP32-S3 module shield
  for (let k = 0; k < 3; k++) mesh(new THREE.BoxGeometry(0.018, 0.022, 0.02), M.aluDark, -0.01, -0.05, -0.085 + k * 0.03, board) // USB / ethernet
  mesh(new THREE.SphereGeometry(0.005, 16, 16), M.led, -0.008, 0.06, 0.09, board)
  for (const y of [-0.06, 0.06]) mesh(new THREE.BoxGeometry(0.07, 0.012, 0.02), M.aluDark, 0.035, y, 0.17, board)
  // SHT31 humidity sensor on the front top rail.
  mesh(rbox(0.03, 0.006, 0.02, 0.001), M.pcb, -0.2, H + 0.05, D / 2 + 0.005)

  // ---------- Tubing with flowing coolant ----------
  function flowTexture() {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 4
    const g = c.getContext('2d')!
    const grad = g.createLinearGradient(0, 0, 128, 0)
    grad.addColorStop(0, '#000')
    grad.addColorStop(0.45, '#000')
    grad.addColorStop(0.7, '#fff')
    grad.addColorStop(1, '#000')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 4)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  }
  const tubes: { mat: THREE.MeshPhysicalMaterial; tex: THREE.Texture; warm: number }[] = []
  function tube(points: THREE.Vector3[], warm: number) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
    const tex = flowTexture()
    tex.repeat.set(Math.max(1, Math.round(curve.getLength() / 0.06)), 1)
    const mat = new THREE.MeshPhysicalMaterial({
      color: COOL, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.92,
      emissive: warm > 0.6 ? 0xffd2bd : 0xb9cdff, emissiveMap: tex, emissiveIntensity: 0.45,
    })
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.0095, 14, false), mat)
    root.add(m)
    tubes.push({ mat, tex, warm })
  }
  const P3 = plateTops[0], P4 = plateTops[1]
  // pump -> chiller (cold)
  tube([v(LX, 0.2, 0.15), v(LX + 0.06, 0.24, 0.05), v(LX + 0.07, 0.45, -0.12), v(LX - 0.01, 0.6, -0.17)], 0)
  // chiller -> lower cold plate (cold)
  tube([v(LX - 0.01, 0.72, -0.17), v(0.24, 0.78, -0.2), v(0.12, 0.74, -0.12), v(0.05, P3.y + 0.025, -0.065)], 0)
  // lower plate -> upper plate (warming)
  tube([v(-0.05, P3.y + 0.025, -0.065), v(-0.17, P3.y + 0.06, -0.16), v(-0.17, P4.y - 0.02, -0.16), v(-0.05, P4.y + 0.025, -0.065)], 0.5)
  // upper plate -> radiator (warm)
  tube([v(0.05, P4.y + 0.025, -0.065), v(0.15, P4.y + 0.09, -0.14), v(0.28, RY - 0.01, -0.06), v(0.25, RY, -0.05)], 1)
  // radiator -> reservoir (cooled by the radiator, still above room temperature)
  tube([v(0.25, RY, 0.05), v(0.34, RY - 0.02, 0.08), v(LX + 0.04, 0.8, 0.2), v(LX, 0.5, 0.2)], 0.7)

  // ---------- Condensation on the cold plates (chapter 4 shows what goes wrong) ----------
  const DROPS = 90
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 10), M.droplet, DROPS)
  const dropSeed = Array.from({ length: DROPS }, (_, k) => ({
    p: plateTops[k % 2].clone().add(v((Math.random() - 0.5) * 0.18, -0.004 - Math.random() * 0.03, (Math.random() - 0.5) * 0.14)),
    r: 0.0025 + Math.random() * 0.0045,
    d: Math.random() * 0.6,
  }))
  root.add(drops)

  // ---------- Air: particles warm as they cross the heaters ----------
  const AIR = small ? 260 : 520
  const airPos = new Float32Array(AIR * 3)
  const airCol = new Float32Array(AIR * 3)
  const airSeed = new Float32Array(AIR)
  for (let k = 0; k < AIR; k++) {
    airPos[k * 3] = (Math.random() - 0.5) * 0.52
    airPos[k * 3 + 1] = 0.14 + Math.random() * 0.82
    airPos[k * 3 + 2] = 0.55 - Math.random() * 1.15
    airSeed[k] = 0.7 + Math.random() * 0.6
  }
  const airGeo = new THREE.BufferGeometry()
  airGeo.setAttribute('position', new THREE.BufferAttribute(airPos, 3))
  airGeo.setAttribute('color', new THREE.BufferAttribute(airCol, 3))
  const dot = document.createElement('canvas')
  dot.width = dot.height = 64
  const dg = dot.getContext('2d')!
  const rg = dg.createRadialGradient(32, 32, 0, 32, 32, 32)
  rg.addColorStop(0, 'rgba(255,255,255,1)')
  rg.addColorStop(1, 'rgba(255,255,255,0)')
  dg.fillStyle = rg
  dg.fillRect(0, 0, 64, 64)
  const airMat = new THREE.PointsMaterial({
    size: 0.022, map: new THREE.CanvasTexture(dot), vertexColors: true, transparent: true, opacity: 0.0, depthWrite: false,
  })
  const air = new THREE.Points(airGeo, airMat)
  root.add(air)

  root.traverse((ob) => {
    if ((ob as THREE.Mesh).isMesh && ob !== ground) {
      ob.castShadow = true
      ob.receiveShadow = true
    }
  })
  air.castShadow = false
  drops.castShadow = false

  // ---------- Labels ----------
  interface Label { el: HTMLElement; at: THREE.Vector3; from: number; to: number; w: number }
  const labels: Label[] = []
  const addLabel = (text: string, at: THREE.Vector3, from: number, to: number) => {
    const el = document.createElement('div')
    el.className = 'tag'
    el.innerHTML = `<i></i><span>${text}</span>`
    labelRoot.appendChild(el)
    labels.push({ el, at, from, to, w: 0 })
  }
  addLabel('Heater block · replays server load', v(0.05, TRAYS[1] + 0.035, -0.14), 0.6, 1.4)
  addLabel('Cold plate', v(-0.06, P4.y + 0.02, -0.09), 0.6, 1.4)
  addLabel('Fan wall · PWM fans', v(0.26, 0.6, D / 2 + 0.05), 1.6, 2.4)
  addLabel('Radiator', v(-0.2, RY + 0.03, 0.1), 1.6, 2.4)
  addLabel('Peltier chiller · 2 × TEC1-12706', v(LX + 0.06, PY + 0.06, PZ), 2.6, 3.4)
  addLabel('Reservoir', v(LX, 0.48, 0.25), 2.6, 3.4)
  addLabel('DDC pump', v(LX + 0.04, 0.2, 0.24), 2.6, 3.4)
  addLabel('ESP32-S3 + Raspberry Pi 5', v(CX, 0.7, 0.12), 3.6, 4.4)
  addLabel('SHT31 dew point sensor', v(-0.2, H + 0.06, D / 2), 3.6, 4.4)

  // ---------- Sizing ----------
  let width = 1, height = 1
  function resize() {
    width = canvas.clientWidth
    height = canvas.clientHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // On wide screens, slide the rig right of center so the copy has the left side.
    if (width > 900) camera.setViewOffset(width, height, -width * 0.17, 0, width, height)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(canvas)
  resize()

  // ---------- Loop ----------
  let chapter = 0
  let state: RigVisualState = { fan: 0.5, liquid: 0.6, load: 0.5 }
  let active = true
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2
  }, { passive: true })
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const camPos = new THREE.Vector3()
  const camTarget = new THREE.Vector3()
  const tmp = new THREE.Vector3()
  const sa = new THREE.Spherical(), sb = new THREE.Spherical(), sph = new THREE.Spherical()
  const clock = new THREE.Timer()
  let elapsed = 0

  function shot(c: number) {
    // Hold on each shot for most of a chapter, then move to the next.
    const i = Math.min(SHOTS.length - 1, Math.max(0, Math.floor(c + 0.2)))
    const f = smooth(0.35, 0.95, c + 0.2 - i)
    const a = SHOTS[i], b = SHOTS[Math.min(SHOTS.length - 1, i + 1)]
    camTarget.lerpVectors(a.target, b.target, f)
    sa.setFromVector3(tmp.subVectors(a.pos, a.target))
    sb.setFromVector3(tmp.subVectors(b.pos, b.target))
    let dTheta = sb.theta - sa.theta
    if (dTheta > Math.PI) dTheta -= Math.PI * 2
    if (dTheta < -Math.PI) dTheta += Math.PI * 2
    sph.set(
      THREE.MathUtils.lerp(sa.radius, sb.radius, f) * (1 + 0.12 * Math.sin(f * Math.PI)),
      THREE.MathUtils.lerp(sa.phi, sb.phi, f),
      sa.theta + dTheta * f,
    )
    camPos.setFromSpherical(sph).add(camTarget)
    const far = width < 700 ? 1.12 : 1
    camPos.sub(camTarget).multiplyScalar(far).add(camTarget)
  }

  function frame() {
    if (!active) return
    clock.update()
    const dt = Math.min(0.05, clock.getDelta())
    elapsed += dt
    const motion = reduce ? 0 : 1

    pointer.x += (pointer.tx - pointer.x) * 0.05
    pointer.y += (pointer.ty - pointer.y) * 0.05
    shot(chapter)
    camera.position.copy(camPos).add(tmp.set(pointer.x * 0.06, -pointer.y * 0.04, 0))
    camera.lookAt(camTarget)

    for (const r of rotors) r.rotor.rotation.z -= dt * motion * r.k * (3 + state.fan * 26)
    const pump = 0.25 + state.liquid * 1.3
    for (const t of tubes) {
      t.tex.offset.x -= dt * motion * pump
      if (t.warm > 0.6) t.mat.color.copy(WARM_LIGHT).lerp(WARM, state.load)
      else t.mat.color.copy(t.warm > 0 ? MID : COOL)
    }
    column.scale.y = 1 + Math.sin(elapsed * 2) * 0.01 * motion
    M.led.emissiveIntensity = 1.5 + 2 * (Math.sin(elapsed * 6) > 0 ? 1 : 0)

    // Air shows most in the fan chapter.
    airMat.opacity = 0.85 * (smooth(1.3, 1.9, chapter) * (1 - smooth(2.3, 2.9, chapter)))
    const airSpeed = (0.12 + state.fan * 0.55) * motion
    const c = new THREE.Color()
    for (let k = 0; k < AIR; k++) {
      let z = airPos[k * 3 + 2] - dt * airSpeed * airSeed[k]
      if (z < -0.6) z = 0.55
      airPos[k * 3 + 2] = z
      const heat = smooth(0.3, -0.25, z) * (0.35 + state.load * 0.65)
      c.copy(COOL).lerp(WARM, heat)
      airCol[k * 3] = c.r
      airCol[k * 3 + 1] = c.g
      airCol[k * 3 + 2] = c.b
    }
    airGeo.attributes.position.needsUpdate = true
    airGeo.attributes.color.needsUpdate = true

    // Beads form as the coolant is pushed below the dew point, then clear as the controller backs off.
    const wet = smooth(2.75, 3.05, chapter) * (1 - smooth(3.3, 3.6, chapter))
    for (let k = 0; k < DROPS; k++) {
      const s = dropSeed[k]
      const grow = smooth(s.d, s.d + 0.4, wet)
      o.position.copy(s.p)
      o.scale.setScalar(s.r * grow + 1e-5)
      o.updateMatrix()
      drops.setMatrixAt(k, o.matrix)
    }
    drops.instanceMatrix.needsUpdate = true

    renderer.render(scene, camera)

    // Labels follow their parts on screen.
    for (const l of labels) {
      const vis = smooth(l.from - 0.15, l.from + 0.1, chapter) * (1 - smooth(l.to - 0.1, l.to + 0.15, chapter))
      tmp.copy(l.at).project(camera)
      const x = (tmp.x * 0.5 + 0.5) * width
      const y = (-tmp.y * 0.5 + 0.5) * height
      l.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      if (vis > 0 && !l.w) l.w = (l.el.lastElementChild as HTMLElement).offsetWidth
      // Put the label on whichever side has room; hide it if neither does (small phones).
      const fitsRight = x + l.w + 48 <= width
      const fitsLeft = x - l.w - 48 >= 0
      l.el.classList.toggle('is-left', !fitsRight && fitsLeft)
      l.el.style.opacity = (fitsRight || fitsLeft ? vis : 0).toFixed(3)
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  return {
    setChapter(c) { chapter = c },
    setState(s) { state = s },
    setActive(on) {
      if (on === active) return
      active = on
      if (on) { clock.reset(); requestAnimationFrame(frame) }
    },
  }
}
