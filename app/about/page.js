import Topbar from '@/components/Topbar';

export const metadata = {
  title: 'About — Seamline',
};

export default function AboutPage() {
  return (
    <div>
      <Topbar />
      <main className="about-page">

        <p className="about-hook">
          Scrolling. Comparing. Saving inspiration you'll never open again.
          It feels like doing something. It isn't.
        </p>

        <p className="about-body">
          Seamline gets you outside. Find small shops you didn't know existed and feel the materials.

          A directory of fabric shops, suppliers, tailors. The places fashion is actually built on.
          Pick a place. Go there. Touch the fabric. Make something.
        </p>
        <p className="about-stamp">
          Less content. Less ego. Less gatekeeping.
        </p>

        <p className="about-stamp">
          Know a place we&apos;re missing?{' '}  </p>
        <p className ="about-submit"> <a href="/submit">Submit it here </a>. </p>


      </main>
    </div>
  );
}