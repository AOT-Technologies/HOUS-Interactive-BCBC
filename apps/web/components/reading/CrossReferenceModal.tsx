'use client';

import React, { useEffect, useRef } from 'react';
import {
  findReferenceTarget,
  focusReferenceTarget,
  scrollTargetIntoView,
} from './reference-target';
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

    const scrollToTarget = () => {
      const target = findReferenceTarget(body, scrollToReferenceId);
      if (!target) return;

      const restoreFocusability = focusReferenceTarget(target);
      scrollTargetIntoView(target, body);
      target.classList.add('cross-reference-modal__target--highlight');
      window.setTimeout(() => {
        target.classList.remove('cross-reference-modal__target--highlight');
        restoreFocusability();
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
