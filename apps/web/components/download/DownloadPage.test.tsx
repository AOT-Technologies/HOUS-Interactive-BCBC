import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DownloadPage from './DownloadPage';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock('@/stores/version-store', () => ({
  useVersionStore: vi.fn(),
}));

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useVersionStore } from '@/stores/version-store';

const mockData = {
  versions: [
    {
      versionId: '2024',
      pageTitle: 'Download the BC Building Code Edition',
      codePdfs: [
        { year: 2024, label: 'BC Building Code 2024 (PDF)', pdfLink: 'https://example.com/code-2024.pdf' },
      ],
      revisionsErrata: [
        {
          type: 'revision',
          title: 'Sample Revision',
          effectiveDate: '2025-06-16',
          description: 'Sample revision description.',
          pdfLink: 'https://example.com/revision-1.pdf',
        },
      ],
      about: {
        fileFormat: 'PDF files are read-only and preserve all formatting.',
        effectiveDates: 'The 2024 BC Building Code is effective as of March 8, 2024.',
        copyright: 'Sample copyright.',
      },
    },
    {
      versionId: '2027',
      pageTitle: 'Download the BC Building Code Edition',
      codePdfs: [
        { year: 2027, label: 'BC Building Code 2027 (PDF)', pdfLink: 'https://example.com/code-2027.pdf' },
      ],
      revisionsErrata: [
        {
          type: 'revision',
          title: '2027 Sample Revision',
          effectiveDate: '2027-02-01',
          description: 'Sample 2027 revision description.',
          pdfLink: 'https://example.com/revision-2027-1.pdf',
        },
      ],
      about: {
        fileFormat: 'PDF files are read-only and preserve all formatting.',
        effectiveDates: 'The 2027 BC Building Code is effective as of January 1, 2027.',
        copyright: 'Sample copyright 2027.',
      },
    },
  ],
};

describe('DownloadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      replace: vi.fn(),
    });
    (usePathname as any).mockReturnValue('/download');
    (useSearchParams as any).mockReturnValue({
      get: (key: string) => (key === 'version' ? '2024' : null),
      toString: () => 'version=2024',
    });
    (useVersionStore as any).mockImplementation((selector: any) =>
      selector({
        currentVersion: '2024',
        availableVersions: [
          { id: '2024', title: 'BC Building Code 2024' },
          { id: '2027', title: 'BC Building Code 2027' },
        ],
        setCurrentVersion: vi.fn(),
      })
    );
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as any);
  });

  it('renders page content from download options data', async () => {
    render(<DownloadPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Download the BC Building Code Edition' })).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'Revisions and Errata' })).toBeInTheDocument();
    expect(screen.getByText('Sample Revision')).toBeInTheDocument();
  });

  it('uses new tab links for code pdf and revision pdf', async () => {
    render(<DownloadPage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Open BC Building Code 2024 \(PDF\) in a new tab/i })).toBeInTheDocument();
    });

    const codePdfLink = screen.getByRole('link', { name: /Open BC Building Code 2024 \(PDF\) in a new tab/i });
    expect(codePdfLink).toHaveAttribute('href', 'https://example.com/code-2024.pdf');
    expect(codePdfLink).toHaveAttribute('target', '_blank');

    const revisionPdfLink = screen.getByRole('link', { name: /Open Sample Revision PDF in a new tab/i });
    expect(revisionPdfLink).toHaveAttribute('href', 'https://example.com/revision-1.pdf');
    expect(revisionPdfLink).toHaveAttribute('target', '_blank');
  });

  it('uses versions.json options and switches data when version changes', async () => {
    const setCurrentVersionMock = vi.fn();
    (useVersionStore as any).mockImplementation((selector: any) =>
      selector({
        currentVersion: '2024',
        availableVersions: [
          { id: '2024', title: 'BC Building Code 2024' },
          { id: '2027', title: 'BC Building Code 2027' },
        ],
        setCurrentVersion: setCurrentVersionMock,
      })
    );

    render(<DownloadPage />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'BC Building Code 2024' })).toBeInTheDocument();
    });

    expect(screen.getByRole('option', { name: 'BC Building Code 2027' })).toBeInTheDocument();

    const select = screen.getByLabelText('Select code version');
    fireEvent.change(select, { target: { value: '2027' } });

    await waitFor(() => {
      expect(screen.getByText('2027 Sample Revision')).toBeInTheDocument();
    });

    expect(setCurrentVersionMock).toHaveBeenCalledWith('2027');
    const codePdfLink = screen.getByRole('link', { name: /Open BC Building Code 2027 \(PDF\) in a new tab/i });
    expect(codePdfLink).toHaveAttribute('href', 'https://example.com/code-2027.pdf');
  });
});
