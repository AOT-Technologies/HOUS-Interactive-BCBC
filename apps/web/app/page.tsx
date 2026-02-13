'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import HomeSidebarContent from '@/components/home/HomeSidebarContent';
import HeroSearch from '@repo/ui/hero-search';
import QuickAccessPins from '@/components/home/QuickAccessPins';
import { getSearchClient } from '@/lib/search-client';
import { useVersionStore } from '@/stores/version-store';
import './page.css';

export default function Home() {
  const router = useRouter();
  const currentVersion = useVersionStore(state => state.currentVersion);

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
    <MainLayout 
      className="MainLayout--home"
      showSidebar 
      sidebarContent={<HomeSidebarContent />}
    >
      <div className="homepage">
        {/* Hero Section - contains sidebar toggle on mobile */}
        <section className="homepage-hero">
          <HeroSearch
            onSearch={handleSearch}
            getSuggestions={handleGetSuggestions}
            title="BC Building Code"
            subtitle="Search and navigate the official British Columbia Building Code. Find requirements, definitions, and technical guidance for construction projects across BC."
            placeholder="Search for keywords (e.g. &quot;Egress&quot;, &quot;Radon&quot;) or Section..."
          />
        </section>

        {/* Quick Access Section */}
        <section className="homepage-quick-access">
          <QuickAccessPins />
        </section>
      </div>
    </MainLayout>
  );
}
