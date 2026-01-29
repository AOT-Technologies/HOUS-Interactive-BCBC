import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Amendment date interface
 */
export interface AmendmentDate {
  date: string;
  label: string;
  description?: string;
  isLatest?: boolean;
}

/**
 * Amendment date store state interface
 */
interface AmendmentDateStore {
  selectedDate: string | null;
  availableDates: AmendmentDate[];
  loading: boolean;
  setSelectedDate: (date: string | null) => void;
  loadDates: () => Promise<void>;
}

/**
 * Amendment date store
 * Manages selected amendment date and available dates
 * Persists selected date to localStorage
 */
export const useAmendmentDateStore = create<AmendmentDateStore>()(
  devtools(
    persist(
      (set, get) => ({
        selectedDate: null,
        availableDates: [],
        loading: false,

        setSelectedDate: (date) => {
          set({ selectedDate: date });
          
          // Sync with URL query parameters
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (date) {
              url.searchParams.set('date', date);
            } else {
              url.searchParams.delete('date');
            }
            window.history.replaceState({}, '', url);
          }
        },

        loadDates: async () => {
          set({ loading: true });
          try {
            // TODO: Load amendment dates from /public/data/amendment-dates.json
            // This will be implemented in Sprint 1 after the build pipeline is set up
            const response = await fetch('/data/amendment-dates.json');
            if (response.ok) {
              const data = await response.json();
              set({ 
                availableDates: data.dates || [], 
                loading: false 
              });
              
              // Set latest date as default if no date is selected
              const { selectedDate } = get();
              const latestDate = data.dates?.find((d: AmendmentDate) => d.isLatest);
              if (latestDate && !selectedDate) {
                set({ selectedDate: latestDate.date });
              }
            } else {
              console.error('Failed to load amendment dates');
              set({ loading: false });
            }
          } catch (error) {
            console.error('Error loading amendment dates:', error);
            set({ loading: false });
          }
        },
      }),
      {
        name: 'amendment-date-storage',
        partialize: (state) => ({ selectedDate: state.selectedDate }),
      }
    ),
    { name: 'amendment-date-store' }
  )
);
