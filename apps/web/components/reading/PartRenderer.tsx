import React from 'react';
import Link from 'next/link';
import type { NavigationNode } from '../../stores/navigation-store';
import { PartTitle } from './PartTitle';
import './PartRenderer.css';

export interface PartRendererProps {
  part: NavigationNode;
  queryString?: string;
}

export const PartRenderer: React.FC<PartRendererProps> = ({
  part,
  queryString = '',
}) => {
  const sectionNodes = (part.children || []).filter((child) => child.type === 'section');

  const buildHref = (path: string): string => {
    return queryString ? `${path}?${queryString}` : path;
  };

  const getSectionName = (section: NavigationNode): string => {
    if (!section.number) {
      return section.title;
    }

    const escapedSectionNumber = section.number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const numberPrefixPattern = new RegExp(`^${escapedSectionNumber}\\s+`);

    return section.title.replace(numberPrefixPattern, '');
  };

  return (
    <div className="partRenderer">
      <PartTitle title={part.title} />

      <p className="partRendererDescription">Select a section to start reading.</p>

      <div className="partSectionsGrid">
        {sectionNodes.map((section) => (
          <Link
            key={section.id}
            href={buildHref(section.path)}
            className="partSectionCard"
            aria-label={`Open Section ${section.title}`}
          >
            <h3 className="partSectionCardNumber">{section.number}</h3>
            <p className="partSectionCardTitle">{getSectionName(section)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};
