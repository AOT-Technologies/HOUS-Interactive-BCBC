'use client';

import { useEffect, useState } from 'react';
import LinkCard from '@repo/ui/link-card';
import './QuickAccessPins.css';

interface QuickAccessPin {
  id: string;
  title: string;
  path: string;
  description: string;
}

interface QuickAccessData {
  version: string;
  generatedAt: string;
  pins: QuickAccessPin[];
}

interface QuickAccessPinsProps {
  /**
   * Optional CSS class name
   */
  className?: string;
  /**
   * Maximum number of pins to display
   * @default undefined (show all)
   */
  maxPins?: number;
}

/**
 * QuickAccessPins Component
 * 
 * Displays frequently accessed sections of the BC Building Code as clickable cards.
 * Loads data from pre-generated quick-access.json metadata file.
 * 
 * Features:
 * - Card-based layout
 * - Shows section title, code reference, and description
 * - Click navigates to Content Reading Page
 * - Responsive grid layout
 * 
 * Requirements: 9.1, 9.2, 9.3
 */
export default function QuickAccessPins({ className = '', maxPins }: QuickAccessPinsProps) {
  const [pins, setPins] = useState<QuickAccessPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load quick access data on mount
  useEffect(() => {
    async function loadQuickAccess() {
      try {
        const response = await fetch('/data/quick-access.json');
        if (!response.ok) {
          throw new Error('Failed to load quick access data');
        }
        const data: QuickAccessData = await response.json();
        const pinsToShow = maxPins ? data.pins.slice(0, maxPins) : data.pins;
        setPins(pinsToShow);
      } catch (err) {
        console.error('Error loading quick access data:', err);
        setError('Unable to load quick access sections');
      } finally {
        setLoading(false);
      }
    }

    loadQuickAccess();
  }, [maxPins]);

  if (loading) {
    return (
      <div className={`quick-access-pins quick-access-pins--loading ${className}`}>
        <p>Loading quick access sections...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`quick-access-pins quick-access-pins--error ${className}`}>
        <p>{error}</p>
      </div>
    );
  }

  if (pins.length === 0) {
    return null;
  }

  return (
    <section className={`quick-access-pins ${className}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
        <h2 className="quick-access-pins--title">Quick Access</h2>
        <div className="quick-access-pins--grid">
          {pins.map((pin) => (
            <LinkCard
              key={pin.id}
              title={pin.title}
              description={pin.description}
              href={pin.path}
              className="quick-access-pin"
            />
          ))}
        </div>
      </div>
      
      <div className="quick-access-pins--alert">
        <svg className="quick-access-pins--alert-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M1 21H23L12 2L1 21ZM13 18H11V16H13V18ZM13 14H11V10H13V14Z" fill="currentColor"/>
        </svg>
        <div className="quick-access-pins--alert-content">
          <h3 className="quick-access-pins--alert-title">Report a bug</h3>
          <p className="quick-access-pins--alert-description">
            Found a broken link or search issue? <a href="https://submit-feedback.example.com" target="_blank" rel="noopener noreferrer">Submit feedback to the product team</a>
          </p>
        </div>
      </div>
    </section>
  );
}
