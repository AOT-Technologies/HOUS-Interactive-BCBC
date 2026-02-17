'use client';

import { createContext, useContext } from 'react';

interface CrossReferenceContextValue {
  openReference: (referenceId: string, triggerElement: HTMLElement | null) => void;
  navigateReference: (referenceId: string) => void;
}

const defaultValue: CrossReferenceContextValue = {
  openReference: () => {},
  navigateReference: () => {},
};

export const CrossReferenceContext = createContext<CrossReferenceContextValue>(defaultValue);

export function useCrossReferenceContext(): CrossReferenceContextValue {
  return useContext(CrossReferenceContext);
}
