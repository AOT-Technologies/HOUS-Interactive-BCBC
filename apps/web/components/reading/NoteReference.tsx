'use client';

import React from 'react';
import './NoteReference.css';

/**
 * NoteReference Component
 * 
 * Renders inline note references that link to note content.
 * Used within clause content to reference notes in the appendix.
 */

interface NoteReferenceProps {
  referenceId: string;
  text: string;
  interactive?: boolean;
}

export const NoteReference: React.FC<NoteReferenceProps> = ({ 
  referenceId, 
  text, 
  interactive = true 
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (!interactive) {
      e.preventDefault();
      return;
    }
    
    // Scroll to the note in the appendix
    const noteElement = document.getElementById(referenceId);
    if (noteElement) {
      noteElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Add a temporary highlight effect
      noteElement.classList.add('note-block--highlighted');
      setTimeout(() => {
        noteElement.classList.remove('note-block--highlighted');
      }, 2000);
    }
  };

  if (!interactive) {
    return <sup className="note-reference note-reference--non-interactive">{text}</sup>;
  }

  return (
    <sup className="note-reference">
      <a
        href={`#${referenceId}`}
        className="note-reference__link"
        onClick={handleClick}
        aria-label={`Go to note ${text}`}
      >
        {text}
      </a>
    </sup>
  );
};

