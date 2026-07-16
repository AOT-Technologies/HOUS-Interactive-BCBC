import type { Metadata } from 'next';
import AppShell from '@/components/layout/AppShell';
import '@bcgov/bc-sans/css/BC_Sans.css';
import '@repo/ui/cssVariables';
import './globals.css';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
