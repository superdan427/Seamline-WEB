'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function SideMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const user = useAuth();
  const menuRef = useRef(null);

  // Only render portal after mount (avoids SSR mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      {/* Hamburger button — stays inside the topbar DOM */}
      <button
        id="menu-button"
        className="icon-button"
        aria-label="Menu"
        onClick={() => setOpen((o) => !o)}
      >
        ☰
      </button>

      {/* Overlay + nav rendered at document.body to escape stacking contexts */}
      {mounted && createPortal(
        <>
          <div
            className={`menu-overlay${open ? '' : ' hidden'}`}
            onClick={() => setOpen(false)}
          />
          <nav
            ref={menuRef}
            id="side-menu"
            className={`side-menu${open ? ' open' : ''}`}
            aria-hidden={!open}
          >
            <div className="side-menu-inner">
              <Link className="menu-item" href="/" onClick={() => setOpen(false)}>Home (Map)</Link>
              <Link className="menu-item" href="/list" onClick={() => setOpen(false)}>List view</Link>
              <Link className="menu-item" href="/search" onClick={() => setOpen(false)}>Search</Link>
              <Link className="menu-item" href="/saved" onClick={() => setOpen(false)}>Saved places</Link>
              <Link className="menu-item" href="/submit" onClick={() => setOpen(false)}>Submit a place</Link>
              <Link className="menu-item" href="/about" onClick={() => setOpen(false)}>About</Link>
              <Link className="menu-item" href="/account" onClick={() => setOpen(false)}>
                {user ? 'My account' : 'Log in / Sign up'}
              </Link>
            </div>
          </nav>
        </>,
        document.body
      )}
    </>
  );
}
