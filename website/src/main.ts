import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './styles/main.css'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import { logoMark } from './logo'
import trace from './data/trace.json'
import { RigSim, coolantFloor, dewPoint, fanPowerRatio, liquidShare, clamp, type RigState } from './physics'

gsap.registerPlugin(ScrollTrigger)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)]
const fmt = (v: number, d = 1) => v.toFixed(d)

// ---------- Logo ----------
$$('[data-logo]').forEach((el) => (el.innerHTML = logoMark()))

// ---------- Smooth scroll ----------
let lenis: Lenis | null = null
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.11 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis!.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}
$$<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href')!
    const target = id === '#top' ? document.body : document.querySelector(id)
    if (!target) return
    e.preventDefault()
    closeMenu()
    if (lenis) lenis.scrollTo(target as HTMLElement, { offset: id === '#top' ? 0 : -64 })
    else target.scrollIntoView()
  }),
)

// ---------- Nav ----------
const nav = $('[data-nav]')
const toggle = $<HTMLButtonElement>('[data-menu-toggle]')
const menu = $('[data-menu]')
function closeMenu() {
  toggle.setAttribute('aria-expanded', 'false')
  menu.hidden = true
}
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true'
  toggle.setAttribute('aria-expanded', String(open))
  menu.hidden = !open
})
const onScroll = () => nav.classList.toggle('is-solid', window.scrollY > 24)
window.addEventListener('scroll', onScroll, { passive: true })
onScroll()

// ---------- Hero: live rig model driven by the real server trace ----------
const r = (k: string) => $(`[data-r="${k}"]`)
const sim = new RigSim(trace.cpu)
const SPEED = 20 // trace seconds per real second
const WINDOW = 180 // trace seconds shown on the chart
const history: RigState[] = []
let simT = 0
let lastNow = performance.now()
let lastPaint = 0

function toPoints(key: 'chipC' | 'coolantC' | 'dewC', lo: number, hi: number): string {
  const t0 = simT - WINDOW
  return history
    .map((s) => `${(((s.t - t0) / WINDOW) * 360).toFixed(1)},${(140 - ((s[key] - lo) / (hi - lo)) * 140).toFixed(1)}`)
    .join(' ')
}

function paint(s: RigState) {
  const mm = Math.floor(s.t / 60) % 45
  const ss = Math.floor(s.t % 60)
  r('clock').textContent = `t = ${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  const liq = Math.round(s.liquid * 100)
  r('liq').textContent = String(liq)
  r('air').textContent = String(100 - liq)
  r('liqbar').style.flexBasis = `${liq}%`
  r('airbar').style.flexBasis = `${100 - liq}%`
  r('chip').textContent = fmt(s.chipC)
  r('cool').textContent = fmt(s.coolantC)
  r('dew').textContent = fmt(s.dewC)
  r('rh').textContent = fmt(s.rh, 0)
  r('cpu').textContent = fmt(s.cpu, 0)
  r('pw').textContent = fmt(s.coolingW)
  r('pchip').setAttribute('points', toPoints('chipC', 0, 75))
  r('pcool').setAttribute('points', toPoints('coolantC', 0, 75))
  r('pdew').setAttribute('points', toPoints('dewC', 0, 75))
}

// Warm up so the chart starts full.
for (let t = 0; t < WINDOW; t += 1) history.push(sim.step(t, 1))
simT = WINDOW

function tick(now: number) {
  const dt = Math.min(0.1, (now - lastNow) / 1000) * SPEED
  lastNow = now
  simT += dt
  history.push(sim.step(simT, dt))
  while (history.length && history[0].t < simT - WINDOW) history.shift()
  if (now - lastPaint > 80) {
    paint(history[history.length - 1])
    lastPaint = now
  }
  requestAnimationFrame(tick)
}
paint(history[history.length - 1])
if (!reduceMotion) requestAnimationFrame(tick)

// ---------- Dew point explorer ----------
const dewRoot = $('[data-dew]')
const tIn = $<HTMLInputElement>('#dew-temp')
const rhIn = $<HTMLInputElement>('#dew-rh')
const o = (k: string) => $(`[data-o="${k}"]`, dewRoot)
const pos = (c: number) => `${clamp((c / 40) * 100, 0, 100)}%`

function fillTrack(input: HTMLInputElement) {
  const p = ((Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100
  input.style.setProperty('--p', `${p}%`)
}

function updateDew() {
  const t = Number(tIn.value)
  const rh = Number(rhIn.value)
  const dew = dewPoint(t, rh)
  const floor = coolantFloor(t, rh)
  const liq = liquidShare(floor)
  o('t').textContent = `${fmt(t)} °C`
  o('rh').textContent = `${rh} %`
  o('dew').textContent = `${fmt(dew)}°`
  o('floor').textContent = `${fmt(floor)}°`
  o('liq').textContent = `${Math.round(liq * 100)}%`
  o('unsafe').style.width = pos(dew)
  o('mdew').style.left = pos(dew)
  o('mfloor').style.left = pos(floor)
  o('mroom').style.left = pos(t)
  o('note').innerHTML =
    floor > 12.05
      ? `At ${rh}% humidity the coolant can't go below <b>${fmt(floor)} °C</b> without risking condensation, so the fans have to carry about <b>${100 - Math.round(liq * 100)}%</b> of the heat.`
      : `The air is dry enough that the chiller's own limit (12 °C) binds first. The liquid loop can take about <b>${Math.round(liq * 100)}%</b> of the heat.`
  fillTrack(tIn)
  fillTrack(rhIn)
}
;[tIn, rhIn].forEach((el) =>
  el.addEventListener('input', () => {
    $$('.chip', dewRoot).forEach((c) => c.classList.remove('is-on'))
    updateDew()
  }),
)
$$<HTMLButtonElement>('[data-preset]', dewRoot).forEach((btn) =>
  btn.addEventListener('click', () => {
    const [t, rh] = btn.dataset.preset!.split(',').map(Number)
    tIn.value = String(t)
    rhIn.value = String(rh)
    $$('.chip', dewRoot).forEach((c) => c.classList.toggle('is-on', c === btn))
    updateDew()
  }),
)
updateDew()

// ---------- Fan cube law ----------
const fanRoot = $('[data-fan]')
const fanIn = $<HTMLInputElement>('#fan-speed')
const f = (k: string) => $(`[data-f="${k}"]`, fanRoot)
const X0 = 30, X1 = 310, Y0 = 170, Y1 = 10
const fx = (s: number) => X0 + s * (X1 - X0)
const fy = (p: number) => Y0 - p * (Y0 - Y1)
f('curve').setAttribute(
  'd',
  Array.from({ length: 61 }, (_, i) => i / 60)
    .map((s, i) => `${i ? 'L' : 'M'}${fx(s).toFixed(1)},${fy(fanPowerRatio(s)).toFixed(1)}`)
    .join(' '),
)
function updateFan() {
  const s = Number(fanIn.value) / 100
  const p = fanPowerRatio(s)
  const x = fx(s), y = fy(p)
  f('dot').setAttribute('cx', String(x))
  f('dot').setAttribute('cy', String(y))
  Object.entries({ x1: x, y1: Y0, x2: x, y2: y }).forEach(([k, v]) => f('gx').setAttribute(k, String(v)))
  Object.entries({ x1: X0, y1: y, x2: x, y2: y }).forEach(([k, v]) => f('gy').setAttribute(k, String(v)))
  f('speed').textContent = `${fanIn.value} %`
  const saving = Math.round((1 - p) * 100)
  f('saving').textContent = saving > 0 ? `−${saving}%` : '0%'
  fillTrack(fanIn)
}
fanIn.addEventListener('input', updateFan)
updateFan()

// ---------- Motion ----------
if (!reduceMotion) {
  // One orchestrated load moment: headline lines rise, then copy and panel follow.
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } })
  intro
    .from('[data-line]', { yPercent: 110, duration: 1.3, stagger: 0.12 })
    .from('.hero [data-rise]', { y: 24, opacity: 0, duration: 1, stagger: 0.08, clearProps: 'transform' }, '-=0.95')
    .from('[data-panel]', { y: 40, opacity: 0, duration: 1.2 }, '-=0.9')
    .from('.nav__inner > *', { opacity: 0, y: -8, duration: 0.8, stagger: 0.05, clearProps: 'transform' }, '-=1')

  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 36,
      opacity: 0,
      duration: 1.1,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    })
  })

  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count)
    const obj = { v: 0 }
    gsap.to(obj, {
      v: end,
      duration: 1.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = Math.round(obj.v).toLocaleString('en-US')),
    })
  })
}
