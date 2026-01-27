import type { Metadata } from 'next';
import '@bcgov/bc-sans/css/BC_Sans.css';
import '@repo/ui/cssVariables';
import Header from '@repo/ui/header';
import Footer from '@repo/ui/footer';
import { ID_MAIN_CONTENT, ID_SKIP_TO_CONTENT } from '@repo/constants';
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
  const skipLinks = [
    <a key="skip-main" href={`#${ID_MAIN_CONTENT}`} id={ID_SKIP_TO_CONTENT}>
      Skip to main content
    </a>,
  ];

  return (
    <html lang="en">
      <body>
        <Header
          skipLinks={skipLinks}
          title="BC Building Code"
          logoSrc="/bc-logo.png"
          titleElement="h1"
        />
        <main id={ID_MAIN_CONTENT}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
