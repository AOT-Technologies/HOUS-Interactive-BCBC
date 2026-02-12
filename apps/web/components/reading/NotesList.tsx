import React from 'react';
import type { NoteReference } from '@bc-building-code/bcbc-parser';
import { NoteBlock } from './NoteBlock';
import './NotesList.css';

/**
 * NotesList Component
 * 
 * Renders a collection of notes, typically displayed as an appendix
 * at the end of a section or article.
 */

interface NotesListProps {
  notes: NoteReference[];
  title?: string;
}

export const NotesList: React.FC<NotesListProps> = ({ 
  notes, 
  title = 'Notes' 
}) => {
  if (!notes || notes.length === 0) {
    return null;
  }

  return (
    <section className="notes-list" aria-labelledby="notes-heading">
      <h3 id="notes-heading" className="notes-list__heading">
        {title}
      </h3>
      <div className="notes-list__content">
        {notes.map((note) => (
          <NoteBlock key={note.id} note={note} />
        ))}
      </div>
    </section>
  );
};

