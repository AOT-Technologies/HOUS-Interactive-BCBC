/**
 * ContentSourceIndicator Component
 * 
 * Wrapper component that applies colored left border based on content source.
 * - BC content: 3px solid #FCBA19 (yellow) left border
 * - NBC content: 3px solid #003366 (dark blue) left border
 * - No source: No border
 */

import React from 'react';
import styles from './ContentSourceIndicator.module.css';

export interface ContentSourceIndicatorProps {
  source?: 'bcbc' | 'nbc';
  children: React.ReactNode;
}

export function ContentSourceIndicator({ source, children }: ContentSourceIndicatorProps) {
  // If no source, render children without wrapper
  if (!source) {
    return <>{children}</>;
  }

  // Apply appropriate class based on source
  const className = source === 'bcbc' 
    ? `${styles['content-source-indicator']} ${styles['content-source-indicator--bcbc']}`
    : `${styles['content-source-indicator']} ${styles['content-source-indicator--nbc']}`;

  return (
    <div className={className}>
      {children}
    </div>
  );
}
