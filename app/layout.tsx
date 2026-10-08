import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Snowflake — QR studio', description: 'Create a snowflake QR. Watch the snow fall, explore in 3D, and save a clean code.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
