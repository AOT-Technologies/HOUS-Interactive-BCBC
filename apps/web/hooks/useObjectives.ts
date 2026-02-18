/**
 * useObjectives - Hook to access objectives and sub-objectives data
 * 
 * Loads objectives from the generated metadata file and provides
 * lookup functions for rendering ObjectiveLink components.
 */

'use client';

import { useEffect, useMemo } from 'react';
import { useCurrentVersionId } from '../stores/version-store';
import {
  useObjectivesStore,
  type Objective,
  type SubObjective,
} from '../stores/objectives-store';

export function useObjectives() {
  const currentVersion = useCurrentVersionId();
  const objectivesMap = useObjectivesStore((s) => s.objectivesMap);
  const loading = useObjectivesStore((s) => s.loading);
  const error = useObjectivesStore((s) => s.error);
  const getObjectiveFromStore = useObjectivesStore((s) => s.getObjective);
  const loadObjectives = useObjectivesStore((s) => s.loadObjectives);

  useEffect(() => {
    loadObjectives();
  }, [currentVersion, loadObjectives]);

  const objectives = useMemo(
    () => Object.fromEntries(objectivesMap.entries()) as Record<string, Objective | SubObjective>,
    [objectivesMap]
  );

  const getObjective = (objectiveId: string): (Objective | SubObjective) | null => {
    return getObjectiveFromStore(objectiveId) || null;
  };

  return {
    objectives,
    loading,
    error,
    getObjective,
  };
}
