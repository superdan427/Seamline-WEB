import Topbar from '@/components/Topbar';

export const metadata = {
  title: 'About — Seamline',
};

export default function AboutPage() {
  return (
    <div>
      <Topbar />
      <main className="simple-page">
        <h1>About Seamline</h1>
        <p>
          Seamline is a directory for discovering fabric shops, leather suppliers, trimmings, and
          sewing services across London.
        </p>
        <p>
          We built it as an alternative to browsing social media hashtags and hoping the algorithm
          surfaces the right shop. Every listing is manually reviewed before it goes on the map.
        </p>
        <p>
          Know a place we&apos;re missing?{' '}
          <a href="/submit">Submit it here</a>.
        </p>
      </main>
    </div>
  );
}
