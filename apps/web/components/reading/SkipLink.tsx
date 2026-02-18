/**
 * SkipLink Component
 * 
 * Provides keyboard navigation shortcuts to main content sections.
 * WCAG AAA requirement for accessibility.
 */

'use client';

import React from 'react';
import './SkipLink.css';

interface SkipLinkProps {
  targetId: string;
  label: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ targetId, label }) => {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      className="skip-link"
      onClick={handleClick}
      aria-label={label}
    >
      {label}
    </a>
  );
};

interface SkipLinksProps {
  links: Array<{ targetId: string; label: string }>;
}

export const SkipLinks: React.FC<SkipLinksProps> = ({ links }) => {
  return (
    <nav className="skip-links" aria-label="Skip navigation">
      {links.map((link) => (
        <SkipLink key={link.targetId} targetId={link.targetId} label={link.label} />
      ))}
    </nav>
  );
};
