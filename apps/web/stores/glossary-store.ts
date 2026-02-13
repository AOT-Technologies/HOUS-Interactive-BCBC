import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useVersionStore } from './version-store';

/**
 * Glossary entry interface
 */
export interface GlossaryEntry {
  id?: string;
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
  loadedVersion: string | null;
  setSelectedTerm: (term: string | null) => void;
  getTerm: (term: string) => GlossaryEntry | undefined;
  loadGlossary: () => Promise<void>;
}

/**
 * In-flight glossary request deduplication.
 * Prevents many GlossaryTerm instances from triggering duplicate fetches.
 */
let glossaryLoadPromise: Promise<void> | null = null;
let glossaryLoadVersion: string | null = null;

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
      loadedVersion: null,

      setSelectedTerm: (term) => set({ selectedTerm: term }),

      getTerm: (term) => {
        const { glossaryMap } = get();
        return glossaryMap.get(term.toLowerCase());
      },

      loadGlossary: async () => {
        const versionStore = useVersionStore.getState();
        const versionId = versionStore.currentVersion || '2024';
        const versionDataPath = versionStore.getVersionDataPath(versionId);
        const { glossaryMap, loadedVersion, loading } = get();

        // Already loaded for this version.
        if (loadedVersion === versionId && glossaryMap.size > 0) {
          return;
        }

        // Reuse in-flight request for the same version.
        if (loading && glossaryLoadPromise && glossaryLoadVersion === versionId) {
          await glossaryLoadPromise;
          return;
        }

        set({ loading: true });

        glossaryLoadVersion = versionId;
        glossaryLoadPromise = (async () => {
          try {
            // Primary: versioned multi-version path
            // Fallback: legacy single-version path
            const response = await fetch(`${versionDataPath}/glossary-map.json`);
            const finalResponse = response.ok ? response : await fetch('/data/glossary-map.json');

            if (!finalResponse.ok) {
              throw new Error(`Failed to load glossary: ${finalResponse.status}`);
            }

            const data = await finalResponse.json();
            const nextGlossaryMap = new Map<string, GlossaryEntry>();

            // Convert object to Map.
            // Supports both shapes:
            // 1) { terms: { key: entry } } (legacy)
            // 2) { key: entry } where entry has { id, term, definition } (current)
            const entriesSource =
              data && typeof data === 'object' && data.terms && typeof data.terms === 'object'
                ? (data.terms as Record<string, GlossaryEntry>)
                : (data as Record<string, GlossaryEntry>);

            Object.entries(entriesSource).forEach(([key, value]) => {
              if (!value || typeof value !== 'object') {
                return;
              }

              // Primary lookup by readable term key
              nextGlossaryMap.set(key.toLowerCase(), value);

              // Secondary lookup by glossary id used in markers, e.g. [REF:term:bldng]
              if (value.id) {
                nextGlossaryMap.set(value.id.toLowerCase(), value);
              }

              // Secondary lookup by normalized term text
              if (value.term) {
                nextGlossaryMap.set(value.term.toLowerCase(), value);
              }
            });

            set({
              glossaryMap: nextGlossaryMap,
              loading: false,
              loadedVersion: versionId,
            });
          } catch (error) {
            console.error('Error loading glossary:', error);
            set({ loading: false });
          } finally {
            glossaryLoadPromise = null;
            glossaryLoadVersion = null;
          }
        })();

        await glossaryLoadPromise;
      },
    }),
    { name: 'glossary-store' }
  )
);
