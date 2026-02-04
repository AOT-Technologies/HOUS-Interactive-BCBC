import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useVersionStore } from './version-store';

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
  datesByVersion: Map<string, AmendmentDate[]>;
  loading: boolean;
  initialized: boolean;
  setSelectedDate: (date: string | null) => void;
  loadDates: (version: string, options?: { preserveUrlDate?: boolean }) => Promise<void>;
  initializeFromUrl: () => void;
}

/**
 * Amendment date store
 * Manages selected amendment date and available dates
 * 
 * URL Sync Behavior:
 * - On initial load: Read date from URL if present, otherwise use latest
 * - On version change: Reset to latest date, update URL
 * - On date change: Update URL
 */
export const useAmendmentDateStore = create<AmendmentDateStore>()(
  devtools(
    persist(
      (set, get) => ({
        selectedDate: null,
        availableDates: [],
        datesByVersion: new Map(),
        loading: false,
        initialized: false,

        /**
         * Set the selected date and sync to URL
         */
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
            window.history.replaceState({}, '', url.toString());
          }
        },

        /**
         * Initialize date from URL on first load
         * Called once after versions are loaded
         */
        initializeFromUrl: () => {
          if (typeof window === 'undefined') return;
          
          const params = new URLSearchParams(window.location.search);
          const urlDate = params.get('date');
          
          if (urlDate) {
            // URL has a date, store it (will be validated when dates load)
            set({ selectedDate: urlDate, initialized: true });
          } else {
            set({ initialized: true });
          }
        },

        /**
         * Load dates for a specific version
         * @param version - Version ID to load dates for
         * @param options.preserveUrlDate - If true, preserve date from URL (for initial load)
         */
        loadDates: async (version, options = {}) => {
          set({ loading: true });
          
          const versionStore = useVersionStore.getState();
          const dataPath = versionStore.getVersionDataPath(version);
          
          try {
            const response = await fetch(`${dataPath}/amendment-dates.json`);
            if (!response.ok) {
              throw new Error(`Failed to load: ${response.status}`);
            }
            
            const rawData = await response.json();
            
            // Transform the data from JSON format to store format
            const transformedDates: AmendmentDate[] = (rawData.dates || []).map((d: any, index: number) => ({
              date: d.effectiveDate,
              label: d.displayDate,
              description: `${d.count} ${d.type === 'original' ? 'original provisions' : 'amendments'}`,
              isLatest: index === 0
            }));
            
            // Cache dates by version
            const { datesByVersion, selectedDate } = get();
            const newMap = new Map(datesByVersion);
            newMap.set(version, transformedDates);
            
            // Determine which date to select
            let dateToSelect: string | null = null;
            
            if (options.preserveUrlDate && selectedDate) {
              // Check if the URL date is valid for this version
              const isValidDate = transformedDates.some(d => d.date === selectedDate);
              if (isValidDate) {
                dateToSelect = selectedDate;
              } else {
                // URL date not valid for this version, use latest
                dateToSelect = transformedDates[0]?.date || null;
              }
            } else {
              // Version changed or no URL date - use latest
              dateToSelect = transformedDates[0]?.date || null;
            }
            
            set({ 
              availableDates: transformedDates,
              datesByVersion: newMap,
              selectedDate: dateToSelect,
              loading: false 
            });
            
            // Sync to URL
            if (typeof window !== 'undefined' && dateToSelect) {
              const url = new URL(window.location.href);
              url.searchParams.set('date', dateToSelect);
              window.history.replaceState({}, '', url.toString());
            }
            
          } catch (error) {
            console.error('Error loading amendment dates:', error);
            set({ loading: false });
          }
        },
      }),
      {
        name: 'amendment-date-storage',
        // Don't persist selectedDate - always read from URL or default to latest
        partialize: () => ({}),
      }
    ),
    { name: 'amendment-date-store' }
  )
);
