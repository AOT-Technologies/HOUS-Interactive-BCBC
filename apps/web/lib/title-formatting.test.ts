import {
  formatNavigationNodeTitle,
  formatNumberedTitle,
  stripLeadingNumber,
} from './title-formatting';

describe('title-formatting', () => {
  it('adds a trailing period between a number and title', () => {
    expect(formatNumberedTitle('9.3.1.1', 'General')).toBe('9.3.1.1. General');
  });

  it('does not duplicate an existing trailing period on the number', () => {
    expect(formatNumberedTitle('9.3.1.1.', 'General')).toBe('9.3.1.1. General');
  });

  it('returns a punctuated number when there is no title', () => {
    expect(formatNumberedTitle('3.1.11.5', '')).toBe('3.1.11.5.');
  });

  it('strips a leading number from combined navigation titles', () => {
    expect(stripLeadingNumber('9.3.1.1 General', '9.3.1.1')).toBe('General');
  });

  it('formats navigation titles for section-like nodes only', () => {
    expect(formatNavigationNodeTitle('section', '9.3.1 General', '9.3.1')).toBe('9.3.1. General');
    expect(formatNavigationNodeTitle('part', 'Part 9 - Housing and Small Buildings', '9')).toBe(
      'Part 9 - Housing and Small Buildings'
    );
  });
});
