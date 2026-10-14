import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/ibm-plex-mono/400.css'
import './styles/main.css'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import { setupChrome } from './chrome'
import trace from './data/trace.json'
import { RigSim, coolantFloor, dewPoint, liquidShare, clamp, type RigState } from './physics'
import { createRig } from './scene'

gsap.registerPlugin(ScrollTrigger)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const touch = window.matchMedia('(pointer: coarse)').matches
const phone = window.matchMedia('(max-width: 900px)')
// Phone browsers resize the viewport as the address bar shows and hides; don't re-layout the story for that.
ScrollTrigger.config({ ignoreMobileResize: true })

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)]
const fmt = (v: number, d = 1) => v.toFixed(d)

const { closeMenu } = setupChrome()

// ---------- Phone panel: the story copy sits under the rig, one chapter at a time ----------
const panel = $('[data-panel]')
const panelCount = $('[data-panel-count]')
const panelItems = $$('.step__copy', $('.steps')).map((copy, i) => {
  const item = document.createElement('div')
  item.className = 'panel__item'
  item.append(copy.cloneNode(true))
  if (i === 0) item.classList.add('is-on')
  panel.append(item)
  return item
})
let panelOn = 0
function setPanel(i: number) {
  if (i === panelOn) return
  panelItems[panelOn].classList.remove('is-on')
  panelItems[i].classList.add('is-on')
  panelOn = i
  panelCount.textContent = i === 0 ? 'Scroll' : `${i} / ${panelItems.length - 1}`
}

// ---------- Smooth scroll ----------
let lenis: Lenis | null = null
// Native scrolling on touch screens: it's already smooth there, and Lenis fights the finger.
if (!reduceMotion && !touch) {
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
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }),
)


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
    setPanel(active)
  },
})

let storyOn = true
new IntersectionObserver(([entry]) => {
  storyOn = entry.isIntersecting
  rig?.setActive(storyOn)
}).observe(story)

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
  requestAnimationFrame(tick)
  if (!storyOn) {
    last = now
    return
  }
  const dt = Math.min(0.1, (now - last) / 1000) * SPEED
  last = now
  simT += dt
  s = sim.step(simT, dt)
  rig?.setState({ fan: s.fan, liquid: s.liquid, load: s.cpu / 100 })
  if (now - lastPaint > 120) {
    paint(s)
    lastPaint = now
  }
}
paint(s)
rig?.setState({ fan: s.fan, liquid: s.liquid, load: s.cpu / 100 })
if (!reduceMotion) requestAnimationFrame(tick)

// ---------- Dew point sentence ----------
const dewRoot = $('[data-dew]')
const tIn = $<HTMLInputElement>('#dew-temp')
const rhIn = $<HTMLInputElement>('#dew-rh')
const o = (k: string) => $(`[data-o="${k}"]`)
const pos = (c: number) => `${clamp((c / 40) * 100, 0, 100)}%`

function read(input: HTMLInputElement) {
  const v = clamp(Number(input.value) || 0, Number(input.min), Number(input.max))
  return v
}
function size(input: HTMLInputElement) {
  input.style.width = `${Math.max(2, input.value.length) + 0.2}ch`
}

function updateDew() {
  const t = read(tIn)
  const rh = read(rhIn)
  const dew = dewPoint(t, rh)
  const floor = coolantFloor(t, rh)
  const liq = Math.round(liquidShare(floor) * 100)
  o('dew').textContent = `${fmt(dew)} °C`
  o('floor').textContent = `${fmt(floor)} °C`
  o('liq').textContent = `${liq}%`
  o('unsafe').style.width = pos(dew)
  o('mfloor').style.left = pos(floor)
  o('mroom').style.left = pos(t)
  size(tIn)
  size(rhIn)
}
;[tIn, rhIn].forEach((el) => {
  el.addEventListener('input', updateDew)
  el.addEventListener('change', () => {
    el.value = String(read(el))
    updateDew()
  })
})
$$<HTMLButtonElement>('[data-step]', dewRoot).forEach((btn) =>
  btn.addEventListener('click', () => {
    const [k, d] = btn.dataset.step!.split(',')
    const el = k === 't' ? tIn : rhIn
    el.value = String(clamp(read(el) + Number(d), Number(el.min), Number(el.max)))
    updateDew()
  }),
)
$$<HTMLButtonElement>('[data-preset]').forEach((btn) =>
  btn.addEventListener('click', () => {
    const [t, rh] = btn.dataset.preset!.split(',')
    tIn.value = t
    rhIn.value = rh
    updateDew()
  }),
)
updateDew()

// ---------- Progress: week counter and today marker ----------
{
  const start = Date.UTC(2026, 8, 28)
  const end = Date.UTC(2027, 0, 10)
  const now = Date.now()
  const week = clamp(Math.floor((now - start) / (7 * 864e5)) + 1, 1, 8)
  $('[data-week]').textContent = String(week)
  const p = clamp((now - start) / (end - start), 0, 1) * 100
  $('[data-track-fill]').style.width = `${p}%`
  $('[data-track-now]').style.left = `${p}%`
}

// ---------- Motion: one entrance for the hero, then the story copy fades as it passes ----------
if (!reduceMotion) {
  gsap.from(phone.matches ? '.panel__item.is-on .step__copy > *' : '.step--hero .step__copy > *', { y: 18, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.07, delay: 0.1 })
  gsap.from('.readout', { opacity: 0, duration: 1, delay: 0.5 })
  if (!phone.matches) $$('.step:not(.step--hero) .step__copy').forEach((el) => {
    gsap.fromTo(el, { opacity: 0.15 }, {
      opacity: 1,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 55%', scrub: true },
    })
  })
}
