'use client';

import React from 'react';
import { useVersionStore } from '@/stores/version-store';
import { useAmendmentDateStore } from '@/stores/amendment-date-store';
import './PrintFooter.css';

/**
 * Renders a footer that is invisible on screen and fixed at the bottom of every
 * printed page, showing the code edition and effective date.
 */
export const PrintFooter: React.FC = () => {
  const currentVersion = useVersionStore((state) => state.currentVersion);
  const availableVersions = useVersionStore((state) => state.availableVersions);
  const selectedDate = useAmendmentDateStore((state) => state.selectedDate);
  const datesByVersion = useAmendmentDateStore((state) => state.datesByVersion);

  const version = (availableVersions ?? []).find((v) => v.id === currentVersion);
  const dates = (datesByVersion instanceof Map ? datesByVersion.get(currentVersion ?? '') : undefined) ?? [];
  const dateInfo = dates.find((d) => d.date === selectedDate);
  const dateLabel = dateInfo?.label ?? selectedDate ?? 'Latest';

  const editionText = version?.title ?? 'BC Building Code';
  const effectiveText = `Effective: ${dateLabel}`;

  return (
    <div className="print-footer" aria-hidden="true">
      <span className="print-footer__edition">{editionText}</span>
      <span className="print-footer__date">{effectiveText}</span>
    </div>
  );
};
