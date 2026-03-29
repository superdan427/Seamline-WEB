import Topbar from '@/components/Topbar';

export const metadata = {
  title: 'About — Seamline',
  description: 'Seamline is a directory of fabric shops, suppliers and tailors in London. Less scrolling. More making.',
};

export default function AboutPage() {
  return (
    <div>
      <Topbar />
      <main className="about-page">

        <p className="about-hook">
          Scrolling. Comparing. Saving inspiration you&apos;ll never open again.
          It feels like doing something. It isn&apos;t.
        </p>

        <p className="about-body">
          Seamline gets you outside. Find small shops you didn&apos;t know existed and feel the materials.
          A directory of fabric shops, suppliers, tailors. The places fashion is actually built on.
          Pick a place. Go there. Touch the fabric. Make something.
        </p>

        <p className="about-stamp">
          Less content. Less ego. Less gatekeeping.
        </p>

        <p className="about-stamp">
          Know a place we&apos;re missing?{' '}
          <a href="/submit">Submit it here</a>.
        </p>

      </main>
    </div>
  );
}