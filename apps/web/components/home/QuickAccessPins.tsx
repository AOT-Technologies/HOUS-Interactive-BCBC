'use client';

import LinkCard from '@repo/ui/link-card';
import Alert from '@repo/ui/alert';
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
      <div className="quick-access-pins--description">
        <p>
          The BC Building Code Search Tool provides instant access to the complete 2024 British Columbia Building Code. 
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
