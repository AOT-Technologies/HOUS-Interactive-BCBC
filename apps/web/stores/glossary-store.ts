import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Glossary entry interface
 */
export interface GlossaryEntry {
  term: string;
  definition: string;
  relatedTerms?: string[];
}

/**
 * Glossary store state interface
 */
interface GlossaryStore {
  glossaryMap: Map<string, GlossaryEntry>;
  selectedTerm: string | null;
  loading: boolean;
  setSelectedTerm: (term: string | null) => void;
  getTerm: (term: string) => GlossaryEntry | undefined;
  loadGlossary: () => Promise<void>;
}

/**
 * Glossary store
 * Manages glossary map and selected term
 */
export const useGlossaryStore = create<GlossaryStore>()(
  devtools(
    (set, get) => ({
      glossaryMap: new Map(),
      selectedTerm: null,
      loading: false,

      setSelectedTerm: (term) => set({ selectedTerm: term }),

      getTerm: (term) => {
        const { glossaryMap } = get();
        return glossaryMap.get(term.toLowerCase());
      },

      loadGlossary: async () => {
        set({ loading: true });
        try {
          // TODO: Load glossary from /public/data/glossary-map.json
          // This will be implemented in Sprint 1 after the build pipeline is set up
          const response = await fetch('/data/glossary-map.json');
          if (response.ok) {
            const data = await response.json();
            const glossaryMap = new Map<string, GlossaryEntry>();
            
            // Convert object to Map
            if (data.terms) {
              Object.entries(data.terms).forEach(([key, value]) => {
                glossaryMap.set(key.toLowerCase(), value as GlossaryEntry);
              });
            }
            
            set({ glossaryMap, loading: false });
          } else {
            console.error('Failed to load glossary');
            set({ loading: false });
          }
        } catch (error) {
          console.error('Error loading glossary:', error);
          set({ loading: false });
        }
      },
    }),
    { name: 'glossary-store' }
  )
);
