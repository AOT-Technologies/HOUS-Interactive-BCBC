import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useVersionStore } from './version-store';

export interface SubObjective {
  id: string;
  key: string;
  title: string;
  definition: string;
  source?: 'nbc' | 'bc';
}

export interface Objective {
  id: string;
  key: string;
  title: string;
  definition: string;
  source?: 'nbc' | 'bc';
  subObjectives?: SubObjective[];
}

type ObjectiveEntry = Objective | SubObjective;

interface ObjectivesStore {
  objectivesMap: Map<string, ObjectiveEntry>;
  loading: boolean;
  loadedVersion: string | null;
  error: Error | null;
  getObjective: (objectiveId: string) => ObjectiveEntry | undefined;
  loadObjectives: () => Promise<void>;
}

let objectivesLoadPromise: Promise<void> | null = null;
let objectivesLoadVersion: string | null = null;

export const useObjectivesStore = create<ObjectivesStore>()(
  devtools(
    (set, get) => ({
      objectivesMap: new Map(),
      loading: false,
      loadedVersion: null,
      error: null,

      getObjective: (objectiveId) => {
        const normalizedId = objectiveId.toLowerCase().trim();
        const { objectivesMap } = get();

        const directMatch = objectivesMap.get(normalizedId);
        if (directMatch) return directMatch;

        // Sub-objectives can appear as dotted or dashed formats (e.g., os1.2 vs os1-2).
        if (normalizedId.includes('.')) {
          const dashed = normalizedId.replace(/\./g, '-');
          const dashedMatch = objectivesMap.get(dashed);
          if (dashedMatch) return dashedMatch;
        }

        if (normalizedId.includes('-')) {
          const dotted = normalizedId.replace(/-(\d+)/g, '.$1');
          const dottedMatch = objectivesMap.get(dotted);
          if (dottedMatch) return dottedMatch;
        }

        return undefined;
      },

      loadObjectives: async () => {
        const versionStore = useVersionStore.getState();
        const versionId = versionStore.currentVersion || '2024';
        const versionDataPath = versionStore.getVersionDataPath(versionId);
        const { objectivesMap, loadedVersion, loading } = get();

        if (loadedVersion === versionId && objectivesMap.size > 0) {
          return;
        }

        if (loading && objectivesLoadPromise && objectivesLoadVersion === versionId) {
          await objectivesLoadPromise;
          return;
        }

        set({ loading: true, error: null });
        objectivesLoadVersion = versionId;

        objectivesLoadPromise = (async () => {
          try {
            const response = await fetch(`${versionDataPath}/objectives.json`);
            const finalResponse = response.ok
              ? response
              : await fetch('/data/objectives.json');

            if (!finalResponse.ok) {
              throw new Error(`Failed to load objectives: ${finalResponse.status}`);
            }

            const data = await finalResponse.json();
            const source =
              data && typeof data === 'object' && data.objectives && typeof data.objectives === 'object'
                ? (data.objectives as Record<string, ObjectiveEntry>)
                : (data as Record<string, ObjectiveEntry>);

            const nextMap = new Map<string, ObjectiveEntry>();

            Object.entries(source || {}).forEach(([key, value]) => {
              if (!value || typeof value !== 'object') return;

              const normalizedKey = key.toLowerCase().trim();
              nextMap.set(normalizedKey, value);

              if (typeof value.id === 'string' && value.id.trim()) {
                nextMap.set(value.id.toLowerCase().trim(), value);
              }

              if (typeof value.key === 'string' && value.key.trim()) {
                const normalizedValueKey = value.key.toLowerCase().trim();
                nextMap.set(normalizedValueKey, value);
                nextMap.set(`nbc-obj-${normalizedValueKey}`, value);
              }
            });

            set({
              objectivesMap: nextMap,
              loading: false,
              loadedVersion: versionId,
              error: null,
            });
          } catch (error) {
            console.error('Error loading objectives:', error);
            set({
              loading: false,
              error: error instanceof Error ? error : new Error('Unknown error'),
            });
          } finally {
            objectivesLoadPromise = null;
            objectivesLoadVersion = null;
          }
        })();

        await objectivesLoadPromise;
      },
    }),
    { name: 'objectives-store' }
  )
);
