// Shared page chrome: logo marks, the nav menu and its solid-on-scroll state.
import { logoMark } from './logo'

export function setupChrome(): { closeMenu: () => void } {
  document.querySelectorAll<HTMLElement>('[data-logo]').forEach((el) => (el.innerHTML = logoMark()))

  const nav = document.querySelector<HTMLElement>('[data-nav]')!
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!
  const menu = document.querySelector<HTMLElement>('[data-menu]')!
  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false')
    toggle.firstElementChild!.textContent = 'Menu'
    menu.hidden = true
    document.body.classList.remove('menu-open')
  }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true'
    toggle.setAttribute('aria-expanded', String(open))
    toggle.firstElementChild!.textContent = open ? 'Close' : 'Menu'
    menu.hidden = !open
    document.body.classList.toggle('menu-open', open)
  })
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu))
  window.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu())

  const onScroll = () => nav.classList.toggle('is-solid', window.scrollY > 8)
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  return { closeMenu }
}
