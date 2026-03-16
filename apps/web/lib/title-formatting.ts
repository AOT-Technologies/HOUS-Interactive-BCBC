export function normalizeTitleText(title: string): string {
  return title.trim();
}

export function formatNumberedTitle(number: string, title: string): string {
  const normalizedNumber = number.trim();
  const normalizedTitle = normalizeTitleText(title);

  if (!normalizedNumber) {
    return normalizedTitle;
  }

  if (!normalizedTitle) {
    return normalizedNumber.endsWith('.') ? normalizedNumber : `${normalizedNumber}.`;
  }

  const punctuatedNumber = normalizedNumber.endsWith('.')
    ? normalizedNumber
    : `${normalizedNumber}.`;

  return `${punctuatedNumber} ${normalizedTitle}`;
}

export function stripLeadingNumber(title: string, number?: string): string {
  const normalizedTitle = normalizeTitleText(title);
  const normalizedNumber = number?.trim();

  if (!normalizedTitle || !normalizedNumber) {
    return normalizedTitle;
  }

  const escapedNumber = normalizedNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return normalizedTitle.replace(new RegExp(`^${escapedNumber}\\.?\\s*`), '').trim();
}

export function formatNavigationNodeTitle(
  type: string | undefined,
  title: string,
  number?: string
): string {
  if (!type || !number) {
    return normalizeTitleText(title);
  }

  if (type !== 'section' && type !== 'subsection' && type !== 'article') {
    return normalizeTitleText(title);
  }

  return formatNumberedTitle(number, stripLeadingNumber(title, number));
}
