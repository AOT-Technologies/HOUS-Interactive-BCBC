import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useVersionStore } from './version-store';

export interface EquationEntry {
  id: string;
  type?: 'display' | 'inline' | string;
  latex?: string;
  plainText?: string;
  mathml?: string;
  image?: string;
  imageSrc?: string;
}

interface EquationStore {
  equationMap: Map<string, EquationEntry>;
  loading: boolean;
  loadedVersion: string | null;
  getEquation: (id: string) => EquationEntry | undefined;
  loadEquationMap: () => Promise<void>;
}

let equationLoadPromise: Promise<void> | null = null;
let equationLoadVersion: string | null = null;

export const useEquationStore = create<EquationStore>()(
  devtools(
    (set, get) => ({
      equationMap: new Map(),
      loading: false,
      loadedVersion: null,

      getEquation: (id) => {
        const normalized = id.toLowerCase().trim();
        return get().equationMap.get(normalized);
      },

      loadEquationMap: async () => {
        const versionStore = useVersionStore.getState();
        const versionId = versionStore.currentVersion || '2024';
        const versionDataPath = versionStore.getVersionDataPath(versionId);
        const { equationMap, loadedVersion, loading } = get();

        if (loadedVersion === versionId && equationMap.size > 0) {
          return;
        }

        if (loading && equationLoadPromise && equationLoadVersion === versionId) {
          await equationLoadPromise;
          return;
        }

        set({ loading: true });
        equationLoadVersion = versionId;

        equationLoadPromise = (async () => {
          try {
            const response = await fetch(`${versionDataPath}/equation-map.json`);
            const finalResponse = response.ok ? response : await fetch('/data/equation-map.json');

            if (!finalResponse.ok) {
              throw new Error(`Failed to load equation map: ${finalResponse.status}`);
            }

            const data = (await finalResponse.json()) as Record<string, EquationEntry>;
            const nextEquationMap = new Map<string, EquationEntry>();

            Object.entries(data || {}).forEach(([key, value]) => {
              if (!value || typeof value !== 'object') return;
              nextEquationMap.set(key.toLowerCase(), value);
              if (typeof value.id === 'string' && value.id.trim()) {
                nextEquationMap.set(value.id.toLowerCase().trim(), value);
              }
            });

            set({
              equationMap: nextEquationMap,
              loading: false,
              loadedVersion: versionId,
            });
          } catch (error) {
            console.error('Error loading equation map:', error);
            set({ loading: false });
          } finally {
            equationLoadPromise = null;
            equationLoadVersion = null;
          }
        })();

        await equationLoadPromise;
      },
    }),
    { name: 'equation-store' }
  )
);
