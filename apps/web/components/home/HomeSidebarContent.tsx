'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { NavigationTree } from '@/components/navigation/NavigationTree';
import { VersionSelector } from '@/components/navigation';
import { useNavigationStore } from '@/stores/navigation-store';
import { useVersionStore } from '@/stores/version-store';
import { useAmendmentDateStore } from '@/stores/amendment-date-store';
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
 * - Version selector (Position 1)
 * - Effective date filter (Position 2 - loaded from amendment-dates.json, defaults to latest)
 * - TOC search (Position 3 - with real-time filtering)
 * - Navigation tree (Position 4)
 * 
 * Requirements: 4.1, 4.2, 9.1, 9.2, 9.3
 */
export default function HomeSidebarContent() {
  const { loadNavigationTree, setSearchQuery, clearSearch, searchQuery } = useNavigationStore();
  const { currentVersion, getVersion } = useVersionStore();
  const { selectedDate, setSelectedDate, initializeFromUrl } = useAmendmentDateStore();
  const [allDates, setAllDates] = useState<AmendmentDate[]>([]);
  const [localSearchValue, setLocalSearchValue] = useState('');
  
  // Track if this is the initial load vs a version change
  const isInitialLoad = useRef(true);
  const previousVersion = useRef<string | null>(null);
  
  // Get current version details
  const currentVersionData = getVersion(currentVersion || undefined);
  const versionYear = currentVersionData?.year || 2024;

  // Initialize date from URL on first mount
  useEffect(() => {
    initializeFromUrl();
  }, [initializeFromUrl]);

  // Load navigation tree and amendment dates when version changes
  useEffect(() => {
    // Don't load if version is not ready yet
    if (!currentVersion) {
      return;
    }
    
    // Determine if this is initial load or version change
    const isVersionChange = previousVersion.current !== null && previousVersion.current !== currentVersion;
    previousVersion.current = currentVersion;
    
    // Load navigation tree for current version
    loadNavigationTree(currentVersion);
    
    // Get current selected date from store (for initial load check)
    const currentSelectedDate = useAmendmentDateStore.getState().selectedDate;
    
    // Load amendment dates from version-specific path
    fetch(`/data/${currentVersion}/amendment-dates.json`)
      .then(res => res.json())
      .then((data: AmendmentDatesData) => {
        if (data.dates && data.dates.length > 0) {
          setAllDates(data.dates);
          
          if (isInitialLoad.current && !isVersionChange) {
            // Initial load: preserve URL date if valid, otherwise use latest
            isInitialLoad.current = false;
            
            // Check if current selectedDate (from URL) is valid for this version
            const urlDateValid = currentSelectedDate && data.dates.some(d => d.effectiveDate === currentSelectedDate);
            
            if (!urlDateValid) {
              // URL date not valid or not present, use latest
              setSelectedDate(data.dates[0].effectiveDate);
            }
            // If URL date is valid, keep it (already set from initializeFromUrl)
          } else {
            // Version changed: always reset to latest date
            setSelectedDate(data.dates[0].effectiveDate);
          }
        }
      })
      .catch(err => {
        console.error('Failed to load amendment dates:', err);
      });
  }, [currentVersion, loadNavigationTree, setSelectedDate]);

  // Handle effective date change
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDate(e.target.value);
    // TODO: Filter content by selected date (future enhancement)
    console.log('Selected effective date:', e.target.value);
  }, [setSelectedDate]);

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
          {versionYear} Consolidated code version including all active revisions and errata
        </p>
        
        {/* Version Selector - Position 1 */}
        <VersionSelector />
        
        {/* Effective Date Filter - Position 2 - Loaded from amendment-dates.json */}
        <div className="home-sidebar-filter">
          <label className="home-sidebar-filter-label" htmlFor="effective-date-select">
            Effective Date
          </label>
          <select 
            id="effective-date-select"
            className="home-sidebar-select" 
            aria-label="Select effective date"
            value={selectedDate || ''} // Convert null to empty string
            onChange={handleDateChange}
          >
            {allDates.length > 0 ? (
              allDates.map((date, index) => (
                <option key={date.effectiveDate} value={date.effectiveDate}>
                  {date.displayDate} {index === 0 ? '(Latest)' : ''}
                </option>
              ))
            ) : (
              <option value="">Loading...</option>
            )}
          </select>
        </div>

        {/* Divider */}
        <div className="home-sidebar-divider" />

        {/* TOC Search - Position 3 - Active with filtering */}
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

      {/* Navigation Tree - Position 4 */}
      <div className="home-sidebar-nav">
        <Suspense fallback={<div className="navigation-tree__loading">Loading navigation...</div>}>
          <NavigationTree />
        </Suspense>
      </div>
    </div>
  );
}
