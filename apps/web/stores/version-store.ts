import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Version interface
 * Represents a BC Building Code version
 */
export interface Version {
  id: string;
  year: number;
  title: string;
  sourceFile: string;
  isDefault: boolean;
  publishedDate: string;
  status: 'current' | 'draft' | 'archived';
  description?: string;
  revisionCount?: number;
  latestRevision?: string;
  dataPath?: string;
}

/**
 * Version store state interface
 */
interface VersionStore {
  currentVersion: string | null;
  availableVersions: Version[];
  loading: boolean;
  error: string | null;
  
  // Actions
  setCurrentVersion: (versionId: string) => void;
  loadVersions: () => Promise<void>;
  getVersionDataPath: (versionId?: string) => string;
  getVersion: (versionId?: string) => Version | undefined;
  clearError: () => void;
}

/**
 * Default version ID
 * Used when no version is specified
 */
const DEFAULT_VERSION = '2024';

/**
 * Version store
 * Manages BC Building Code versions, current selection, and version-specific data paths
 * 
 * Features:
 * - Loads available versions from /data/versions.json
 * - Persists current version selection to localStorage
 * - Syncs version with URL query parameter
 * - Provides version-specific data paths for loading content
 */
export const useVersionStore = create<VersionStore>()(
  devtools(
    persist(
      (set, get) => ({
        currentVersion: null,
        availableVersions: [],
        loading: false,
        error: null,

        /**
         * Set the current version
         * Updates localStorage and URL query parameter
         */
        setCurrentVersion: (versionId: string) => {
          const { availableVersions } = get();
          const version = availableVersions.find(v => v.id === versionId);
          
          if (!version) {
            set({ error: `Version ${versionId} not found` });
            return;
          }

          set({ currentVersion: versionId, error: null });
          
          // Sync with URL query parameter
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('version', versionId);
            window.history.replaceState({}, '', url.toString());
          }
        },

        /**
         * Load available versions from /data/versions.json
         * Called on app initialization
         * Reads version from URL if present, otherwise uses default
         */
        loadVersions: async () => {
          set({ loading: true, error: null });
          
          try {
            const response = await fetch('/data/versions.json');
            
            if (!response.ok) {
              throw new Error(`Failed to load versions: ${response.statusText}`);
            }
            
            const data = await response.json();
            const versions: Version[] = data.versions || [];
            
            if (versions.length === 0) {
              throw new Error('No versions available');
            }
            
            set({ 
              availableVersions: versions,
              loading: false 
            });
            
            // Determine which version to set
            const { currentVersion } = get();
            
            // Priority 1: URL parameter (for bookmarks, shared links)
            if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search);
              const urlVersion = params.get('version');
              
              if (urlVersion && versions.find(v => v.id === urlVersion)) {
                // URL has valid version, use it and update store
                set({ currentVersion: urlVersion });
                console.log(`Version loaded from URL: ${urlVersion}`);
                return;
              }
            }
            
            // Priority 2: Already set in store (from localStorage or previous load)
            if (currentVersion && versions.find(v => v.id === currentVersion)) {
              // Current version is valid, keep it and sync to URL
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('version', currentVersion);
                window.history.replaceState({}, '', url.toString());
              }
              return;
            }
            
            // Priority 3: Default version from versions.json
            const defaultVersion = versions.find(v => v.isDefault);
            const versionToSet = defaultVersion?.id || versions[0].id;
            
            set({ currentVersion: versionToSet });
            
            // Sync to URL
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.set('version', versionToSet);
              window.history.replaceState({}, '', url.toString());
            }
            
            console.log(`Version set to default: ${versionToSet}`);
          } catch (error) {
            console.error('Error loading versions:', error);
            set({ 
              error: error instanceof Error ? error.message : 'Unknown error',
              loading: false,
              // Fallback to default version
              currentVersion: DEFAULT_VERSION,
              availableVersions: [{
                id: DEFAULT_VERSION,
                year: 2024,
                title: 'BC Building Code 2024',
                sourceFile: 'bcbc-2024.json',
                isDefault: true,
                publishedDate: '2024-01-01',
                status: 'current',
                dataPath: `/data/${DEFAULT_VERSION}`
              }]
            });
          }
        },

        /**
         * Get the data path for a specific version
         * Returns the path to version-specific assets
         * 
         * @param versionId - Optional version ID (defaults to current version)
         * @returns Data path (e.g., "/data/2024")
         */
        getVersionDataPath: (versionId?: string) => {
          const { currentVersion, availableVersions } = get();
          const id = versionId || currentVersion || DEFAULT_VERSION;
          
          // Check if version has explicit dataPath
          const version = availableVersions.find(v => v.id === id);
          if (version?.dataPath) {
            return version.dataPath;
          }
          
          // Default to /data/{versionId}
          return `/data/${id}`;
        },

        /**
         * Get version object by ID
         * 
         * @param versionId - Optional version ID (defaults to current version)
         * @returns Version object or undefined
         */
        getVersion: (versionId?: string) => {
          const { currentVersion, availableVersions } = get();
          const id = versionId || currentVersion || DEFAULT_VERSION;
          return availableVersions.find(v => v.id === id);
        },

        /**
         * Clear error state
         */
        clearError: () => set({ error: null }),
      }),
      {
        name: 'version-storage',
        // Only persist currentVersion to localStorage
        partialize: (state) => ({ currentVersion: state.currentVersion }),
      }
    ),
    { name: 'version-store' }
  )
);

/**
 * Hook to get current version ID with fallback
 * Useful for components that need the version ID
 */
export const useCurrentVersionId = (): string => {
  const currentVersion = useVersionStore(state => state.currentVersion);
  return currentVersion || DEFAULT_VERSION;
};

/**
 * Hook to check if multiple versions are available
 * Useful for conditionally showing version selector
 */
export const useHasMultipleVersions = (): boolean => {
  const availableVersions = useVersionStore(state => state.availableVersions);
  return availableVersions.length > 1;
};

/**
 * Sync version from URL to store
 * Call this on popstate events (browser back/forward)
 * 
 * @returns True if version was updated, false otherwise
 */
export const syncVersionFromUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const params = new URLSearchParams(window.location.search);
  const urlVersion = params.get('version');
  
  if (!urlVersion) return false;
  
  const { currentVersion, availableVersions, setCurrentVersion } = useVersionStore.getState();
  
  // Check if URL version is different from current and is valid
  if (urlVersion !== currentVersion && availableVersions.find(v => v.id === urlVersion)) {
    setCurrentVersion(urlVersion);
    return true;
  }
  
  return false;
};
