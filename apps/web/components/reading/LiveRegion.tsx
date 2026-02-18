/**
 * LiveRegion Component
 * 
 * ARIA live region for announcing dynamic content updates to screen readers.
 * WCAG AAA requirement for accessibility.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import './LiveRegion.css';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive' | 'off';
  clearAfter?: number; // Clear message after X milliseconds
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  politeness = 'polite',
  clearAfter = 5000,
}) => {
  const [currentMessage, setCurrentMessage] = React.useState(message);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (message) {
      setCurrentMessage(message);

      // Clear message after specified time
      if (clearAfter > 0) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          setCurrentMessage('');
        }, clearAfter);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfter]);

  return (
    <div
      className="live-region"
      role="status"
      aria-live={politeness}
      aria-atomic="true"
    >
      {currentMessage}
    </div>
  );
};

/**
 * Hook for managing live region announcements
 */
export function useLiveRegion() {
  const [message, setMessage] = React.useState('');
  const [politeness, setPoliteness] = React.useState<'polite' | 'assertive'>('polite');

  const announce = (text: string, level: 'polite' | 'assertive' = 'polite') => {
    setPoliteness(level);
    setMessage(text);
  };

  const clear = () => {
    setMessage('');
  };

  return {
    message,
    politeness,
    announce,
    clear,
  };
}
