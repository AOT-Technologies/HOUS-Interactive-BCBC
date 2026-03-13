'use client';

import React, { useEffect, useRef } from 'react';
import './CrossReferenceModal.css';

interface CrossReferenceModalProps {
  open: boolean;
  heading: string;
  children: React.ReactNode;
  onClose: () => void;
  onGoToSection: () => void;
  showGoToSection?: boolean;
  goToSectionLabel?: string;
  scrollToReferenceId?: string | null;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selectors = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];

  return Array.from(container.querySelectorAll<HTMLElement>(selectors.join(','))).filter(
    (element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden')
  );
}

export const CrossReferenceModal: React.FC<CrossReferenceModalProps> = ({
  open,
  heading,
  children,
  onClose,
  onGoToSection,
  showGoToSection = true,
  goToSectionLabel = 'Go to Section',
  scrollToReferenceId = null,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropMouseDownRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    const modalElement = modalRef.current;
    if (!modalElement) return;

    const focusables = getFocusableElements(modalElement);
    focusables[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const elements = getFocusableElements(modalElement);
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !scrollToReferenceId) return;

    const modalElement = modalRef.current;
    if (!modalElement) return;

    const body = modalElement.querySelector<HTMLElement>('.cross-reference-modal__body');
    if (!body) return;

    const findById = (root: HTMLElement, rawTargetId: string): HTMLElement | null => {
      const targetId = rawTargetId.trim();
      const normalizedTargetId = targetId.toLowerCase();
      const allCandidates = Array.from(
        root.querySelectorAll<HTMLElement>('[id], [data-node-id]')
      );
      const getCandidateKeys = (element: HTMLElement): string[] => {
        const keys: string[] = [];
        if (element.id) keys.push(element.id.toLowerCase());
        const nodeId = element.getAttribute('data-node-id');
        if (nodeId) keys.push(nodeId.toLowerCase());
        return keys;
      };

      // 1) Exact node id match (case-insensitive), checking both `id` and `data-node-id`.
      const exact = allCandidates.find((element) =>
        getCandidateKeys(element).includes(normalizedTargetId)
      );
      if (exact) return exact;

      // 2) Fallback for deep reference IDs where upstream may vary slightly in prefix/casing.
      // Keep suffix-specific matching strict enough to avoid landing on the wrong node.
      const suffixPatterns = [
        /\.figure\d+$/i,
        /\.equation\d+$/i,
        /\.table\d+\.note\d+$/i,
        /\.sent\d+\.clause\d+\.subclause\d+$/i,
        /\.sent\d+\.clause\d+$/i,
        /\.sent\d+$/i,
        /\.table\d+$/i,
      ];

      for (const pattern of suffixPatterns) {
        const suffixMatch = normalizedTargetId.match(pattern);
        if (!suffixMatch) continue;

        const suffix = suffixMatch[0];
        const prefix = normalizedTargetId.slice(0, normalizedTargetId.length - suffix.length);
        const candidate = allCandidates.find((element) =>
          getCandidateKeys(element).some((key) =>
            key.endsWith(suffix) && (prefix ? key.startsWith(prefix) : true)
          )
        );

        if (candidate) return candidate;
      }

      return null;
    };

    const scrollToTarget = () => {
      const target = findById(body, scrollToReferenceId);
      if (!target) return;

      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.classList.add('cross-reference-modal__target--highlight');
      window.setTimeout(() => {
        target.classList.remove('cross-reference-modal__target--highlight');
      }, 1800);
    };

    const raf = window.requestAnimationFrame(scrollToTarget);
    return () => window.cancelAnimationFrame(raf);
  }, [open, scrollToReferenceId, children]);

  if (!open) return null;

  return (
    <div className="cross-reference-modal" role="dialog" aria-modal="true" aria-label={heading}>
      <div
        className="cross-reference-modal__backdrop"
        onMouseDown={() => {
          backdropMouseDownRef.current = true;
        }}
        onClick={() => {
          if (!backdropMouseDownRef.current) {
            return;
          }
          backdropMouseDownRef.current = false;
          onClose();
        }}
      />

      <div
        className="cross-reference-modal__content"
        ref={modalRef}
        onMouseDown={() => {
          backdropMouseDownRef.current = false;
        }}
      >
        <header className="cross-reference-modal__header">
          <h2 className="cross-reference-modal__heading">{heading}</h2>
          <button
            type="button"
            className="cross-reference-modal__close-button"
            aria-label="Close cross-reference modal"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <div className="cross-reference-modal__body">{children}</div>

        <footer className="cross-reference-modal__footer">
          <button
            type="button"
            className="cross-reference-modal__button--close"
            onClick={onClose}
          >
            Close
          </button>
          {showGoToSection && (
            <button
              type="button"
              className="cross-reference-modal__button--go-to-section"
              onClick={onGoToSection}
            >
              {goToSectionLabel}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
