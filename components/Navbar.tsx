'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const links = [
  { href: '#home', label: 'Home' },
  { href: '#services', label: 'Services' },
  { href: '#contact', label: 'Contact' },
]

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
  else window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Paths under /dashboard where the user is authenticated and inside the
// barista tool — nav clutter (Home/Services/Contact + Dashboard CTA)
// would be noise. Login/unauthorized/callback stay outside this set so
// unauthenticated visitors can still reach marketing.
const PUBLIC_DASHBOARD_PATHS = new Set([
  '/dashboard/login',
  '/dashboard/unauthorized',
])
function isBaristaInside(pathname: string): boolean {
  if (!pathname.startsWith('/dashboard')) return false
  if (PUBLIC_DASHBOARD_PATHS.has(pathname)) return false
  if (pathname.startsWith('/dashboard/auth')) return false
  return true
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const onLanding = pathname === '/'
  const insideBarista = isBaristaInside(pathname)

  function handleNav(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    setOpen(false)
    if (onLanding) {
      scrollTo(id)
    } else {
      router.push(`/#${id}`)
    }
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        background: 'rgba(253,250,245,0.82)',
        borderBottom: '1px solid rgba(26,24,21,0.07)',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 16px' }}>
        <nav style={{ minHeight: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          {/* Brand */}
          <a href="#home" onClick={e => handleNav(e, 'home')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, letterSpacing: '-0.03em', fontSize: '1.45rem', textDecoration: 'none', color: '#1A1815' }}>
            <svg width="48" height="48" viewBox="370 75 480 575" xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0, transition: 'transform 240ms ease' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'rotate(-6deg) scale(1.04)')}
              onMouseLeave={e => (e.currentTarget.style.transform = '')}>
              <g transform="translate(0,720) scale(0.1,-0.1)" fill="#1A1815" stroke="none">
                <path d="M6180 6374 c-672 -46 -1270 -306 -1737 -758 -233 -225 -403 -455 -541 -734 -150 -303 -231 -592 -263 -946 -15 -156 -6 -579 14 -703 79 -483 266 -907 564 -1278 96 -119 305 -325 423 -417 564 -437 1315 -672 2005 -628 548 34 1020 187 1438 464 125 83 347 262 347 280 0 14 -278 306 -292 306 -5 0 -74 -48 -153 -108 -261 -195 -446 -296 -690 -376 -246 -80 -447 -114 -740 -123 -575 -17 -1134 158 -1597 499 -104 76 -300 268 -383 373 -278 355 -447 769 -486 1198 -16 176 -6 512 20 657 41 226 104 416 213 635 288 579 809 992 1458 1155 198 50 323 64 555 65 230 0 348 -12 559 -56 739 -154 1287 -647 1456 -1309 38 -148 50 -240 56 -430 7 -199 -2 -324 -37 -494 -118 -584 -508 -1003 -1059 -1137 -83 -20 -121 -23 -295 -24 -270 0 -296 9 -212 75 120 96 243 238 328 377 l36 60 99 6 c240 15 465 130 609 310 118 147 158 311 120 490 -47 225 -218 346 -487 347 l-88 0 0 33 c0 50 -39 118 -80 139 -133 67 -497 107 -985 108 -574 0 -1004 -50 -1125 -132 -71 -49 -75 -60 -78 -259 -11 -584 166 -1082 512 -1438 300 -309 693 -494 1145 -540 356 -37 711 30 1031 195 165 85 288 174 433 313 319 308 502 685 567 1172 85 641 -80 1255 -468 1739 -378 471 -994 793 -1674 874 -126 15 -420 27 -518 20z m520 -2094 c343 -23 533 -66 514 -115 -32 -83 -609 -146 -1124 -125 -247 11 -491 33 -566 51 -119 29 -156 72 -89 103 75 36 363 80 580 89 176 8 553 6 685 -3z m947 -386 c49 -24 63 -38 88 -84 25 -47 29 -66 30 -130 0 -65 -4 -84 -33 -142 -39 -79 -128 -168 -219 -216 -68 -36 -212 -77 -225 -64 -5 5 -4 21 2 36 35 94 94 384 115 568 7 67 10 68 112 64 55 -2 85 -10 130 -32z"/>
                <path d="M6415 5474 c4 -10 15 -51 23 -90 26 -126 7 -173 -155 -384 -127 -164 -123 -298 14 -432 l54 -53 -8 40 c-13 65 -8 158 11 209 10 26 52 89 92 139 41 51 89 121 107 156 27 56 31 75 31 140 0 59 -5 87 -22 122 -27 55 -80 119 -124 151 -29 20 -31 21 -23 2z"/>
                <path d="M5972 5353 c5 -20 8 -69 6 -107 -4 -84 -23 -126 -108 -235 -142 -184 -148 -312 -21 -451 l41 -45 -7 40 c-24 124 3 208 110 342 36 45 73 104 84 130 24 64 24 175 -1 223 -23 44 -96 140 -106 140 -5 0 -4 -17 2 -37z"/>
                <path d="M6805 5245 c31 -101 15 -164 -71 -287 -117 -165 -123 -255 -23 -360 l50 -53 -7 56 c-8 79 14 149 77 238 70 100 91 151 91 222 0 73 -26 129 -86 188 l-45 44 14 -48z"/>
              </g>
            </svg>
            Strudl
          </a>

          {/* Marketing links + Dashboard CTA — hidden inside the barista tool */}
          {!insideBarista && (
            <>
              <div style={{ alignItems: 'center', gap: 28, fontSize: '0.97rem' }} className="hidden md:flex">
                {links.map(l => (
                  <a key={l.href} href={l.href} onClick={e => handleNav(e, l.href.slice(1))}
                    style={{ color: '#7A7060', fontWeight: 400, textDecoration: 'none', transition: 'color 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#1A1815')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#7A7060')}>
                    {l.label}
                  </a>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Link href="/dashboard"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    borderRadius: 999, padding: '10px 18px', fontWeight: 700, fontSize: '0.9rem',
                    background: '#1A1815', color: '#FDFAF5', border: '1px solid #1A1815',
                    transition: 'transform 180ms ease', textDecoration: 'none',
                  }}
                  className="hover:-translate-y-px"
                >
                  Dashboard →
                </Link>
                {/* Mobile hamburger */}
                <button
                  onClick={() => setOpen(!open)}
                  style={{ padding: 8 }}
                  className="md:hidden"
                  aria-label="Toggle menu"
                >
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    {open ? (
                      <path d="M4 4L18 18M4 18L18 4" stroke="#1A1815" strokeWidth="2" strokeLinecap="round"/>
                    ) : (
                      <>
                        <line x1="2" y1="6" x2="20" y2="6" stroke="#1A1815" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="2" y1="11" x2="20" y2="11" stroke="#1A1815" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="2" y1="16" x2="20" y2="16" stroke="#1A1815" strokeWidth="2" strokeLinecap="round"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </>
          )}
        </nav>

        {/* Mobile menu */}
        {open && !insideBarista && (
          <div style={{ padding: '12px 0 16px', borderTop: '1px solid rgba(26,24,21,0.06)', flexDirection: 'column', gap: 4 }}
            className="flex md:hidden">
            {links.map(l => (
              <a key={l.href} href={l.href} onClick={e => handleNav(e, l.href.slice(1))}
                style={{ padding: '10px 4px', fontWeight: 400, color: '#7A7060', textDecoration: 'none' }}>
                {l.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
