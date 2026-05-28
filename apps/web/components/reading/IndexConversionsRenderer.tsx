'use client';

import { parseTextWithMarkers } from '../../lib/text-parsing';
import type {
    IndexSectionData,
    ConversionsSectionData,
    IndexLetter,
    IndexGroup,
    IndexReference,
} from '../../lib/stores/index-conversions-store';

interface IndexRendererProps {
    data: IndexSectionData;
}

interface ConversionsRendererProps {
    data: ConversionsSectionData;
}

/**
 * Renders the Index section content
 */
export function IndexRenderer({ data }: IndexRendererProps) {
    return (
        <div className="reading-view__index">
            <h1 className="reading-view__title">Index</h1>
            {data.introduction && (
                <p className="reading-view__index-intro">{data.introduction}</p>
            )}
            {data.letters?.map((letter) => (
                <IndexLetterSection key={letter.id} letter={letter} />
            ))}
        </div>
    );
}

function IndexLetterSection({ letter }: { letter: IndexLetter }) {
    return (
        <section className="reading-view__index-letter" id={letter.id}>
            <h2 style={{ textAlign: 'center', fontWeight: 700 }}>{letter.letter}</h2>
            {letter.groups.map((group) => (
                <IndexGroupItem key={group.id} group={group} />
            ))}
        </section>
    );
}

function IndexGroupItem({ group }: { group: IndexGroup }) {
    return (
        <div id={group.id} style={{ marginBottom: '0.25rem' }}>
            <div style={{ fontWeight: 400 }}>
                {group.term}
                {group.references && group.references.length > 0 && (
                    <span>{' , '}<ReferenceLinks references={group.references} /></span>
                )}
            </div>
            {group.subterms?.map((subterm) => (
                <div key={subterm.id} style={{ paddingLeft: '2rem' }}>
                    {subterm.term}
                    {subterm.references && subterm.references.length > 0 && (
                        <span>{' , '}<ReferenceLinks references={subterm.references} /></span>
                    )}
                </div>
            ))}
        </div>
    );
}

/**
 * Convert a target ID like "nbc.divB.part5.sect9.subsect1.art1" to
 * a human-readable article number like "5.9.1.1."
 * Or "nbc.divBV2.part9.sect27.subsect5" to "9.27.5."
 */
function targetToArticleNumber(target: string): string {
    const partMatch = target.match(/\.part(\d+)/);
    const sectMatch = target.match(/\.sect(\d+)/);
    const subsectMatch = target.match(/\.subsect(\d+)/);
    const artMatch = target.match(/\.art(\d+)/);

    const parts: string[] = [];
    if (partMatch) parts.push(partMatch[1]);
    if (sectMatch) parts.push(sectMatch[1]);
    if (subsectMatch) parts.push(subsectMatch[1]);
    if (artMatch) parts.push(artMatch[1]);

    if (parts.length === 0) return target;
    return parts.join('.') + '.';
}

/**
 * Convert a target ID to a navigation URL path.
 * e.g. "nbc.divB.part5.sect9.subsect1.art1" → "/code/nbc.divB/5/9/1/1"
 * e.g. "nbc.divBV2.part9.sect27.subsect5" → "/code/nbc.divBV2/9/27/5"
 */
function targetToPath(target: string): string {
    // Extract division ID (e.g., "nbc.divB" or "nbc.divBV2")
    const divMatch = target.match(/^(nbc\.div[A-Z0-9]+)/i);
    if (!divMatch) return '#';

    const divisionId = divMatch[1];
    const partMatch = target.match(/\.part(\d+)/);
    const sectMatch = target.match(/\.sect(\d+)/);
    const subsectMatch = target.match(/\.subsect(\d+)/);
    const artMatch = target.match(/\.art(\d+)/);

    const segments = [`/code/${divisionId}`];
    if (partMatch) segments.push(partMatch[1]);
    if (sectMatch) segments.push(sectMatch[1]);
    if (subsectMatch) segments.push(subsectMatch[1]);
    if (artMatch) segments.push(artMatch[1]);

    return segments.join('/');
}

function ReferenceLinks({ references }: { references: IndexReference[] }) {
    return (
        <>
            {references.map((ref, idx) => (
                <span key={ref.target + idx}>
                    {idx > 0 && ', '}
                    <a href={targetToPath(ref.target)} style={{ color: '#1A5A96', textDecoration: 'none' }}>
                        {targetToArticleNumber(ref.target)}
                    </a>
                </span>
            ))}
        </>
    );
}

/**
 * Renders the Conversion Factors section content.
 * Uses the existing table-block CSS classes for consistent table styling
 * and parseTextWithMarkers to render superscript/subscript markers.
 *
 * The source data has 6 columns with empty padding cells. We collapse
 * them to the 3 meaningful columns: "To Convert", "To", "Multiply by".
 */
export function ConversionsRenderer({ data }: ConversionsRendererProps) {
    const tableStructure = data.table_structure;

    // Extract the 3 header labels from the header row (which uses colspan=2)
    const headerLabels = tableStructure?.header_rows?.[0]?.cells?.map((cell: any) =>
        renderCellContent(cell)
    ) || ['To Convert', 'To', 'Multiply by'];

    // Extract meaningful body rows: columns at index 1, 3, 4 contain the actual data
    const bodyRows = tableStructure?.body_rows?.map((row: any) => {
        const cells = row.cells || [];
        return [cells[1], cells[3], cells[4]].filter(Boolean);
    }) || [];

    return (
        <div className="reading-view__conversions">
            <h1 className="reading-view__title">{data.table_title || 'Conversion Factors'}</h1>
            {tableStructure && (
                <div className="table-block">
                    <div className="table-block__header">
                        <div className="table-block__title">{data.table_title || 'Conversion Factors'}</div>
                    </div>
                    <div className="table-block__body">
                        <div className="table-block__wrapper">
                            <table className="table-block__table">
                                <thead>
                                    <tr>
                                        {headerLabels.map((label: React.ReactNode, idx: number) => (
                                            <th key={`header-${idx}`} className="table-block__header-cell" style={{ textAlign: 'center' }}>
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {bodyRows.map((cells: any[], rowIdx: number) => (
                                        <tr key={`body-${rowIdx}`}>
                                            {cells.map((cell: any, cellIdx: number) => (
                                                <td
                                                    key={`body-${rowIdx}-${cellIdx}`}
                                                    className="table-block__cell"
                                                >
                                                    {renderCellContent(cell)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Render cell content using parseTextWithMarkers to handle
 * superscript (^{}) and subscript (_{}) markers, as well as
 * bold/italic formatting markers.
 */
function renderCellContent(cell: any): React.ReactNode {
    if (!cell?.content || !Array.isArray(cell.content)) {
        return null;
    }
    const text = cell.content
        .map((item: any) => {
            if (typeof item === 'string') return item;
            if (item?.value) return item.value;
            if (item?.text) return item.text;
            return '';
        })
        .join('');
    return parseTextWithMarkers(text, [], false);
}
