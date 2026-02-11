/**
 * ReadingViewHeader Component
 * 
 * Header section for the reading view containing PDF download button and source badges.
 * Positioned at the top of the content area.
 */

import React from 'react';
import { SourceBadges } from './SourceBadges';
import './ReadingViewHeader.css';

interface ReadingViewHeaderProps {
  // PDF button will be added in later tasks
}

export const ReadingViewHeader: React.FC<ReadingViewHeaderProps> = () => {
  return (
    <div className="reading-view-header">
      <div className="reading-view-header__left">
        {/* PDF Download Button will be added in Task 9 */}
      </div>
      <div className="reading-view-header__right">
        <SourceBadges />
      </div>
    </div>
  );
};
