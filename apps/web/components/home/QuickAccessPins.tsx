'use client';

import LinkCard from '@repo/ui/link-card';
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

// Hardcoded quick access items matching Figma design
const QUICK_ACCESS_ITEMS: QuickAccessPin[] = [
  {
    id: "divB-part9",
    title: "Division B - Part 9",
    path: "/code/nbc.divBV2/9/1",
    description: "Housing and Small Buildings"
  },
  {
    id: "divB-part3",
    title: "Division B - Part 3",
    path: "/code/nbc.divB/3/1",
    description: "Fire Protection, Occupant Safety and Accessibility"
  },
  {
    id: "divA-part3",
    title: "Division A - Part 3",
    path: "/code/nbc.divA/3/1",
    description: "Functional Statements"
  }
];

/**
 * QuickAccessPins Component
 * 
 * Displays frequently accessed sections of the BC Building Code as clickable cards.
 * Uses hardcoded Division-based structure matching Figma design.
 * 
 * Features:
 * - Single-column stacked layout
 * - Shows 3 cards: Division B Part 9, Division B Part 3, Division A Part 3
 * - Click navigates to Content Reading Page
 * 
 * Requirements: 9.1, 9.2, 9.3
 */
export default function QuickAccessPins({ className = '' }: QuickAccessPinsProps) {
  return (
    <section className={`quick-access-pins ${className}`}>
      <h2 className="quick-access-pins--title">Quick Access</h2>
      <div className="quick-access-pins--list">
        {QUICK_ACCESS_ITEMS.map((pin) => (
          <LinkCard
            key={pin.id}
            title={pin.title}
            description={pin.description}
            href={pin.path}
            className="quick-access-pin"
          />
        ))}
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
