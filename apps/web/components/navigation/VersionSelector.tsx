"use client";

import { useCallback } from 'react';
import { useVersionStore, useHasMultipleVersions } from '../../stores/version-store';
import './VersionSelector.css';

export interface VersionSelectorProps {
  /**
   * Custom CSS class name
   */
  className?: string;
  /**
   * Test ID for testing
   */
  'data-testid'?: string;
}

/**
 * VersionSelector Component
 * 
 * Displays a dropdown to select BC Building Code version.
 * 
 * Behavior:
 * - If only one version exists (e.g., 2024): Shows as disabled label
 * - If multiple versions exist: Shows as interactive dropdown
 * - Syncs selection with version store and URL
 * - Shows loading state during version switch
 * 
 * Usage:
 * - Placed in Sidebar above TOC
 * - Position: Version → Date Filter → TOC Search → Navigation Tree
 */
export default function VersionSelector({
  className = '',
  'data-testid': testid = 'version-selector',
}: VersionSelectorProps) {
  const currentVersion = useVersionStore(state => state.currentVersion);
  const availableVersions = useVersionStore(state => state.availableVersions);
  const setCurrentVersion = useVersionStore(state => state.setCurrentVersion);
  const loading = useVersionStore(state => state.loading);
  const hasMultipleVersions = useHasMultipleVersions();

  // Get current version object
  const currentVersionObj = availableVersions.find(v => v.id === currentVersion);

  // Handle version change
  const handleVersionChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newVersionId = event.target.value;
    setCurrentVersion(newVersionId);
  }, [setCurrentVersion]);

  // If no versions loaded yet, show loading
  if (loading || availableVersions.length === 0) {
    return (
      <div className={`VersionSelector ${className}`} data-testid={testid}>
        <div className="VersionSelector--Loading">
          <span className="VersionSelector--LoadingText">Loading versions...</span>
        </div>
      </div>
    );
  }

  // If only one version, show as disabled label
  if (!hasMultipleVersions) {
    return (
      <div className={`VersionSelector ${className}`} data-testid={testid}>
        <label className="VersionSelector--Label" htmlFor="version-select">
          Version
        </label>
        <div className="VersionSelector--SingleVersion">
          <span className="VersionSelector--SingleVersionText">
            {currentVersionObj?.title || 'BC Building Code 2024'}
          </span>
        </div>
      </div>
    );
  }

  // Multiple versions: show interactive dropdown
  return (
    <div className={`VersionSelector ${className}`} data-testid={testid}>
      <label className="VersionSelector--Label" htmlFor="version-select">
        Version
      </label>
      <div className="VersionSelector--SelectWrapper">
        <select
          id="version-select"
          className="VersionSelector--Select"
          value={currentVersion || ''}
          onChange={handleVersionChange}
          disabled={loading}
          aria-label="Select BC Building Code version"
          data-testid={`${testid}-select`}
        >
          {availableVersions.map((version) => (
            <option key={version.id} value={version.id}>
              {version.title}
            </option>
          ))}
        </select>
        <svg
          className="VersionSelector--Icon"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
