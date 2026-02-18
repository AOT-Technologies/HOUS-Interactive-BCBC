'use client';

import React from 'react';
import Icon from '@repo/ui/icon';
import { isModalReference } from '../../lib/cross-reference';
import { useCrossReferenceContext } from './CrossReferenceContext';
import { useNavigationStore, type NavigationNode } from '../../stores/navigation-store';
import './CrossReferenceLink.css';

interface CrossReferenceLinkProps {
  referenceId: string;
  displayText: string;
  format?: 'short' | 'long' | 'medium' | 'title' | 'number' | 'shortNum';
  interactive?: boolean;
}

export const CrossReferenceLink: React.FC<CrossReferenceLinkProps> = ({
  referenceId,
  displayText,
  format,
  interactive = true,
}) => {
  const { openReference, navigateReference } = useCrossReferenceContext();
  const navigationTree = useNavigationStore((s) => s.navigationTree);

  const findNodeById = (
    nodes: NavigationNode[],
    targetId: string
  ): NavigationNode | null => {
    for (const node of nodes) {
      if (node.id.toLowerCase() === targetId.toLowerCase()) {
        return node;
      }

      if (node.children && node.children.length > 0) {
        const found = findNodeById(node.children, targetId);
        if (found) return found;
      }
    }

    return null;
  };

  const resolvedDisplayText =
    format === 'title'
      ? findNodeById(navigationTree, referenceId)?.title || displayText
      : displayText;

  if (!interactive) {
    return (
      <span className="cross-reference-link cross-reference-link--non-interactive">
        {resolvedDisplayText}
      </span>
    );
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
      <span className="cross-reference-link__text">{resolvedDisplayText}</span>
    </button>
  );
};
