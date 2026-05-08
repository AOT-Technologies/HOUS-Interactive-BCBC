import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/stores/version-store', () => ({ useVersionStore: vi.fn() }));
vi.mock('@/stores/amendment-date-store', () => ({ useAmendmentDateStore: vi.fn() }));

import { PrintFooter } from './PrintFooter';
import { useVersionStore } from '@/stores/version-store';
import { useAmendmentDateStore } from '@/stores/amendment-date-store';

const defaultVersionState = {
  currentVersion: '2024',
  availableVersions: [
    { id: '2024', year: 2024, title: 'BC Building Code 2024', isDefault: true, status: 'current', sourceFile: 'bcbc-2024.json' },
  ],
};

const defaultAmendmentState = {
  selectedDate: '2025-06-16',
  datesByVersion: new Map([
    ['2024', [
      { date: '2025-06-16', label: 'June 16, 2025 (Latest)', isLatest: true },
      { date: '2024-12-01', label: 'December 1, 2024', isLatest: false },
    ]],
  ]),
};

beforeEach(() => {
  vi.mocked(useVersionStore).mockImplementation((sel: (s: typeof defaultVersionState) => unknown) =>
    sel(defaultVersionState)
  );
  vi.mocked(useAmendmentDateStore).mockImplementation((sel: (s: typeof defaultAmendmentState) => unknown) =>
    sel(defaultAmendmentState)
  );
});

describe('PrintFooter', () => {
  it('renders the version title from the store', () => {
    render(<PrintFooter />);
    expect(screen.getByText('BC Building Code 2024')).toBeInTheDocument();
  });

  it('renders the effective date label for the selected date', () => {
    render(<PrintFooter />);
    expect(screen.getByText('Effective: June 16, 2025 (Latest)')).toBeInTheDocument();
  });

  it('falls back to the raw date string when no matching label exists', () => {
    vi.mocked(useAmendmentDateStore).mockImplementation((sel: (s: typeof defaultAmendmentState) => unknown) =>
      sel({ selectedDate: '2026-01-01', datesByVersion: new Map([['2024', []]]) })
    );
    render(<PrintFooter />);
    expect(screen.getByText('Effective: 2026-01-01')).toBeInTheDocument();
  });

  it('shows "Effective: Latest" when no date is selected', () => {
    vi.mocked(useAmendmentDateStore).mockImplementation((sel: (s: typeof defaultAmendmentState) => unknown) =>
      sel({ selectedDate: null, datesByVersion: new Map() })
    );
    render(<PrintFooter />);
    expect(screen.getByText('Effective: Latest')).toBeInTheDocument();
  });

  it('renders the fallback edition text when availableVersions is empty', () => {
    vi.mocked(useVersionStore).mockImplementation((sel: (s: typeof defaultVersionState) => unknown) =>
      sel({ currentVersion: null, availableVersions: [] })
    );
    render(<PrintFooter />);
    expect(screen.getByText('BC Building Code')).toBeInTheDocument();
  });

  it('renders the correct CSS class structure', () => {
    const { container } = render(<PrintFooter />);
    expect(container.querySelector('.print-footer')).toBeInTheDocument();
    expect(container.querySelector('.print-footer__edition')).toBeInTheDocument();
    expect(container.querySelector('.print-footer__date')).toBeInTheDocument();
  });

  it('is marked aria-hidden so screen readers skip it', () => {
    const { container } = render(<PrintFooter />);
    expect(container.querySelector('.print-footer')).toHaveAttribute('aria-hidden', 'true');
  });
});
