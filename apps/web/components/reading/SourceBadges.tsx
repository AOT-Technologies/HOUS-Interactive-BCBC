/**
 * SourceBadges Component
 * 
 * Legend badges showing BC Building Code and NBC indicators.
 * Displays at the top-right of the reading view to help users understand
 * the colored borders on content blocks.
 */

import styles from './SourceBadges.module.css';

export function SourceBadges() {
  return (
    <div className={styles['source-badges']}>
      <div className={`${styles['source-badges__badge']} ${styles['source-badges__badge--bcbc']}`}>
        BC Building Code
      </div>
      <div className={`${styles['source-badges__badge']} ${styles['source-badges__badge--nbc']}`}>
        NBC
      </div>
    </div>
  );
}
