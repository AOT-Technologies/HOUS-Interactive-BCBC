import React from 'react';
import type { StructuredList } from '@bc-building-code/bcbc-parser';
import './StructuredListBlock.css';

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
        <ol className="structuredList structuredList--numbered">
          {list.items.map((item, index) => (
            <li key={item.id || `${list.type}-${index}`}>{renderText(item.content, index)}</li>
          ))}
        </ol>
      );
    case 'alphabetic':
      return (
        <ol className="structuredList structuredList--alphabetic" type="a">
          {list.items.map((item, index) => (
            <li key={item.id || `${list.type}-${index}`}>{renderText(item.content, index)}</li>
          ))}
        </ol>
      );
    case 'roman':
      return (
        <ol className="structuredList structuredList--roman" type="i">
          {list.items.map((item, index) => (
            <li key={item.id || `${list.type}-${index}`}>{renderText(item.content, index)}</li>
          ))}
        </ol>
      );
    case 'variable':
    case 'symbol':
      return (
        <dl className={`structuredList structuredList--${list.type}`}>
          {list.items.map((item, index) => (
            <div
              key={item.id || `${list.type}-${index}`}
              className="structuredList__row structuredList__row--variable"
            >
              <dt className="structuredList__term">{renderText(item.symbol ?? '')}</dt>
              <dd className="structuredList__description">{renderText(item.description ?? '')}</dd>
            </div>
          ))}
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
          <table className="structuredList__table">
            <caption className="structuredList__caption">Organizations</caption>
            <thead>
              <tr>
                <th scope="col">Abbreviation</th>
                <th scope="col">Organization</th>
                <th scope="col">Website</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((item, index) => (
                <tr key={item.id || `${list.type}-${index}`}>
                  <td>{item.abbreviation}</td>
                  <td>{item.fullName}</td>
                  <td>
                    {item.website ? (
                      <a href={item.website} target="_blank" rel="noopener noreferrer">
                        {item.website}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'bibliography':
      return (
        <div className="structuredList structuredList--bibliography">
          {list.header ? (
            <p className="structuredList__bibliography-header"><strong>{list.header}</strong></p>
          ) : null}
          <ol className="structuredList structuredList--numbered">
            {list.items.map((item, index) => (
              <li key={item.id || `bibliography-${index}`}>{renderText(item.content)}</li>
            ))}
          </ol>
        </div>
      );
    default:
      return null;
  }
};
