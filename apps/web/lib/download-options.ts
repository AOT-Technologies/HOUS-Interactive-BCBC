export type RevisionErrataType = 'revision' | 'errata';

export interface CodePdfOption {
  year: number;
  label: string;
  pdfLink: string;
}

export interface RevisionErrataItem {
  type: RevisionErrataType;
  title: string;
  effectiveDate: string;
  description: string;
  pdfLink: string;
}

export interface DownloadAboutContent {
  fileFormat: string;
  effectiveDates: string;
  copyright: string;
}

export interface DownloadVersionOptions {
  versionId: string;
  pageTitle: string;
  codePdfs: CodePdfOption[];
  revisionsErrata: RevisionErrataItem[];
  about: DownloadAboutContent;
}

export interface DownloadOptionsResponse {
  versions: DownloadVersionOptions[];
}

const DEFAULT_VERSION = '2024';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCodePdfOption(value: unknown): value is CodePdfOption {
  return (
    isObject(value) &&
    typeof value.year === 'number' &&
    typeof value.label === 'string' &&
    typeof value.pdfLink === 'string'
  );
}

function isRevisionErrataItem(value: unknown): value is RevisionErrataItem {
  return (
    isObject(value) &&
    (value.type === 'revision' || value.type === 'errata') &&
    typeof value.title === 'string' &&
    typeof value.effectiveDate === 'string' &&
    typeof value.description === 'string' &&
    typeof value.pdfLink === 'string'
  );
}

function isDownloadAboutContent(value: unknown): value is DownloadAboutContent {
  return (
    isObject(value) &&
    typeof value.fileFormat === 'string' &&
    typeof value.effectiveDates === 'string' &&
    typeof value.copyright === 'string'
  );
}

function isDownloadVersionOptions(value: unknown): value is DownloadVersionOptions {
  return (
    isObject(value) &&
    typeof value.versionId === 'string' &&
    typeof value.pageTitle === 'string' &&
    Array.isArray(value.codePdfs) &&
    value.codePdfs.every(isCodePdfOption) &&
    Array.isArray(value.revisionsErrata) &&
    value.revisionsErrata.every(isRevisionErrataItem) &&
    isDownloadAboutContent(value.about)
  );
}

export function isDownloadOptionsResponse(value: unknown): value is DownloadOptionsResponse {
  return (
    isObject(value) &&
    Array.isArray(value.versions) &&
    value.versions.every(isDownloadVersionOptions)
  );
}

export async function loadDownloadOptions(): Promise<DownloadOptionsResponse> {
  const response = await fetch('/data/download-options.json');
  if (!response.ok) {
    throw new Error(`Failed to load download options: ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!isDownloadOptionsResponse(data)) {
    throw new Error('Invalid download options format');
  }

  return data;
}

export function selectDownloadVersion(
  options: DownloadOptionsResponse,
  requestedVersionId?: string | null
): DownloadVersionOptions | null {
  const requested = requestedVersionId || DEFAULT_VERSION;
  return (
    options.versions.find((version) => version.versionId === requested) ||
    options.versions.find((version) => version.versionId === DEFAULT_VERSION) ||
    options.versions[0] ||
    null
  );
}

export function formatEffectiveDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
