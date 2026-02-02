'use client';

import { useEffect, useState, useCallback } from 'react';
import { NavigationTree } from '@/components/navigation/NavigationTree';
import { useNavigationStore } from '@/stores/navigation-store';
import './HomeSidebarContent.css';

interface AmendmentDate {
  effectiveDate: string;
  displayDate: string;
  count: number;
  type: 'amendment' | 'original';
}

interface AmendmentDatesData {
  version: string;
  generatedAt: string;
  dates: AmendmentDate[];
}

/**
 * HomeSidebarContent Component
 * 
 * Sidebar content for the homepage, including:
 * - BC Building Code title and description
 * - Effective date filter (loaded from amendment-dates.json, defaults to latest, disabled)
 * - TOC search with real-time filtering
 * - Navigation tree
 * 
 * Requirements: 4.1, 4.2, 9.1, 9.2, 9.3
 */
export default function HomeSidebarContent() {
  const { loadNavigationTree, setSearchQuery, clearSearch, searchQuery } = useNavigationStore();
  const [latestDate, setLatestDate] = useState<AmendmentDate | null>(null);
  const [localSearchValue, setLocalSearchValue] = useState('');

  // Load navigation tree and amendment dates on mount
  useEffect(() => {
    loadNavigationTree();
    
    // Load amendment dates
    fetch('/data/amendment-dates.json')
      .then(res => res.json())
      .then((data: AmendmentDatesData) => {
        // Find the latest date (first in the array as they're sorted descending)
        if (data.dates && data.dates.length > 0) {
          setLatestDate(data.dates[0]);
        }
      })
      .catch(err => {
        console.error('Failed to load amendment dates:', err);
      });
  }, [loadNavigationTree]);

  // Debounced search handler
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(localSearchValue);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [localSearchValue, setSearchQuery]);

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchValue(e.target.value);
  }, []);

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setLocalSearchValue('');
    clearSearch();
  }, [clearSearch]);

  // Handle keyboard shortcuts
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClearSearch();
    }
  }, [handleClearSearch]);

  return (
    <div className="home-sidebar-content">
      {/* Sidebar Header */}
      <div className="home-sidebar-header">
        <h2 className="home-sidebar-title">BC Building Code</h2>
        <p className="home-sidebar-description">
          2024 Consolidated code version including all active revisions and errata
        </p>
        
        {/* Effective Date Filter - Loaded from amendment-dates.json */}
        <div className="home-sidebar-filter">
          <select 
            className="home-sidebar-select" 
            aria-label="Select effective date"
            value={latestDate?.effectiveDate || ''}
            disabled
          >
            {latestDate ? (
              <option value={latestDate.effectiveDate}>
                {latestDate.displayDate} (Latest)
              </option>
            ) : (
              <option value="">Loading...</option>
            )}
          </select>
        </div>

        {/* Divider */}
        <div className="home-sidebar-divider" />

        {/* TOC Search - Active with filtering */}
        <div className="home-sidebar-search">
          <div className="home-sidebar-search-wrapper">
            <input
              type="text"
              className="home-sidebar-search-input"
              placeholder="Search table of contents..."
              aria-label="Search table of contents"
              value={localSearchValue}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
            />
            {localSearchValue && (
              <button
                className="home-sidebar-search-clear"
                onClick={handleClearSearch}
                aria-label="Clear search"
                type="button"
              >
                ×
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="home-sidebar-search-info" role="status" aria-live="polite">
              Filtering results for "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tree */}
      <div className="home-sidebar-nav">
        <NavigationTree />
      </div>
    </div>
  );
}
