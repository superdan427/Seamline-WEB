import Link from 'next/link';
import Image from 'next/image';
import SideMenu from './SideMenu';

/**
 * Shared topbar.
 * @param {object} props
 * @param {boolean} [props.overlay] - Use the transparent/blurred overlay style (home page)
 * @param {React.ReactNode} [props.right] - Optional right-side content
 */
export default function Topbar({ overlay = false, right = null }) {
  return (
    <header className={`topbar${overlay ? ' topbar-overlay' : ''}`}>
      <div className="topbar-left">
        <SideMenu />
      </div>

      <div className="topbar-center">
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <Image
            src="/seamline-logo.png"
            alt="Seamline"
            width={150}
            height={30}
            style={{ objectFit: 'contain',  marginTop: '-24px'  }}
            priority
          />
        </Link>
      </div>

      <div className="topbar-right">{right}</div>
    </header>
  );
}