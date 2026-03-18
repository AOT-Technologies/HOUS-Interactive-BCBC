'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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

  const handlePinNavigation = (event: MouseEvent<Element>, url: string) => {
    // Keep native browser behavior for modified clicks (new tab/window, etc).
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    router.push(url);
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
        {pins.map((pin) => {
          const pinUrl = buildPinUrl(pin.path);
          return (
          <LinkCard
            key={pin.id}
            title={pin.title}
            description={pin.description}
            href={pinUrl}
            onClick={(event) => handlePinNavigation(event, pinUrl)}
            className="quick-access-pin"
          />
          );
        })}
      </div>
      <div className="quick-access-pins--description">
        <p>
          The BC Building Code includes the BC Plumbing Code and together they regulate:
        </p>
        <ul>
          <li>New construction</li>
          <li>Building alterations and repairs</li>
          <li>Demolitions</li>
        </ul>
        <p>
          The BC Building Code {currentVersion || '2024'} (BCBC) came into effect on March 8, 2024, and applies to all
          projects with building permits applied for after that date.
        </p>
        <p>
          The BC Building Code website provides a modern, searchable and easy to navigate experience to access code
          requirements. Quickly find information using full-text search, filters, and a clear navigation structure. All
          content includes glossary terms and BCBC cross-references, allowing you to understand requirements in context
          without losing your place. You can also explore code requirements by effective date to easily identify which
          provisions apply.
        </p>
      </div>
      <Alert
        variant="warning"
        title="Report a bug"
        description={
          <>
            Found a broken link or search issue?{" "}
            <a href="mailto:BGI-DigitalDelivery@gov.bc.ca">
              Submit feedback to the product team
            </a>
          </>
        }
      />
    </section>
  );
}
