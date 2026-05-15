/**
 * FrontMatterRenderer Component
 * 
 * Renders front matter content (preface, introduction, committees)
 * Handles paragraphs, headings, tables, and other content types
 */

'use client';

import React from 'react';
import type { FrontMatterSection, FrontMatterContentItem } from '../../lib/stores/front-matter-store';
import { TableBlock } from './TableBlock';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import './FrontMatterRenderer.css';

interface FrontMatterRendererProps {
  section: FrontMatterSection;
  interactive?: boolean;
}

export const FrontMatterRenderer: React.FC<FrontMatterRendererProps> = ({
  section,
  interactive = true,
}) => {
  const renderContentItem = (item: FrontMatterContentItem): React.ReactNode => {
    switch (item.type) {
      case 'paragraph': {
        const paragraphLists = item.lists || [];
        const paragraphEquations = item.equations || [];
        const hasBlockContent =
          Boolean(paragraphLists.length) ||
          /\[LIST:[^\]]+\]|\[EQ:display(?::[^\]]*)?\]/i.test(item.content || '');
        const WrapperTag = hasBlockContent ? 'div' : 'p';
        return (
          <WrapperTag key={item.id} id={item.id} className="front-matter__paragraph">
            {item.content
              ? parseTextWithMarkers(item.content, [], interactive, paragraphEquations, paragraphLists)
              : ''}
          </WrapperTag>
        );
      }

      case 'heading':
        const HeadingTag = `h${Math.min(item.level || 2, 6)}` as keyof React.JSX.IntrinsicElements;
        return (
          <HeadingTag key={item.id} id={item.id} className={`front-matter__heading front-matter__heading--level-${item.level || 2}`}>
            {item.content || ''}
          </HeadingTag>
        );

      case 'table':
        // Tables in front matter use the same structure as code tables
        return (
          <TableBlock
            key={item.id}
            table={item as any}
            interactive={interactive}
          />
        );

      case 'figure':
        return (
          <figure key={item.id} id={item.id} className="front-matter__figure">
            {item.content && <figcaption>{item.content}</figcaption>}
          </figure>
        );

      case 'list':
        return (
          <div key={item.id} id={item.id} className="front-matter__list">
            {item.content && <p>{item.content}</p>}
          </div>
        );

      default:
        // Fallback for unknown types
        return (
          <div key={item.id} id={item.id} className="front-matter__unknown">
            {item.content && <p>{item.content}</p>}
          </div>
        );
    }
  };

  const getSectionTitle = (): string => {
    if (section.title) {
      return section.title;
    }

    // Default titles based on section type
    switch (section.type) {
      case 'preface':
        return 'Preface';
      case 'introduction':
        return 'Introduction';
      case 'committees':
        return 'Committees';
      default:
        return 'Preface';
    }
  };

  return (
    <div className="front-matter-renderer">
      <h1 className="front-matter-renderer__title">{getSectionTitle()}</h1>

      <div className="front-matter-renderer__content">
        {/* Render content items (paragraphs, headings, etc.) */}
        {section.content?.map((item) => renderContentItem(item))}

        {/* Render tables (for committees section) */}
        {section.tables?.map((table, index) => (
          <TableBlock
            key={table.id || `table-${index}`}
            table={table}
            interactive={interactive}
          />
        ))}

        {/* Render notes (for committees section) */}
        {section.notes?.map((note, index) => (
          <div key={note.id || `note-${index}`} className="front-matter__note">
            {note.content && <p>{parseTextWithMarkers(note.content, [], interactive)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
