'use client';

/**
 * ReadingViewHeader Component
 * 
 * Header section for the reading view containing PDF download button and source badges.
 * Positioned at the top of the content area.
 */

import React from 'react';
import { PdfDownloadButton } from './PdfDownloadButton';
import { SourceBadges } from './SourceBadges';
import './ReadingViewHeader.css';

interface ReadingViewHeaderProps {
  pdfLabel: string;
}

export const ReadingViewHeader: React.FC<ReadingViewHeaderProps> = ({ pdfLabel }) => {
  return (
    <div className="reading-view-header">
      <div className="reading-view-header__actions">
        <PdfDownloadButton label={pdfLabel} />
      </div>
      <div className="reading-view-header__meta">
        <div className="reading-view-header__divider" aria-hidden="true" />
        <div className="reading-view-header__badges">
          <SourceBadges />
        </div>
      </div>
    </div>
  );
};
