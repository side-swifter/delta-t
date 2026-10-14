import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './styles/main.css'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import { logoMark } from './logo'
import trace from './data/trace.json'
import { RigSim, coolantFloor, dewPoint, liquidShare, clamp, type RigState } from './physics'
import { createRig } from './scene'

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
  lenis = new Lenis({ lerp: 0.12 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis!.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}
$$<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href')!
    const target = id === '#top' ? document.body : document.querySelector<HTMLElement>(id)
    if (!target) return
    e.preventDefault()
    closeMenu()
    if (lenis) lenis.scrollTo(target, { offset: id === '#top' ? 0 : -56 })
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
const onScroll = () => nav.classList.toggle('is-solid', window.scrollY > 8)
window.addEventListener('scroll', onScroll, { passive: true })
onScroll()

// ---------- The rig: 3D model + readouts, both driven by the recorded server trace ----------
const story = $('[data-story]')
const rig = createRig($<HTMLCanvasElement>('[data-canvas]'), $('[data-tags]'))
if (!rig) {
  $('[data-fallback]').hidden = false
  $('[data-canvas]').hidden = true
}

const CHAPTERS = ['Overview', 'Heat', 'Air', 'Liquid', 'Control']
const chNum = $('[data-ch-num]')
const chName = $('[data-ch-name]')
let chapter = 0
ScrollTrigger.create({
  trigger: story,
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => {
    chapter = self.progress * (CHAPTERS.length - 1)
    rig?.setChapter(chapter)
    const active = Math.round(chapter)
    chNum.textContent = String(active).padStart(2, '0')
    chName.textContent = CHAPTERS[active]
  },
})

new IntersectionObserver(([entry]) => rig?.setActive(entry.isIntersecting)).observe(story)

const r = (k: string) => $(`[data-r="${k}"]`)
const sim = new RigSim(trace.cpu)
const SPEED = 20 // trace seconds per real second
let simT = 0
let last = performance.now()
let lastPaint = 0
let s: RigState = sim.step(0, 1)
for (let t = 1; t < 120; t++) s = sim.step(t, 1)
simT = 120

function paint(st: RigState) {
  const mm = Math.floor(st.t / 60) % 45
  const ss = Math.floor(st.t % 60)
  r('clock').textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  const liq = Math.round(st.liquid * 100)
  r('liq').textContent = String(liq)
  r('air').textContent = String(100 - liq)
  r('liqbar').style.flexBasis = `${liq}%`
  r('airbar').style.flexBasis = `${100 - liq}%`
  r('chip').textContent = fmt(st.chipC)
  r('cool').textContent = fmt(st.coolantC)
  r('dew').textContent = fmt(st.dewC)
  r('cpu').textContent = fmt(st.cpu, 0)
}

function tick(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000) * SPEED
  last = now
  simT += dt
  s = sim.step(simT, dt)
  rig?.setState({ fan: s.fan, liquid: s.liquid, load: s.cpu / 100 })
  if (now - lastPaint > 120) {
    paint(s)
    lastPaint = now
  }
  requestAnimationFrame(tick)
}
paint(s)
rig?.setState({ fan: s.fan, liquid: s.liquid, load: s.cpu / 100 })
if (!reduceMotion) requestAnimationFrame(tick)

// ---------- Dew point calculator ----------
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
  const liq = Math.round(liquidShare(floor) * 100)
  o('t').textContent = `${fmt(t)} °C`
  o('rh').textContent = `${rh} %`
  o('dew').textContent = `${fmt(dew)} °C`
  o('floor').textContent = `${fmt(floor)} °C`
  o('liq').textContent = `${liq} %`
  o('unsafe').style.width = pos(dew)
  o('mdew').style.left = pos(dew)
  o('mfloor').style.left = pos(floor)
  o('mroom').style.left = pos(t)
  o('note').innerHTML =
    floor > 12.05
      ? `Humid enough that condensation sets the limit. The coolant has to stay above <b>${fmt(floor)} °C</b>, so the fans carry about <b>${100 - liq}%</b> of the heat.`
      : `Dry enough that the chiller's own floor of 12 °C binds first. The liquid loop can take about <b>${liq}%</b> of the heat.`
  fillTrack(tIn)
  fillTrack(rhIn)
}
;[tIn, rhIn].forEach((el) =>
  el.addEventListener('input', () => {
    $$('.preset', dewRoot).forEach((c) => c.classList.remove('is-on'))
    updateDew()
  }),
)
$$<HTMLButtonElement>('[data-preset]', dewRoot).forEach((btn) =>
  btn.addEventListener('click', () => {
    const [t, rh] = btn.dataset.preset!.split(',').map(Number)
    tIn.value = String(t)
    rhIn.value = String(rh)
    $$('.preset', dewRoot).forEach((c) => c.classList.toggle('is-on', c === btn))
    updateDew()
  }),
)
updateDew()

// ---------- Motion: one entrance for the hero, then the story copy fades as it passes ----------
if (!reduceMotion) {
  gsap.from('.step--hero .step__copy > *', { y: 18, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.07, delay: 0.1 })
  gsap.from('.readout', { opacity: 0, duration: 1, delay: 0.5 })
  $$('.step:not(.step--hero) .step__copy').forEach((el) => {
    gsap.fromTo(el, { opacity: 0.15 }, {
      opacity: 1,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 55%', scrub: true },
    })
  })
}
