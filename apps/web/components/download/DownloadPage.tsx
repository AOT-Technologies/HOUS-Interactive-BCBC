'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Icon from '@repo/ui/icon';
import { useVersionStore } from '@/stores/version-store';
import {
  type DownloadOptionsResponse,
  type DownloadVersionOptions,
  formatEffectiveDate,
  loadDownloadOptions,
  selectDownloadVersion,
} from '@/lib/download-options';
import './DownloadPage.css';

function appendTextWithLineBreaks(text: string, nodes: ReactNode[], keySeed: { value: number }): void {
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (line.length > 0) {
      nodes.push(line);
    }
    if (index < lines.length - 1) {
      nodes.push(<br key={`line-break-${keySeed.value}`} />);
      keySeed.value += 1;
    }
  });
}

function renderDescriptionWithLinks(description: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const keySeed = { value: 0 };
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = linkPattern.exec(description)) !== null) {
    if (match.index > lastIndex) {
      appendTextWithLineBreaks(description.slice(lastIndex, match.index), nodes, keySeed);
    }

    nodes.push(
      <a
        key={`description-link-${keySeed.value}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="download-revision-card__inline-link"
      >
        {match[1]}
      </a>
    );
    keySeed.value += 1;
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < description.length) {
    appendTextWithLineBreaks(description.slice(lastIndex), nodes, keySeed);
  }

  return nodes;
}

export default function DownloadPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const availableVersions = useVersionStore((state) => state.availableVersions);
  const currentVersion = useVersionStore((state) => state.currentVersion);
  const setCurrentVersion = useVersionStore((state) => state.setCurrentVersion);
  const [downloadOptions, setDownloadOptions] = useState<DownloadOptionsResponse | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('2024');
  const [selectedCodePdf, setSelectedCodePdf] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestedVersion = searchParams.get('version') || currentVersion || '2024';

  useEffect(() => {
    setSelectedVersionId(requestedVersion);
  }, [requestedVersion]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const response = await loadDownloadOptions();
        if (cancelled) return;

        setDownloadOptions(response);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to load download options.');
        setDownloadOptions(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeVersion: DownloadVersionOptions | null = useMemo(() => {
    if (!downloadOptions) {
      return null;
    }
    return selectDownloadVersion(downloadOptions, selectedVersionId);
  }, [downloadOptions, selectedVersionId]);

  useEffect(() => {
    setSelectedCodePdf(activeVersion?.codePdfs[0]?.pdfLink || '');
  }, [activeVersion?.versionId]);

  const codeVersionOptions = useMemo(() => {
    if (availableVersions.length > 0) {
      return availableVersions.map((version) => ({
        id: version.id,
        label: version.title,
      }));
    }

    return (
      downloadOptions?.versions.map((version) => ({
        id: version.versionId,
        label: `BC Building Code ${version.versionId}`,
      })) || []
    );
  }, [availableVersions, downloadOptions]);

  const selectedCodeOption = useMemo(
    () => activeVersion?.codePdfs.find((option) => option.pdfLink === selectedCodePdf) ?? activeVersion?.codePdfs[0],
    [activeVersion, selectedCodePdf]
  );

  const aboutSections = [
    {
      title: 'File Format',
      body: activeVersion?.about.fileFormat,
    },
    {
      title: 'Effective Dates',
      body: activeVersion?.about.effectiveDates,
    },
    {
      title: 'Copyright & Usage',
      body: activeVersion?.about.copyright,
    },
  ];

  if (loading) {
    return <div className="download-page">Loading download options...</div>;
  }

  if (error) {
    return <div className="download-page">Unable to load download options. {error}</div>;
  }

  if (!activeVersion) {
    return <div className="download-page">No download options are available.</div>;
  }

  const handleVersionChange = (nextVersionId: string) => {
    setSelectedVersionId(nextVersionId);

    if (availableVersions.some((version) => version.id === nextVersionId)) {
      setCurrentVersion(nextVersionId);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('version', nextVersionId);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <section className="download-page" data-testid="download-page">
      <h1 className="download-page__title">{activeVersion.pageTitle}</h1>

      <div className="download-page__grid">
        <div className="download-page__left-column">
          <section className="download-card" aria-labelledby="download-code-title">
            <h2 id="download-code-title" className="download-card__heading">
              Complete BC Building Code
            </h2>
            <p className="download-card__description">Download the entire BC Building Code edition.</p>

            <div className="download-card__controls">
              <div className="download-card__select-group">
                <label htmlFor="code-version-pdf" className="download-card__label">
                  Code Version
                </label>
                <select
                  id="code-version-pdf"
                  className="download-card__select"
                  value={selectedVersionId}
                  onChange={(event) => handleVersionChange(event.target.value)}
                  aria-label="Select code version"
                >
                  {codeVersionOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <a
                className="download-page__button download-page__button--primary"
                href={selectedCodeOption?.pdfLink || '#'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${selectedCodeOption?.label || 'selected code PDF'} in a new tab`}
              >
                <Icon type="download" className="download-page__download-icon" />
                <span>Download full Code</span>
              </a>
            </div>
          </section>

          <section className="download-revisions" aria-labelledby="download-revisions-title">
            <h2 id="download-revisions-title" className="download-revisions__title">
              Revisions and Errata
            </h2>

            {activeVersion.revisionsErrata.length === 0 ? (
              <p className="download-revisions__empty">No revisions or errata are currently available for this version.</p>
            ) : (
              <ul className="download-revisions__list">
                {activeVersion.revisionsErrata.map((item) => (
                  <li key={`${item.type}-${item.title}-${item.effectiveDate}`} className="download-revision-card">
                    <div className="download-revision-card__content">
                      <h3 className="download-revision-card__title">{item.title}</h3>
                      <p className="download-revision-card__description">
                        <strong>Effective {formatEffectiveDate(item.effectiveDate)}:</strong>{' '}
                        {renderDescriptionWithLinks(item.description)}
                      </p>
                    </div>
                    <a
                      className="download-page__button download-page__button--small download-page__button--revision-pdf"
                      href={item.pdfLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${item.title} PDF in a new tab`}
                    >
                      <Icon type="download" className="download-page__download-icon" />
                      <span>PDF</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="download-about" aria-labelledby="download-about-title">
          <h2 id="download-about-title" className="download-about__title">
            About Downloads
          </h2>

          {aboutSections.map((section, index) => (
            <div key={section.title} className="download-about__section">
              {index > 0 ? <div className="download-about__divider" aria-hidden="true" /> : null}
              <h3 className="download-about__heading">{section.title}</h3>
              <p>{section.body}</p>
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}
