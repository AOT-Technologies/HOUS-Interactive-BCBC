import { describe, expect, it } from 'vitest';
import { formatEffectiveDate, isDownloadOptionsResponse, selectDownloadVersion } from './download-options';

describe('download-options utils', () => {
  it('validates download options payload shape', () => {
    const payload = {
      versions: [
        {
          versionId: '2024',
          pageTitle: 'Download',
          codePdfs: [{ year: 2024, label: 'PDF', pdfLink: 'https://example.com/a.pdf' }],
          revisionsErrata: [
            {
              type: 'revision',
              title: 'Title',
              effectiveDate: '2025-01-01',
              description: 'Description',
              pdfLink: 'https://example.com/b.pdf',
            },
          ],
          about: {
            fileFormat: 'format',
            effectiveDates: 'effective',
            copyright: 'copyright',
          },
        },
      ],
    };

    expect(isDownloadOptionsResponse(payload)).toBe(true);
  });

  it('selects requested version with fallback', () => {
    const payload = {
      versions: [
        {
          versionId: '2024',
          pageTitle: 'Download',
          codePdfs: [],
          revisionsErrata: [],
          about: { fileFormat: '', effectiveDates: '', copyright: '' },
        },
      ],
    };

    expect(selectDownloadVersion(payload, '2024')?.versionId).toBe('2024');
    expect(selectDownloadVersion(payload, '2099')?.versionId).toBe('2024');
  });

  it('formats effective date with stable readable output', () => {
    expect(formatEffectiveDate('2025-06-16')).toBe('June 16, 2025');
  });
});
