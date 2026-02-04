/**
 * Unit tests for useSearchClient hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSearchClient, useSearchMetadata } from './useSearchClient';
import * as searchClient from '../lib/search-client';

// Mock the search client
vi.mock('../lib/search-client', () => ({
  getSearchClient: vi.fn(),
}));

describe('useSearchClient', () => {
  const mockClient = {
    isInitialized: vi.fn(),
    initialize: vi.fn(),
    search: vi.fn(),
    getSuggestions: vi.fn(),
    getMetadata: vi.fn(),
    getTableOfContents: vi.fn(),
    getRevisionDates: vi.fn(),
    getDivisions: vi.fn(),
    getContentTypes: vi.fn(),
    getDocument: vi.fn(),
    getDocumentCount: vi.fn(),
  };

  const mockResults = [
    {
      document: {
        id: 'article-1',
        type: 'article' as const,
        articleNumber: 'A.1.1.1.1',
        title: 'Test Article',
        text: 'Test text',
        snippet: 'Test snippet',
        divisionId: 'nbc.divA',
        divisionLetter: 'A',
        divisionTitle: 'Division A',
        partId: 'nbc.divA.part1',
        partNumber: 1,
        partTitle: 'Part 1',
        sectionId: 'nbc.divA.part1.sect1',
        sectionNumber: 1,
        sectionTitle: 'Section 1',
        subsectionId: 'nbc.divA.part1.sect1.subsect1',
        subsectionNumber: 1,
        subsectionTitle: 'Subsection 1',
        path: 'Division A > Part 1',
        breadcrumbs: ['Division A', 'Part 1'],
        urlPath: '/code/nbc.divA/1/1/1/1',
        hasAmendment: false,
        hasInternalRefs: false,
        hasExternalRefs: false,
        hasTermRefs: false,
        hasTables: false,
        hasFigures: false,
        searchPriority: 5,
      },
      score: 10,
      highlights: [],
    },
  ];

  const mockMetadata = {
    version: '2024',
    generatedAt: '2024-01-01T00:00:00.000Z',
    statistics: {
      totalDocuments: 100,
      totalArticles: 80,
      totalTables: 10,
      totalFigures: 5,
      totalParts: 3,
      totalSections: 10,
      totalSubsections: 20,
      totalAmendments: 5,
      totalRevisionDates: 2,
      totalGlossaryTerms: 50,
    },
    divisions: [],
    revisionDates: [],
    tableOfContents: [],
    contentTypes: ['article', 'table'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (searchClient.getSearchClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
    mockClient.isInitialized.mockReturnValue(false);
    mockClient.initialize.mockResolvedValue(undefined);
    mockClient.search.mockResolvedValue(mockResults);
    mockClient.getSuggestions.mockResolvedValue(['Test Article']);
    mockClient.getMetadata.mockReturnValue(mockMetadata);
    mockClient.getTableOfContents.mockReturnValue([]);
    mockClient.getRevisionDates.mockReturnValue([]);
    mockClient.getDivisions.mockReturnValue([]);
    mockClient.getContentTypes.mockReturnValue(['article', 'table']);
    mockClient.getDocumentCount.mockReturnValue(100);
  });

  describe('initialization', () => {
    it('should auto-initialize by default', async () => {
      const { result } = renderHook(() => useSearchClient());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(mockClient.initialize).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should not auto-initialize when disabled', () => {
      const { result } = renderHook(() => useSearchClient(false));

      expect(result.current.isLoading).toBe(false);
      expect(mockClient.initialize).not.toHaveBeenCalled();
    });

    it('should not re-initialize if already initialized', async () => {
      mockClient.isInitialized.mockReturnValue(true);

      const { result } = renderHook(() => useSearchClient());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(mockClient.initialize).not.toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Failed to initialize');
      mockClient.initialize.mockRejectedValue(error);

      const { result } = renderHook(() => useSearchClient());

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isInitialized).toBe(false);
    });
  });

  describe('search', () => {
    it('should perform search and update results', async () => {
      const { result } = renderHook(() => useSearchClient());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.search('test query');
      });

      await waitFor(() => {
        expect(result.current.results).toEqual(mockResults);
      });

      expect(mockClient.search).toHaveBeenCalledWith('test query', undefined);
      expect(result.current.isLoading).toBe(false);
    });

    it('should pass search options', async () => {
      const { result } = renderHook(() => useSearchClient());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const options = { limit: 10, divisionFilter: 'A' };
      await act(async () => {
        await result.current.search('test', options);
      });

      await waitFor(() => {
        expect(mockClient.search).toHaveBeenCalledWith('test', options);
      });
    });

    it('should handle search errors', async () => {
      const error = new Error('Search failed');
      mockClient.search.mockRejectedValue(error);

      const { result } = renderHook(() => useSearchClient());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.search('test');
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('getSuggestions', () => {
    it('should get suggestions', async () => {
      const { result } = renderHook(() => useSearchClient());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.getSuggestions('test');
      });

      await waitFor(() => {
        expect(result.current.suggestions).toEqual(['Test Article']);
      });

      expect(mockClient.getSuggestions).toHaveBeenCalledWith('test', 5);
    });

    it('should pass limit parameter', async () => {
      const { result } = renderHook(() => useSearchClient());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.getSuggestions('test', 10);
      });

      await waitFor(() => {
        expect(mockClient.getSuggestions).toHaveBeenCalledWith('test', 10);
      });
    });

    it('should handle suggestion errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockClient.getSuggestions.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useSearchClient());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.getSuggestions('test');
      });

      await waitFor(() => {
        expect(result.current.suggestions).toEqual([]);
      });

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('clearResults', () => {
    it('should clear results and suggestions', async () => {
      const { result } = renderHook(() => useSearchClient());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Perform search
      await act(async () => {
        await result.current.search('test');
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
      });

      // Clear results
      act(() => {
        result.current.clearResults();
      });

      await waitFor(() => {
        expect(result.current.results).toEqual([]);
        expect(result.current.suggestions).toEqual([]);
      });
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      const error = new Error('Test error');
      mockClient.search.mockRejectedValue(error);

      const { result } = renderHook(() => useSearchClient());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Trigger error
      await act(async () => {
        await result.current.search('test');
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });

      // Clear error
      act(() => {
        result.current.clearError();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});

describe('useSearchMetadata', () => {
  const mockClient = {
    isInitialized: vi.fn(),
    initialize: vi.fn(),
    getMetadata: vi.fn(),
    getTableOfContents: vi.fn(),
    getRevisionDates: vi.fn(),
    getDivisions: vi.fn(),
    getContentTypes: vi.fn(),
  };

  const mockMetadata = {
    version: '2024',
    generatedAt: '2024-01-01T00:00:00.000Z',
    statistics: {
      totalDocuments: 100,
      totalArticles: 80,
      totalTables: 10,
      totalFigures: 5,
      totalParts: 3,
      totalSections: 10,
      totalSubsections: 20,
      totalAmendments: 5,
      totalRevisionDates: 2,
      totalGlossaryTerms: 50,
    },
    divisions: [{ id: 'nbc.divA', letter: 'A', title: 'Division A', parts: [] }],
    revisionDates: [{ effectiveDate: '2024-08-27', displayDate: 'Aug 27, 2024', count: 1, type: 'amendment' as const }],
    tableOfContents: [],
    contentTypes: ['article', 'table'] as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (searchClient.getSearchClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
    mockClient.isInitialized.mockReturnValue(false);
    mockClient.initialize.mockResolvedValue(undefined);
    mockClient.getMetadata.mockReturnValue(mockMetadata);
    mockClient.getTableOfContents.mockReturnValue([]);
    mockClient.getRevisionDates.mockReturnValue(mockMetadata.revisionDates);
    mockClient.getDivisions.mockReturnValue(mockMetadata.divisions);
    mockClient.getContentTypes.mockReturnValue(['article', 'table']);
  });

  it('should return metadata after initialization', async () => {
    const { result } = renderHook(() => useSearchMetadata());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    expect(result.current.metadata).toEqual(mockMetadata);
    expect(result.current.divisions).toEqual(mockMetadata.divisions);
    expect(result.current.revisionDates).toEqual(mockMetadata.revisionDates);
  });

  it('should return null metadata before initialization', () => {
    mockClient.isInitialized.mockReturnValue(false);
    mockClient.getMetadata.mockReturnValue(null);

    const { result } = renderHook(() => useSearchMetadata());

    expect(result.current.metadata).toBeNull();
  });
});
