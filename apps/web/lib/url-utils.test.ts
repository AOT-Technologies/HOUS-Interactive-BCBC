/**
 * Unit tests for URL utilities
 */

import {
  parseContentPath,
  buildContentPath,
  getContentLevel,
  parseSearchParams,
  buildSearchUrl,
  isContentPage,
  isSearchPage,
  isHomePage,
  isDownloadPage,
  type ContentPathParams,
} from './url-utils';

describe('parseContentPath', () => {
  it('should parse part-level path', () => {
    const result = parseContentPath('/code/division-a/part-1');
    expect(result).toEqual({
      division: 'division-a',
      part: 'part-1',
      section: undefined,
      subsection: undefined,
      article: undefined,
    });
  });

  it('should parse section-level path', () => {
    const result = parseContentPath('/code/division-b/part-3/section-3-2');
    expect(result).toEqual({
      division: 'division-b',
      part: 'part-3',
      section: 'section-3-2',
      subsection: undefined,
      article: undefined,
    });
  });

  it('should parse subsection-level path', () => {
    const result = parseContentPath('/code/division-b/part-3/section-3-2/subsection-3-2-1');
    expect(result).toEqual({
      division: 'division-b',
      part: 'part-3',
      section: 'section-3-2',
      subsection: 'subsection-3-2-1',
      article: undefined,
    });
  });

  it('should parse article-level path', () => {
    const result = parseContentPath('/code/division-b/part-3/section-3-2/subsection-3-2-1/article-3-2-1-1');
    expect(result).toEqual({
      division: 'division-b',
      part: 'part-3',
      section: 'section-3-2',
      subsection: 'subsection-3-2-1',
      article: 'article-3-2-1-1',
    });
  });

  it('should handle paths with trailing slash', () => {
    const result = parseContentPath('/code/division-a/part-1/');
    expect(result).toEqual({
      division: 'division-a',
      part: 'part-1',
      section: undefined,
      subsection: undefined,
      article: undefined,
    });
  });

  it('should return null for invalid paths', () => {
    expect(parseContentPath('/invalid/path')).toBeNull();
    expect(parseContentPath('/code')).toBeNull();
    expect(parseContentPath('/code/division-a')).toBeNull();
    expect(parseContentPath('')).toBeNull();
  });

  it('should return null for non-code paths', () => {
    expect(parseContentPath('/search')).toBeNull();
    expect(parseContentPath('/download')).toBeNull();
    expect(parseContentPath('/')).toBeNull();
  });
});

describe('buildContentPath', () => {
  it('should build part-level path', () => {
    const params: ContentPathParams = {
      division: 'division-a',
      part: 'part-1',
    };
    expect(buildContentPath(params)).toBe('/code/division-a/part-1');
  });

  it('should build section-level path', () => {
    const params: ContentPathParams = {
      division: 'division-b',
      part: 'part-3',
      section: 'section-3-2',
    };
    expect(buildContentPath(params)).toBe('/code/division-b/part-3/section-3-2');
  });

  it('should build subsection-level path', () => {
    const params: ContentPathParams = {
      division: 'division-b',
      part: 'part-3',
      section: 'section-3-2',
      subsection: 'subsection-3-2-1',
    };
    expect(buildContentPath(params)).toBe('/code/division-b/part-3/section-3-2/subsection-3-2-1');
  });

  it('should build article-level path', () => {
    const params: ContentPathParams = {
      division: 'division-b',
      part: 'part-3',
      section: 'section-3-2',
      subsection: 'subsection-3-2-1',
      article: 'article-3-2-1-1',
    };
    expect(buildContentPath(params)).toBe('/code/division-b/part-3/section-3-2/subsection-3-2-1/article-3-2-1-1');
  });

  it('should add query parameters', () => {
    const params: ContentPathParams = {
      division: 'division-a',
      part: 'part-1',
    };
    const queryParams = { date: '2024-01-01' };
    expect(buildContentPath(params, queryParams)).toBe('/code/division-a/part-1?date=2024-01-01');
  });

  it('should add multiple query parameters', () => {
    const params: ContentPathParams = {
      division: 'division-a',
      part: 'part-1',
    };
    const queryParams = { date: '2024-01-01', filter: 'active' };
    const result = buildContentPath(params, queryParams);
    expect(result).toContain('date=2024-01-01');
    expect(result).toContain('filter=active');
  });

  it('should skip undefined segments', () => {
    const params: ContentPathParams = {
      division: 'division-a',
      part: 'part-1',
      section: undefined,
      subsection: undefined,
      article: undefined,
    };
    expect(buildContentPath(params)).toBe('/code/division-a/part-1');
  });

  it('should handle empty query parameters', () => {
    const params: ContentPathParams = {
      division: 'division-a',
      part: 'part-1',
    };
    expect(buildContentPath(params, {})).toBe('/code/division-a/part-1');
  });
});

describe('getContentLevel', () => {
  it('should return "part" for part-level params', () => {
    const params: ContentPathParams = {
      division: 'division-a',
      part: 'part-1',
    };
    expect(getContentLevel(params)).toBe('part');
  });

  it('should return "section" for section-level params', () => {
    const params: ContentPathParams = {
      division: 'division-a',
      part: 'part-1',
      section: 'section-1-1',
    };
    expect(getContentLevel(params)).toBe('section');
  });

  it('should return "subsection" for subsection-level params', () => {
    const params: ContentPathParams = {
      division: 'division-a',
      part: 'part-1',
      section: 'section-1-1',
      subsection: 'subsection-1-1-1',
    };
    expect(getContentLevel(params)).toBe('subsection');
  });

  it('should return "article" for article-level params', () => {
    const params: ContentPathParams = {
      division: 'division-a',
      part: 'part-1',
      section: 'section-1-1',
      subsection: 'subsection-1-1-1',
      article: 'article-1-1-1-1',
    };
    expect(getContentLevel(params)).toBe('article');
  });
});

describe('parseSearchParams', () => {
  it('should parse search query', () => {
    const result = parseSearchParams('?q=fire%20safety');
    expect(result).toEqual({
      q: 'fire safety',
      date: undefined,
      division: undefined,
      part: undefined,
      type: undefined,
    });
  });

  it('should parse search query with filters', () => {
    const result = parseSearchParams('?q=fire&division=division-b&part=part-3&type=article&date=2024-01-01');
    expect(result).toEqual({
      q: 'fire',
      date: '2024-01-01',
      division: 'division-b',
      part: 'part-3',
      type: 'article',
    });
  });

  it('should return null if no query parameter', () => {
    expect(parseSearchParams('?division=division-a')).toBeNull();
    expect(parseSearchParams('')).toBeNull();
    expect(parseSearchParams('?')).toBeNull();
  });

  it('should handle URL-encoded query', () => {
    const result = parseSearchParams('?q=fire%20safety%20requirements');
    expect(result?.q).toBe('fire safety requirements');
  });

  it('should handle partial filters', () => {
    const result = parseSearchParams('?q=fire&division=division-b');
    expect(result).toEqual({
      q: 'fire',
      date: undefined,
      division: 'division-b',
      part: undefined,
      type: undefined,
    });
  });
});

describe('buildSearchUrl', () => {
  it('should build search URL with query only', () => {
    expect(buildSearchUrl('fire safety')).toBe('/search?q=fire+safety');
  });

  it('should build search URL with filters', () => {
    const filters = {
      date: '2024-01-01',
      division: 'division-b',
      part: 'part-3',
      type: 'article',
    };
    const result = buildSearchUrl('fire', filters);
    expect(result).toContain('q=fire');
    expect(result).toContain('date=2024-01-01');
    expect(result).toContain('division=division-b');
    expect(result).toContain('part=part-3');
    expect(result).toContain('type=article');
  });

  it('should build search URL with partial filters', () => {
    const filters = {
      division: 'division-b',
    };
    const result = buildSearchUrl('fire', filters);
    expect(result).toContain('q=fire');
    expect(result).toContain('division=division-b');
    expect(result).not.toContain('date=');
    expect(result).not.toContain('part=');
  });

  it('should handle empty filters', () => {
    expect(buildSearchUrl('fire', {})).toBe('/search?q=fire');
  });

  it('should URL-encode query', () => {
    const result = buildSearchUrl('fire safety requirements');
    expect(result).toContain('fire+safety+requirements');
  });
});

describe('page detection functions', () => {
  // Mock window.location
  const mockLocation = (pathname: string) => {
    delete (window as any).location;
    (window as any).location = { pathname };
  };

  beforeEach(() => {
    // Reset window.location before each test
    delete (window as any).location;
    (window as any).location = { pathname: '/' };
  });

  describe('isContentPage', () => {
    it('should return true for content pages', () => {
      mockLocation('/code/division-a/part-1');
      expect(isContentPage()).toBe(true);

      mockLocation('/code/division-b/part-3/section-3-2');
      expect(isContentPage()).toBe(true);
    });

    it('should return false for non-content pages', () => {
      mockLocation('/');
      expect(isContentPage()).toBe(false);

      mockLocation('/search');
      expect(isContentPage()).toBe(false);

      mockLocation('/download');
      expect(isContentPage()).toBe(false);
    });
  });

  describe('isSearchPage', () => {
    it('should return true for search page', () => {
      mockLocation('/search');
      expect(isSearchPage()).toBe(true);

      mockLocation('/search?q=fire');
      expect(isSearchPage()).toBe(true);
    });

    it('should return false for non-search pages', () => {
      mockLocation('/');
      expect(isSearchPage()).toBe(false);

      mockLocation('/code/division-a/part-1');
      expect(isSearchPage()).toBe(false);
    });
  });

  describe('isHomePage', () => {
    it('should return true for homepage', () => {
      mockLocation('/');
      expect(isHomePage()).toBe(true);

      mockLocation('');
      expect(isHomePage()).toBe(true);
    });

    it('should return false for non-homepage', () => {
      mockLocation('/search');
      expect(isHomePage()).toBe(false);

      mockLocation('/code/division-a/part-1');
      expect(isHomePage()).toBe(false);
    });
  });

  describe('isDownloadPage', () => {
    it('should return true for download page', () => {
      mockLocation('/download');
      expect(isDownloadPage()).toBe(true);
    });

    it('should return false for non-download pages', () => {
      mockLocation('/');
      expect(isDownloadPage()).toBe(false);

      mockLocation('/search');
      expect(isDownloadPage()).toBe(false);
    });
  });
});

describe('round-trip parsing and building', () => {
  it('should round-trip part-level path', () => {
    const original = '/code/division-a/part-1';
    const params = parseContentPath(original);
    expect(params).not.toBeNull();
    const rebuilt = buildContentPath(params!);
    expect(rebuilt).toBe(original);
  });

  it('should round-trip section-level path', () => {
    const original = '/code/division-b/part-3/section-3-2';
    const params = parseContentPath(original);
    expect(params).not.toBeNull();
    const rebuilt = buildContentPath(params!);
    expect(rebuilt).toBe(original);
  });

  it('should round-trip article-level path', () => {
    const original = '/code/division-b/part-3/section-3-2/subsection-3-2-1/article-3-2-1-1';
    const params = parseContentPath(original);
    expect(params).not.toBeNull();
    const rebuilt = buildContentPath(params!);
    expect(rebuilt).toBe(original);
  });

  it('should round-trip search URL', () => {
    const original = '?q=fire&division=division-b&part=part-3&type=article&date=2024-01-01';
    const params = parseSearchParams(original);
    expect(params).not.toBeNull();
    const rebuilt = buildSearchUrl(params!.q, {
      date: params!.date,
      division: params!.division,
      part: params!.part,
      type: params!.type,
    });
    // Check all parameters are present (order may vary)
    expect(rebuilt).toContain('q=fire');
    expect(rebuilt).toContain('division=division-b');
    expect(rebuilt).toContain('part=part-3');
    expect(rebuilt).toContain('type=article');
    expect(rebuilt).toContain('date=2024-01-01');
  });
});
