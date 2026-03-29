import './globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AuthProvider } from '@/hooks/useAuth';

export const metadata = {
  title: 'Seamline — London Fabric Shops, Suppliers & Tailors',
  description: 'Find fabric shops, suppliers, tailors and sewing services in London. A community-built directory of the places fashion is actually made.',
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
