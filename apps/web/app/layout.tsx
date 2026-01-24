import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BC Building Code Interactive',
  description:
    'Interactive web application for the British Columbia Building Code - search, navigate, and understand the building code.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
