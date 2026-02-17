'use client';

import React from 'react';
import Icon from '@repo/ui/icon';
import { isModalReference } from '../../lib/cross-reference';
import { useCrossReferenceContext } from './CrossReferenceContext';
import './CrossReferenceLink.css';

interface CrossReferenceLinkProps {
  referenceId: string;
  displayText: string;
  interactive?: boolean;
}

export const CrossReferenceLink: React.FC<CrossReferenceLinkProps> = ({
  referenceId,
  displayText,
  interactive = true,
}) => {
  const { openReference, navigateReference } = useCrossReferenceContext();

  if (!interactive) {
    return <span className="cross-reference-link cross-reference-link--non-interactive">{displayText}</span>;
  }

  const modalType = isModalReference(referenceId);

  return (
    <button
      type="button"
      className="cross-reference-link cross-reference-link--interactive"
      aria-haspopup={modalType ? 'dialog' : undefined}
      onClick={(event) => {
        if (modalType) {
          openReference(referenceId, event.currentTarget);
          return;
        }

        navigateReference(referenceId);
      }}
    >
      <span className="cross-reference-link__icon" aria-hidden="true">
        <Icon type="info" style={{ color: '#1A5A96' }} />
      </span>
      <span>{displayText}</span>
    </button>
  );
};
