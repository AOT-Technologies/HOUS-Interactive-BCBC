import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Modal types
 */
export type ModalType = 'glossary' | 'note' | null;

/**
 * UI store state interface
 */
interface UIStore {
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  activeModal: ModalType;
  modalData: any;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  openModal: (type: Exclude<ModalType, null>, data: any) => void;
  closeModal: () => void;
}

/**
 * UI store
 * Manages UI state including sidebar, mobile menu, and modals
 * Persists sidebar state to localStorage
 */
export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        mobileMenuOpen: false,
        activeModal: null,
        modalData: null,

        toggleSidebar: () =>
          set((state) => ({ sidebarOpen: !state.sidebarOpen })),

        setSidebarOpen: (open) => set({ sidebarOpen: open }),

        toggleMobileMenu: () =>
          set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

        setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

        openModal: (type, data) =>
          set({ activeModal: type, modalData: data }),

        closeModal: () => set({ activeModal: null, modalData: null }),
      }),
      {
        name: 'ui-storage',
        partialize: (state) => ({ sidebarOpen: state.sidebarOpen }),
      }
    ),
    { name: 'ui-store' }
  )
);
