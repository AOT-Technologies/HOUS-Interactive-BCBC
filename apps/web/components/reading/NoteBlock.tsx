import React from 'react';
import type { NoteBlockProps, InlineContent } from '@repo/data';
import './NoteBlock.css';

/**
 * NoteBlock Component
 * 
 * Renders note references with proper formatting.
 * Supports both inline note references and full note display.
 * 
 * Requirements: Data model completeness
 */

// Helper to render inline content within notes
const renderInlineContent = (content: InlineContent[]): React.ReactNode => {
  return content.map((item, index) => {
    if (item.type === 'text') {
      return <span key={index}>{item.text}</span>;
    }
    // Placeholder for glossary terms and cross-references
    if (item.type === 'glossary-term') {
      return <em key={index}>{item.text}</em>;
    }
    if (item.type === 'cross-reference') {
      return <span key={index}>{item.text}</span>;
    }
    if (item.type === 'note-reference') {
      return <span key={index}>{item.text}</span>;
    }
    return <span key={index}>{item.text}</span>;
  });
};

export const NoteBlock: React.FC<NoteBlockProps> = ({ note }) => {
  return (
    <div className="note-block" id={note.id}>
      <span className="note-block__reference" aria-label={`Note ${note.reference}`}>
        {note.reference}
      </span>
      <span className="note-block__content">
        {renderInlineContent(note.content)}
      </span>
    </div>
  );
};

