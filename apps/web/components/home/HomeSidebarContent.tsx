'use client';

import { useEffect } from 'react';
import { NavigationTree } from '@/components/navigation/NavigationTree';
import { useNavigationStore } from '@/stores/navigation-store';
import './HomeSidebarContent.css';

/**
 * HomeSidebarContent Component
 * 
 * Sidebar content for the homepage, including:
 * - BC Building Code title and description
 * - Effective date filter (placeholder for now)
 * - TOC search (placeholder for now)
 * - Navigation tree
 * 
 * Requirements: 4.1, 4.2, 9.1, 9.2, 9.3
 */
export default function HomeSidebarContent() {
  const { loadNavigationTree } = useNavigationStore();

  // Load navigation tree on mount
  useEffect(() => {
    loadNavigationTree();
  }, [loadNavigationTree]);

  return (
    <div className="home-sidebar-content">
      {/* Sidebar Header */}
      <div className="home-sidebar-header">
        <h2 className="home-sidebar-title">BC Building Code</h2>
        <p className="home-sidebar-description">
          2024 Consolidated code version including all active revisions and errata
        </p>
        
        {/* Effective Date Filter - Placeholder */}
        <div className="home-sidebar-filter">
          <select className="home-sidebar-select" aria-label="Select effective date">
            <option value="">Select an option...</option>
            <option value="2024-01-01">January 1, 2024 (Latest)</option>
            <option value="2023-01-01">January 1, 2023</option>
          </select>
        </div>

        {/* Divider */}
        <div className="home-sidebar-divider" />

        {/* TOC Search - Placeholder */}
        <div className="home-sidebar-search">
          <input
            type="search"
            className="home-sidebar-search-input"
            placeholder="Search table of contents..."
            aria-label="Search table of contents"
          />
        </div>
      </div>

      {/* Navigation Tree */}
      <div className="home-sidebar-nav">
        <NavigationTree />
      </div>
    </div>
  );
}
