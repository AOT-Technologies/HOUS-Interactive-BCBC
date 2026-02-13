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

  return (
    <div className="partRenderer">
      <PartTitle title={`${part.number} ${part.title}`} />

      <p className="partRendererDescription">Select a section to start reading.</p>

      <div className="partSectionsGrid">
        {sectionNodes.map((section) => (
          <Link
            key={section.id}
            href={buildHref(section.path)}
            className="partSectionCard"
            aria-label={`Open Section ${section.number} ${section.title}`}
          >
            <span className="partSectionCardType">Section</span>
            <h3 className="partSectionCardTitle">
              {section.number} {section.title}
            </h3>
          </Link>
        ))}
      </div>
    </div>
  );
};
