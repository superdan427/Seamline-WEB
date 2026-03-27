import './globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AuthProvider } from '@/hooks/useAuth';

export const metadata = {
  title: 'Seamline',
  description: 'Discover fabric shops and fashion suppliers in London',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
