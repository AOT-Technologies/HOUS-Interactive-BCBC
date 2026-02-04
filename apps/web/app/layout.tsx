"use client";

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSearchClient } from '@/lib/search-client';
import { useVersionStore } from '@/stores/version-store';
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
  
  // Load versions on mount
  const loadVersions = useVersionStore(state => state.loadVersions);
  const currentVersion = useVersionStore(state => state.currentVersion);
  
  useEffect(() => {
    loadVersions();
  }, [loadVersions]);
  
  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      // Sync version from URL when user navigates back/forward
      const params = new URLSearchParams(window.location.search);
      const urlVersion = params.get('version');
      
      if (urlVersion) {
        const currentVersion = useVersionStore.getState().currentVersion;
        if (urlVersion !== currentVersion) {
          useVersionStore.getState().setCurrentVersion(urlVersion);
        }
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const skipLinks = [
    <a key="skip-main" href={`#${ID_MAIN_CONTENT}`} id={ID_SKIP_TO_CONTENT}>
      Skip to main content
    </a>,
  ];

  const handleSearch = useCallback((query: string) => {
    // Navigate to search page with query and version
    const version = currentVersion || '2024';
    router.push(`/search?q=${encodeURIComponent(query)}&version=${version}`);
  }, [router, currentVersion]);

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
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
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
