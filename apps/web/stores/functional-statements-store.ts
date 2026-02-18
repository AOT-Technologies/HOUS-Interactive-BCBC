import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useVersionStore } from './version-store';

export interface FunctionalStatement {
  id: string;
  key: string;
  definition: string;
  source?: 'nbc' | 'bc';
}

interface FunctionalStatementsStore {
  statementsMap: Map<string, FunctionalStatement>;
  loading: boolean;
  loadedVersion: string | null;
  error: Error | null;
  getStatement: (statementId: string) => FunctionalStatement | undefined;
  loadStatements: () => Promise<void>;
}

let statementsLoadPromise: Promise<void> | null = null;
let statementsLoadVersion: string | null = null;

export const useFunctionalStatementsStore = create<FunctionalStatementsStore>()(
  devtools(
    (set, get) => ({
      statementsMap: new Map(),
      loading: false,
      loadedVersion: null,
      error: null,

      getStatement: (statementId) => {
        const normalizedId = statementId.toLowerCase().trim();
        const { statementsMap } = get();

        const directMatch = statementsMap.get(normalizedId);
        if (directMatch) return directMatch;

        // Handle "fs01" -> "f01"
        if (normalizedId.startsWith('fs')) {
          const withoutFsPrefix = `f${normalizedId.slice(2)}`;
          const prefixedMatch = statementsMap.get(withoutFsPrefix);
          if (prefixedMatch) return prefixedMatch;
        }

        // Backward compatibility for legacy keys ("fsf01")
        if (/^f\d+/.test(normalizedId)) {
          const legacyPrefixed = `fs${normalizedId}`;
          const legacyMatch = statementsMap.get(legacyPrefixed);
          if (legacyMatch) return legacyMatch;
        }

        return undefined;
      },

      loadStatements: async () => {
        const versionStore = useVersionStore.getState();
        const versionId = versionStore.currentVersion || '2024';
        const versionDataPath = versionStore.getVersionDataPath(versionId);
        const { statementsMap, loadedVersion, loading } = get();

        if (loadedVersion === versionId && statementsMap.size > 0) {
          return;
        }

        if (loading && statementsLoadPromise && statementsLoadVersion === versionId) {
          await statementsLoadPromise;
          return;
        }

        set({ loading: true, error: null });
        statementsLoadVersion = versionId;

        statementsLoadPromise = (async () => {
          try {
            const response = await fetch(`${versionDataPath}/functional-statements.json`);
            const finalResponse = response.ok
              ? response
              : await fetch('/data/functional-statements.json');

            if (!finalResponse.ok) {
              throw new Error(`Failed to load functional statements: ${finalResponse.status}`);
            }

            const data = await finalResponse.json();
            const source =
              data && typeof data === 'object' && data.statements && typeof data.statements === 'object'
                ? (data.statements as Record<string, FunctionalStatement>)
                : (data as Record<string, FunctionalStatement>);

            const nextMap = new Map<string, FunctionalStatement>();

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

                if (normalizedValueKey.startsWith('f')) {
                  nextMap.set(`fs${normalizedValueKey.slice(1)}`, value);
                }
              }
            });

            set({
              statementsMap: nextMap,
              loading: false,
              loadedVersion: versionId,
              error: null,
            });
          } catch (error) {
            console.error('Error loading functional statements:', error);
            set({
              loading: false,
              error: error instanceof Error ? error : new Error('Unknown error'),
            });
          } finally {
            statementsLoadPromise = null;
            statementsLoadVersion = null;
          }
        })();

        await statementsLoadPromise;
      },
    }),
    { name: 'functional-statements-store' }
  )
);
