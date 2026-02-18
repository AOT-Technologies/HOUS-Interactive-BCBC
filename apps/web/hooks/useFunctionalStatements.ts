/**
 * useFunctionalStatements - Hook to access functional statements data
 * 
 * Loads functional statements from the generated metadata file and provides
 * lookup functions for rendering FunctionalStatementLink components.
 */

'use client';

import { useEffect, useMemo } from 'react';
import { useCurrentVersionId } from '../stores/version-store';
import { useFunctionalStatementsStore, type FunctionalStatement } from '../stores/functional-statements-store';

export function useFunctionalStatements() {
  const currentVersion = useCurrentVersionId();
  const statementsMap = useFunctionalStatementsStore((s) => s.statementsMap);
  const loading = useFunctionalStatementsStore((s) => s.loading);
  const error = useFunctionalStatementsStore((s) => s.error);
  const getStatementFromStore = useFunctionalStatementsStore((s) => s.getStatement);
  const loadStatements = useFunctionalStatementsStore((s) => s.loadStatements);

  useEffect(() => {
    loadStatements();
  }, [currentVersion, loadStatements]);

  const statements = useMemo(
    () => Object.fromEntries(statementsMap.entries()) as Record<string, FunctionalStatement>,
    [statementsMap]
  );

  const getStatement = (statementId: string): FunctionalStatement | null =>
    getStatementFromStore(statementId) || null;

  return {
    statements,
    loading,
    error,
    getStatement,
  };
}
