import React from 'react';
import type { StructuredList } from '@bc-building-code/bcbc-parser';
import './StructuredListBlock.css';

// CLAUDE-AUTOFIX CF-03869 | issue 2161 | The PDF prints the labels of these lists as text ("(a)", "(1)", "1.", "(i)", "A.", "a)"), so the website writes them as text instead of drawing CSS markers; each list was checked against the PDF and is found by the start of its first item. Lists not listed here (e.g. the Appendix D clause lists the PDF labels "a)", "i)") keep the CSS markers.
const TEXT_LABELS: Array<[string, string]> = [
  // "(1)", "(2)": Notes A-3.8.2.5., A-5.4.1.1.(3), A-9.10.13.2.(1) and the A-9.25.5.2. references.
  ['be not less than 2 600 mm wide', '(n)'],
  ['at ambient temperatures with no temperature', '(n)'],
  ["the manufacturer's or vendor's name", '(n)'],
  ['“Exposure Guidelines for Residential', '(n)'],
  // "1.", "2.": Appendix C snow loads and seismic hazard steps, Notes A-9.10.15.4.(2), A-9.10.19.3.(1), A-9.23.10.2. and A-9.36.2.4.(1) example.
  ['The depth of snow on the ground', 'n.'],
  ['Go to the 2020 National Building Code', 'n.'],
  ['Calculate the total area of the exposing', 'n.'],
  ['establish grade, which is the lowest', 'n.'],
  ['Determine the mid-point of the centre line', 'n.'],
  ['Determine the thermal resistance of each continuous', 'n.'],
  // "(a)", "(b)": Note A-6.3.1.5., the Appendix D-1.7.4. sample calculations, Notes A-9.15.3.4.(2) and A-9.23.4.2.
  ['Air-handling equipment should be accessible', '(a)'],
  ['The minimum equivalent thickness of Type S', '(a)'],
  ['Since gypsum board is used', '(a)'],
  ['According to [REF:internal:nbc.divB.appendixD.appsect2.subsect1.article1.table1', '(a)'],
  ['Determine for each storey the span', '(a)'],
  ['sum_{1} = 6 + 6 = 12 m', '(a)'],
  ['For a 3.5 kPa specified snow load', '(a)'],
  // "A.", "B.": Note A-9.36.2.4.(1); "a)", "b)": Article D-2.6.6.; "(i)", "(ii)": Note A-9.36.2.4.(1) example.
  ['calculate the effective thermal resistance', 'A.'],
  ['1.0 [EQ:inline:eg02535a]', 'a)'],
  ['along a line that goes through the framing', '(i)'],
];

function listLabel(type: string, items: Array<{ content?: string }>, index: number): string | null {
  const first = (items[0]?.content ?? '').trim();
  const entry = TEXT_LABELS.find(([prefix]) => first.startsWith(prefix));
  // Every reference list in the PDF is labelled (1), (2) ...
  const format = entry ? entry[1] : type === 'bibliography' ? '(n)' : null;
  const letter = String.fromCharCode(97 + index);
  const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'][index] ?? String(index + 1);
  switch (format) {
    case '(a)':
      return `(${letter})`;
    case 'a)':
      return `${letter})`;
    case 'A.':
      return `${letter.toUpperCase()}.`;
    case '(i)':
      return `(${roman})`;
    case '(n)':
      return `(${index + 1})`;
    case 'n.':
      return `${index + 1}.`;
    default:
      return null;
  }
}

function ListItemLabel({ label }: { label: string | null }) {
  return label ? (
    <>
      <span className="structuredList__label">{label}</span>{' '}
    </>
  ) : null;
}

export interface StructuredListBlockProps {
  list: StructuredList;
  interactive?: boolean;
  renderText: (text: string, itemIndex?: number) => React.ReactNode[];
}

export const StructuredListBlock: React.FC<StructuredListBlockProps> = ({
  list,
  renderText,
}) => {
  switch (list.type) {
    case 'bulleted':
      return (
        <ul className="structuredList structuredList--bulleted">
          {list.items.map((item, index) => (
            <li key={item.id || `${list.type}-${index}`}>{renderText(item.content, index)}</li>
          ))}
        </ul>
      );
    case 'numbered':
      return (
        <ol
          className={`structuredList structuredList--numbered${listLabel(list.type, list.items, 0) ? ' structuredList--labelled' : ''}`}
        >
          {list.items.map((item, index) => (
            <li key={item.id || `${list.type}-${index}`}>
              <ListItemLabel label={listLabel(list.type, list.items, index)} />
              {renderText(item.content, index)}
            </li>
          ))}
        </ol>
      );
    case 'alphabetic':
      return (
        <ol
          className={`structuredList structuredList--alphabetic${listLabel(list.type, list.items, 0) ? ' structuredList--labelled' : ''}`}
          type="a"
        >
          {list.items.map((item, index) => (
            <li key={item.id || `${list.type}-${index}`}>
              <ListItemLabel label={listLabel(list.type, list.items, index)} />
              {renderText(item.content, index)}
            </li>
          ))}
        </ol>
      );
    case 'roman':
      return (
        <ol
          className={`structuredList structuredList--roman${listLabel(list.type, list.items, 0) ? ' structuredList--labelled' : ''}`}
          type="i"
        >
          {list.items.map((item, index) => (
            <li key={item.id || `${list.type}-${index}`}>
              <ListItemLabel label={listLabel(list.type, list.items, index)} />
              {renderText(item.content, index)}
            </li>
          ))}
        </ol>
      );
    case 'variable':
    case 'symbol':
      return (
        <dl className={`structuredList structuredList--${list.type}`}>
          {list.items.map((item, index) => {
            // CLAUDE-AUTOFIX CL-094 CF-06000 | issue 1810 | Items given only as "AFUE= annual fuel ..." text (table notes to Tables 9.36.3.10. and 9.36.4.2.) are split at "=" so the symbol and its meaning show, as in the PDF.
            const rawContent = (item as { content?: string }).content;
            const splitAt = item.symbol === undefined && item.description === undefined && rawContent ? rawContent.indexOf('=') : -1;
            const symbol = splitAt > 0 ? rawContent!.slice(0, splitAt).trim() : item.symbol ?? '';
            const description = splitAt > 0 ? rawContent!.slice(splitAt) : item.description ?? '';
            return (
              <div
                key={item.id || `${list.type}-${index}`}
                className="structuredList__row structuredList__row--variable"
              >
                <dt className="structuredList__term">{renderText(symbol)}</dt>
                <dd className="structuredList__description">{renderText(description)}</dd>
              </div>
            );
          })}
        </dl>
      );
    case 'definition':
      return (
        <dl className="structuredList structuredList--definition">
          {list.items.map((item, index) => (
            <div key={item.id || `${list.type}-${index}`} className="structuredList__row">
              <dt className="structuredList__term">{item.term}</dt>
              <dd className="structuredList__description">{renderText(item.definition)}</dd>
            </div>
          ))}
        </dl>
      );
    case 'organization':
      return (
        <div className="structuredList structuredList--organization">
          {/* CLAUDE-AUTOFIX CL-057 CF-00798 | issue 559 | The PDF prints each organization as one plain line: "ABBR  Full name ( www.example.org)", with no table, caption or column headings. */}
          {list.items.map((item, index) => (
            <p key={item.id || `${list.type}-${index}`} className="structuredList__organization-row">
              <span className="structuredList__organization-abbreviation">{item.abbreviation}</span>
              {item.fullName ? ` ${item.fullName}` : ''}
              {item.website ? (
                <>
                  {' ( '}
                  <a href={item.website} target="_blank" rel="noopener noreferrer">
                    {item.website.replace(/^https?:\/\//i, '')}
                  </a>
                  {')'}
                </>
              ) : null}
            </p>
          ))}
        </div>
      );
    case 'bibliography':
      return (
        <div className="structuredList structuredList--bibliography">
          {list.header ? (
            <p className="structuredList__bibliography-header"><strong>{list.header}</strong></p>
          ) : null}
          <ol className="structuredList structuredList--numbered structuredList--labelled">
            {list.items.map((item, index) => (
              <li key={item.id || `bibliography-${index}`}>
                <ListItemLabel label={listLabel('bibliography', list.items, index)} />
                {renderText(item.content)}
              </li>
            ))}
          </ol>
        </div>
      );
    case 'none':
      return (
        <ul className="structuredList structuredList--none">
          {list.items.map((item, index) => (
            <li key={item.id || `${list.type}-${index}`}>{renderText(item.content, index)}</li>
          ))}
        </ul>
      );
    default:
      return null;
  }
};
