import React from 'react';
import { TableBlock } from './TableBlock';
import { FigureBlock } from './FigureBlock';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import type { DivisionAppendix } from '../../lib/stores/appendix-store';

interface DivisionAppendixRendererProps {
  appendix: DivisionAppendix;
  interactive?: boolean;
  effectiveDate?: string;
}

export const DivisionAppendixRenderer: React.FC<DivisionAppendixRendererProps> = ({
  appendix,
  interactive = true,
  effectiveDate,
}) => {
  return (
    <div className="reading-view__appendix">
      <h2 className="reading-view__appendix-heading">
        {`Appendix ${appendix.letter} ${appendix.title}`}
      </h2>
      {appendix.introduction ? (
        <p className="reading-view__appendix-introduction">
          {parseTextWithMarkers(appendix.introduction, [], interactive)}
        </p>
      ) : null}
      <div className="reading-view__appendix-notes">
        {appendix.sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="reading-view__appendix-division"
          >
            <h3>{section.title}</h3>
            {section.paragraphs?.map((paragraph, index) => (
              <p key={`${section.id}-paragraph-${paragraph.id || index}`} id={paragraph.id}>
                {parseTextWithMarkers(
                  paragraph.content || '',
                  [],
                  interactive,
                  paragraph.equations || [],
                  paragraph.lists || []
                )}
              </p>
            ))}
            {section.subsections?.map((subsection) => (
              <section
                key={subsection.id}
                id={subsection.id}
                className="reading-view__appendix-division"
              >
                <h4>{subsection.title}</h4>
                {subsection.articles.map((article) => (
                  <article
                    key={article.id}
                    id={article.id}
                    className="reading-view__appendix-note"
                  >
                    <h5 className="reading-view__appendix-note-title">{article.title}</h5>
                    <div className="reading-view__appendix-note-content">
                      {article.paragraphs?.map((paragraph, index) => (
                        <p key={`${article.id}-paragraph-${paragraph.id || index}`} id={paragraph.id}>
                          {parseTextWithMarkers(
                            paragraph.content || '',
                            [],
                            interactive,
                            paragraph.equations || [],
                            paragraph.lists || []
                          )}
                        </p>
                      ))}
                      {article.content?.map((item, index) => {
                        if (item.type === 'table') {
                          return (
                            <TableBlock
                              key={`${article.id}-table-${item.id || index}`}
                              table={item}
                              interactive={interactive}
                              effectiveDate={effectiveDate}
                            />
                          );
                        }

                        if (item.type === 'figure') {
                          return (
                            <FigureBlock
                              key={`${article.id}-figure-${item.id || index}`}
                              figure={item}
                            />
                          );
                        }

                        return null;
                      })}
                    </div>
                  </article>
                ))}
              </section>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
};
