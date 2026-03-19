const SUFFIX_PATTERNS = [
  /\.figure\d+$/i,
  /\.equation\d+$/i,
  /\.table\d+\.note\d+$/i,
  /\.sent\d+\.clause\d+\.subclause\d+$/i,
  /\.sent\d+\.clause\d+$/i,
  /\.sent\d+$/i,
  /\.table\d+$/i,
];

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]',
].join(',');

const getCandidateKeys = (element: HTMLElement): string[] => {
  const keys: string[] = [];
  if (element.id) keys.push(element.id.toLowerCase());
  const nodeId = element.getAttribute('data-node-id');
  if (nodeId) keys.push(nodeId.toLowerCase());
  return keys;
};

export const findReferenceTarget = (
  root: ParentNode,
  rawTargetId: string
): HTMLElement | null => {
  const targetId = rawTargetId.trim();
  if (!targetId) return null;

  const normalizedTargetId = targetId.toLowerCase();
  const allCandidates = Array.from(
    root.querySelectorAll<HTMLElement>('[id], [data-node-id]')
  );

  const exact = allCandidates.find((element) =>
    getCandidateKeys(element).includes(normalizedTargetId)
  );
  if (exact) return exact;

  for (const pattern of SUFFIX_PATTERNS) {
    const suffixMatch = normalizedTargetId.match(pattern);
    if (!suffixMatch) continue;

    const suffix = suffixMatch[0];
    const prefix = normalizedTargetId.slice(0, normalizedTargetId.length - suffix.length);
    const candidate = allCandidates.find((element) =>
      getCandidateKeys(element).some((key) =>
        key.endsWith(suffix) && (prefix ? key.startsWith(prefix) : true)
      )
    );

    if (candidate) return candidate;
  }

  return null;
};

export const scrollTargetIntoView = (
  target: HTMLElement,
  scrollContainer?: HTMLElement | null
): void => {
  if (!scrollContainer) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const containerRect = scrollContainer.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const offsetTop = targetRect.top - containerRect.top;
  const nextTop = scrollContainer.scrollTop + offsetTop - 8;

  scrollContainer.scrollTo({
    top: Math.max(0, nextTop),
    behavior: 'smooth',
  });
};

export const focusReferenceTarget = (target: HTMLElement): (() => void) => {
  const alreadyFocusable = target.matches(FOCUSABLE_SELECTOR);
  const existingTabIndex = target.getAttribute('tabindex');

  if (!alreadyFocusable && existingTabIndex === null) {
    target.setAttribute('tabindex', '-1');
  }

  target.focus({ preventScroll: true });

  return () => {
    if (!alreadyFocusable && existingTabIndex === null) {
      target.removeAttribute('tabindex');
    }
  };
};
