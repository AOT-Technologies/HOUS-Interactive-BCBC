'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MathJaxContext } from 'better-react-mathjax';
import { getSearchClient } from '@/lib/search-client';
import { useVersionStore } from '@/stores/version-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { GlossarySidebar } from '@/components/reading/GlossarySidebar';
import Header from '@repo/ui/header';
import Footer from '@repo/ui/footer';
import TestingBanner from '@/components/layout/TestingBanner';
import { ID_MAIN_CONTENT, ID_SKIP_TO_CONTENT } from '@repo/constants';
import { URL_GLOSSARY_TITLE } from '@repo/constants/src/urls';

const mathJaxConfig = {
  startup: {
    typeset: false,
  },
  options: {
    renderActions: {
      addMenu: [],
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();

  // Load versions on mount
  const loadVersions = useVersionStore(state => state.loadVersions);
  const currentVersion = useVersionStore(state => state.currentVersion);
  const openGlossarySidebar = useUIStore(state => state.openGlossarySidebar);

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

  const handleSearch = useCallback(
    (query: string) => {
      // Navigate to search page with query and version
      const version = currentVersion || '2024';
      router.push(`/search?q=${encodeURIComponent(query)}&version=${version}`);
    },
    [router, currentVersion]
  );

  const handleGetSuggestions = useCallback(
    async (query: string): Promise<string[]> => {
      try {
        const client = getSearchClient();
        const version = currentVersion || '2024';

        // Initialize if not already done
        if (!client.isInitialized(version)) {
          await client.initialize(version);
        }

        // Get suggestions from FlexSearch index
        const suggestions = await client.getSuggestions(query, 5, version);
        return suggestions;
      } catch (error) {
        console.error('Failed to get suggestions:', error);
        return [];
      }
    },
    [currentVersion]
  );

  const handleHeaderNavClick = useCallback(
    (link: { title: string }) => {
      if (link.title !== URL_GLOSSARY_TITLE) {
        return false;
      }

      const { glossarySidebarOpen } = useUIStore.getState();
      if (glossarySidebarOpen) {
        return true;
      }

      openGlossarySidebar();
      return true;
    },
    [openGlossarySidebar]
  );

  return (
    <MathJaxContext
      version={3}
      config={mathJaxConfig}
      src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.js"
      hideUntilTypeset="first"
      onError={error => {
        console.error('[MathJax] Failed to load or initialize MathJax', error);
      }}
    >
      <Header
        skipLinks={skipLinks}
        title="BC Building Code"
        logoSrc="/bc-logo.png"
        titleElement="h1"
        onSearch={handleSearch}
        getSuggestions={handleGetSuggestions}
        searchPlaceholder="Search building code..."
        onNavLinkClick={handleHeaderNavClick}
      />
      <TestingBanner />
      <main id={ID_MAIN_CONTENT}>{children}</main>
      <GlossarySidebar />
      <Footer />
    </MathJaxContext>
  );
}
