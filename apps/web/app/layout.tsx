"use client";

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSearchClient } from '@/lib/search-client';
import '@bcgov/bc-sans/css/BC_Sans.css';
import '@repo/ui/cssVariables';
import Header from '@repo/ui/header';
import Footer from '@repo/ui/footer';
import { ID_MAIN_CONTENT, ID_SKIP_TO_CONTENT } from '@repo/constants';
import './globals.css';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();

  const skipLinks = [
    <a key="skip-main" href={`#${ID_MAIN_CONTENT}`} id={ID_SKIP_TO_CONTENT}>
      Skip to main content
    </a>,
  ];

  const handleSearch = useCallback((query: string) => {
    // Navigate to search page with query
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }, [router]);

  const handleGetSuggestions = useCallback(async (query: string): Promise<string[]> => {
    try {
      const client = getSearchClient();
      
      // Initialize if not already done
      if (!client.isInitialized()) {
        await client.initialize();
      }
      
      // Get suggestions from FlexSearch index
      const suggestions = await client.getSuggestions(query, 5);
      return suggestions;
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  }, []);

  return (
    <html lang="en">
      <body>
        <Header
          skipLinks={skipLinks}
          title="BC Building Code"
          logoSrc="/bc-logo.png"
          titleElement="h1"
          onSearch={handleSearch}
          getSuggestions={handleGetSuggestions}
          searchPlaceholder="Search building code..."
        />
        <main id={ID_MAIN_CONTENT}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
