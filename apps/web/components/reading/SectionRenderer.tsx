/**
 * SectionRenderer - Renders a complete section with all subsections
 * 
 * Works directly with Section type from parser (no transformation needed)
 */

import React from 'react';
import type { Section } from '@bc-building-code/bcbc-parser';
import { SectionTitle } from './SectionTitle';
import { SubsectionBlock } from './SubsectionBlock';
import './SectionRenderer.css';

export interface SectionRendererProps {
  section: Section;
  effectiveDate?: string;
  interactive?: boolean;
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({ 
  section,
  effectiveDate,
  interactive = true 
}) => {
  return (
    <div className="sectionRenderer">
      <SectionTitle 
        number={section.number}
        title={section.title}
      />
      
      <div className="sectionContent">
        {section.subsections.map((subsection) => (
          <SubsectionBlock
            key={subsection.id}
            subsection={subsection}
            effectiveDate={effectiveDate}
            interactive={interactive}
          />
        ))}
      </div>
    </div>
  );
};
