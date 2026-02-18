import React from 'react';
import type { NoteReference } from '@bc-building-code/bcbc-parser';
import './NoteBlock.css';

export interface NoteBlockProps {
  note: NoteReference;
  interactive?: boolean;
}

/**
 * NoteBlock Component
 * 
 * Renders note references with proper formatting.
 * Supports both inline note references and full note display.
 */
export const NoteBlock: React.FC<NoteBlockProps> = ({ note, interactive: _interactive = true }) => {
  return (
    <div className="note-block" id={note.id}>
      <span className="note-block__reference" aria-label={`Note ${note.noteNumber}`}>
        {note.noteNumber}
      </span>
      <div className="note-block__content">
        <div className="note-block__title">{note.noteTitle}</div>
        <div className="note-block__text">{note.noteContent}</div>
      </div>
    </div>
  );
};

