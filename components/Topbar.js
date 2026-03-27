import Link from 'next/link';
import SideMenu from './SideMenu';

/**
 * Shared topbar.
 * @param {object} props
 * @param {boolean} [props.overlay] - Use the transparent/blurred overlay style (home page)
 * @param {React.ReactNode} [props.right] - Optional right-side content
 * @param {string} [props.title] - Override the title text
 */
export default function Topbar({ overlay = false, right = null, title = 'SEAMLINE WEB 0.95' }) {
  return (
    <header className={`topbar${overlay ? ' topbar-overlay' : ''}`}>
      <div className="topbar-left">
        <SideMenu />
      </div>

      <div className="topbar-center">
        <Link href="/" style={{ textDecoration: 'inherit', color: 'inherit' }}>
          {title}
        </Link>
      </div>

      <div className="topbar-right">{right}</div>
    </header>
  );
}
