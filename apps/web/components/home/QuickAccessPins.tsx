'use client';

import { useEffect, useState } from 'react';
import LinkCard from '@repo/ui/link-card';
import Alert from '@repo/ui/alert';
import { useVersionStore } from '@/stores/version-store';
import { useAmendmentDateStore } from '@/stores/amendment-date-store';
import './QuickAccessPins.css';

interface QuickAccessPin {
  id: string;
  title: string;
  path: string;
  description: string;
}

interface QuickAccessPinsProps {
  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * QuickAccessPins Component
 * 
 * Displays frequently accessed sections of the BC Building Code as clickable cards.
 * Loads pins from version-specific quick-access.json file.
 * 
 * Features:
 * - Single-column stacked layout
 * - Shows 3 cards: Division A Part 1, Division B Part 9, Division B Part 3
 * - Click navigates to Content Reading Page with version and date parameters
 * - Version-aware: loads pins from /data/{version}/quick-access.json
 * 
 * Requirements: 9.1, 9.2, 9.3
 */
export default function QuickAccessPins({ className = '' }: QuickAccessPinsProps) {
  const [pins, setPins] = useState<QuickAccessPin[]>([]);
  const [loading, setLoading] = useState(true);
  const currentVersion = useVersionStore((state) => state.currentVersion);
  const selectedDate = useAmendmentDateStore((state) => state.selectedDate);
  const getVersionDataPath = useVersionStore((state) => state.getVersionDataPath);

  // Load quick access pins from version-specific JSON
  useEffect(() => {
    if (!currentVersion) return;

    const dataPath = getVersionDataPath(currentVersion);
    
    fetch(`${dataPath}/quick-access.json`)
      .then(res => res.json())
      .then(data => {
        setPins(data.pins || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load quick access pins:', err);
        setLoading(false);
      });
  }, [currentVersion, getVersionDataPath]);

  // Build URL with version and date query parameters
  const buildPinUrl = (path: string): string => {
    const params = new URLSearchParams();
    if (currentVersion) {
      params.set('version', currentVersion);
    }
    if (selectedDate) {
      params.set('date', selectedDate);
    }
    return `${path}?${params.toString()}`;
  };

  if (loading) {
    return (
      <section className={`quick-access-pins ${className}`}>
        <h2 className="quick-access-pins--title">Quick Access</h2>
        <p>Loading...</p>
      </section>
    );
  }

  return (
    <section className={`quick-access-pins ${className}`}>
      <h2 className="quick-access-pins--title">Quick Access</h2>
      <div className="quick-access-pins--list">
        {pins.map((pin) => (
          <LinkCard
            key={pin.id}
            title={pin.title}
            description={pin.description}
            href={buildPinUrl(pin.path)}
            className="quick-access-pin"
          />
        ))}
      </div>
      <div className="quick-access-pins--description">
        <p>
          The BC Building Code Search Tool provides instant access to the complete {currentVersion || '2024'} British Columbia Building Code. 
          Use the search bar above to find specific requirements, browse by division and part using the navigation tree, 
          or explore frequently accessed sections through Quick Access. All content includes inline glossary definitions, 
          cross-references, and effective date filtering to help you find exactly what you need.
        </p>
      </div>
      <Alert
        variant="warning"
        title="Report a bug"
        description={
          <>
            Found a broken link or search issue?{" "}
            <a href="https://submit-feedback.example.com" target="_blank" rel="noopener noreferrer">
              Submit feedback to the product team
            </a>
          </>
        }
      />
    </section>
  );
}
