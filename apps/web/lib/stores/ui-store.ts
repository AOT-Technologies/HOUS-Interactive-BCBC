/**
 * UI Store
 * 
 * Zustand store for managing UI state including modals, sidebars, and PDF generation.
 */

import { create } from 'zustand';
import type {
  UIState,
  CrossReference,
  SectionContent,
  SubsectionContent,
  ArticleContent,
} from '@repo/data';

/**
 * UI store for managing modal, glossary sidebar, and PDF generation state
 */
export const useUIStore = create<UIState>((set) => ({
  // Modal state
  modalOpen: false,
  modalReferenceId: null,
  modalContent: null,

  // Glossary sidebar state
  glossarySidebarOpen: false,
  activeGlossaryTermId: null,

  // PDF generation state
  pdfGenerating: false,
  pdfError: null,

  // Modal actions
  openModal: (referenceId: string, content: CrossReference) => {
    set({
      modalOpen: true,
      modalReferenceId: referenceId,
      modalContent: content,
    });
  },

  closeModal: () => {
    set({
      modalOpen: false,
      modalReferenceId: null,
      modalContent: null,
    });
  },

  // Glossary sidebar actions
  openGlossarySidebar: (termId?: string) => {
    set({
      glossarySidebarOpen: true,
      activeGlossaryTermId: termId || null,
    });
  },

  closeGlossarySidebar: () => {
    set({
      glossarySidebarOpen: false,
      activeGlossaryTermId: null,
    });
  },

  // PDF generation actions
  generatePdf: async (
    _content: SectionContent | SubsectionContent | ArticleContent,
    _renderLevel: string
  ) => {
    set({ pdfGenerating: true, pdfError: null });

    try {
      // PDF generation logic will be implemented in Task 9
      // For now, this is a placeholder
      await new Promise((resolve) => setTimeout(resolve, 1000));

      set({ pdfGenerating: false });
    } catch (error) {
      set({
        pdfGenerating: false,
        pdfError: error instanceof Error ? error.message : 'PDF generation failed',
      });
    }
  },

  reset: () =>
    set({
      modalOpen: false,
      modalReferenceId: null,
      modalContent: null,
      glossarySidebarOpen: false,
      activeGlossaryTermId: null,
      pdfGenerating: false,
      pdfError: null,
    }),
}));
