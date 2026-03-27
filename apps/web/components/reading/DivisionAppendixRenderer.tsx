import React from 'react';
import { TableBlock } from './TableBlock';
import { FigureBlock } from './FigureBlock';
import { StructuredListBlock } from './StructuredListBlock';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import type { ReferenceRenderContext } from '../../lib/cross-reference';
import type { StructuredList } from '@bc-building-code/bcbc-parser';
import type {
  AppendixParagraph,
  AppendixStandaloneList,
  DivisionAppendix,
  DivisionAppendixArticle,
  DivisionAppendixSection,
  DivisionAppendixSubsection,
} from '../../lib/stores/appendix-store';

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
  const hasBlockLevelInlineContent = (paragraph: {
    content?: string;
    lists?: unknown[];
  }) =>
    Boolean(paragraph.lists?.length) || /\[LIST:[^\]]+\]|\[EQ:display(?::[^\]]*)?\]/i.test(paragraph.content || '');

  const appendixContext: ReferenceRenderContext = {
    kind: 'appendix',
    referenceId: appendix.id,
  };

  const normalizeStandaloneList = (item: AppendixStandaloneList): StructuredList | null => {
    if (item.list) {
      return item.list;
    }

    const listType = item.list_type;
    const rawItems = item.items;
    if (!listType || !Array.isArray(rawItems)) {
      return null;
    }

    if (listType === 'bulleted' || listType === 'numbered' || listType === 'alphabetic') {
      return {
        type: listType,
        items: rawItems
          .filter((entry): entry is { id?: string; content: string } =>
            Boolean(entry && typeof entry === 'object' && typeof (entry as { content?: unknown }).content === 'string')
          )
          .map((entry) => ({ id: entry.id, content: entry.content })),
      };
    }

    if (listType === 'variable') {
      return {
        type: 'variable',
        items: rawItems
          .filter((entry): entry is { id?: string; symbol: string; description: string } =>
            Boolean(
              entry &&
                typeof entry === 'object' &&
                typeof (entry as { symbol?: unknown }).symbol === 'string' &&
                typeof (entry as { description?: unknown }).description === 'string'
            )
          )
          .map((entry) => ({ id: entry.id, symbol: entry.symbol, description: entry.description })),
      };
    }

    if (listType === 'definition') {
      return {
        type: 'definition',
        items: rawItems
          .filter((entry): entry is { id: string; term: string; definition: string } =>
            Boolean(
              entry &&
                typeof entry === 'object' &&
                typeof (entry as { id?: unknown }).id === 'string' &&
                typeof (entry as { term?: unknown }).term === 'string' &&
                typeof (entry as { definition?: unknown }).definition === 'string'
            )
          )
          .map((entry) => ({ id: entry.id, term: entry.term, definition: entry.definition })),
      };
    }

    if (listType === 'organization') {
      return {
        type: 'organization',
        items: rawItems
          .filter((entry): entry is { id: string; abbreviation: string; fullName: string; website?: string } =>
            Boolean(
              entry &&
                typeof entry === 'object' &&
                typeof (entry as { id?: unknown }).id === 'string' &&
                typeof (entry as { abbreviation?: unknown }).abbreviation === 'string' &&
                typeof (entry as { fullName?: unknown }).fullName === 'string'
            )
          )
          .map((entry) => ({
            id: entry.id,
            abbreviation: entry.abbreviation,
            fullName: entry.fullName,
            website: entry.website,
          })),
      };
    }

    if (listType === 'bibliography') {
      return {
        type: 'bibliography',
        header: (item as { header?: string }).header,
        items: rawItems
          .filter((entry): entry is { id?: string; content: string } =>
            Boolean(entry && typeof entry === 'object' && typeof (entry as { content?: unknown }).content === 'string')
          )
          .map((entry) => ({ id: entry.id, content: entry.content })),
      };
    }

    return null;
  };

  const renderParagraph = (
    paragraph: AppendixParagraph,
    keyPrefix: string,
    index: number
  ) => {
    const content = parseTextWithMarkers(
      paragraph.content || '',
      [],
      interactive,
      paragraph.equations || [],
      paragraph.lists || [],
      appendixContext
    );
    const WrapperTag = hasBlockLevelInlineContent(paragraph) ? 'div' : 'p';

    return (
      <WrapperTag key={`${keyPrefix}-paragraph-${paragraph.id || index}`} id={paragraph.id}>
        {content}
      </WrapperTag>
    );
  };

  const renderSectionContent = (section: DivisionAppendixSection, keyPrefix: string) => {
    if (Array.isArray(section.content) && section.content.length > 0) {
      return section.content.map((item, index) => {
        if (item.type === 'paragraph') {
          return renderParagraph(item, keyPrefix, index);
        }

        if (item.type === 'table') {
          return (
            <TableBlock
              key={`${keyPrefix}-table-${item.id || index}`}
              table={item}
              interactive={interactive}
              effectiveDate={effectiveDate}
              renderContext={appendixContext}
            />
          );
        }

        if (item.type === 'figure') {
          return (
            <FigureBlock
              key={`${keyPrefix}-figure-${item.id || index}`}
              figure={item}
              interactive={interactive}
              renderContext={appendixContext}
            />
          );
        }

        if (item.type === 'list') {
          const normalizedList = normalizeStandaloneList(item);
          if (!normalizedList) {
            return null;
          }

          return (
            <StructuredListBlock
              key={`${keyPrefix}-list-${item.id || index}`}
              list={normalizedList}
              interactive={interactive}
              renderText={(value: string) =>
                parseTextWithMarkers(value, [], interactive, [], [], appendixContext)
              }
            />
          );
        }

        return null;
      });
    }

    return section.paragraphs?.map((paragraph, index) => renderParagraph(paragraph, keyPrefix, index));
  };

  const isSectionNode = (
    item: DivisionAppendix['sections'][number]
  ): item is DivisionAppendixSection =>
    item.type === 'appendix_section' || item.type === 'note_division';

  /**
   * Derives a display number from an appendix element ID.
   * e.g. "nbc.divB.appendixD.appsect2.subsect11.article3" → "D-2.11.3."
   */
  const deriveAppendixNumber = (id: string): string => {
    const letter = appendix.letter;
    // Extract numeric segments from appsect, subsect, article parts
    const sectionMatch = id.match(/appsect(\d+)/);
    const subsectMatch = id.match(/subsect(\d+)/);
    const articleMatch = id.match(/article(\d+)/);

    const parts: string[] = [`${letter}-`];
    if (sectionMatch) parts.push(sectionMatch[1]);
    if (subsectMatch) parts.push(`.${subsectMatch[1]}`);
    if (articleMatch) parts.push(`.${articleMatch[1]}`);
    parts.push('.');

    return parts.join('');
  };

  return (
    <div className="reading-view__appendix">
      <h2 className="reading-view__appendix-heading">
        {`Appendix ${appendix.letter} ${appendix.title}`}
      </h2>
      {appendix.introduction ? (
        <p className="reading-view__appendix-introduction">
          {parseTextWithMarkers(appendix.introduction, [], interactive, [], [], appendixContext)}
        </p>
      ) : null}
      <div className="reading-view__appendix-notes">
        {appendix.sections.map((section, sectionIndex) => {
          if (section.type === 'paragraph') {
            return renderParagraph(section, appendix.id, sectionIndex);
          }

          if (section.type === 'list') {
            const normalizedList = normalizeStandaloneList(section);
            if (!normalizedList) {
              return null;
            }

            return (
              <StructuredListBlock
                key={`${appendix.id}-list-${section.id || sectionIndex}`}
                list={normalizedList}
                interactive={interactive}
                renderText={(value: string) =>
                  parseTextWithMarkers(value, [], interactive, [], [], appendixContext)
                }
              />
            );
          }

          if (section.type === 'table') {
            return (
              <TableBlock
                key={`${appendix.id}-table-${section.id || sectionIndex}`}
                table={section}
                interactive={interactive}
                effectiveDate={effectiveDate}
                renderContext={appendixContext}
              />
            );
          }

          if (section.type === 'figure') {
            return (
              <FigureBlock
                key={`${appendix.id}-figure-${section.id || sectionIndex}`}
                figure={section}
                interactive={interactive}
                renderContext={appendixContext}
              />
            );
          }

          if (!isSectionNode(section)) {
            return null;
          }

          return (
            <section
              key={section.id}
              id={section.id}
              className="reading-view__appendix-division"
            >
              {section.title ? <h3>{`${deriveAppendixNumber(section.id)}\u00A0\u00A0\u00A0${section.title}`}</h3> : null}
              {renderSectionContent(section, section.id)}
              {section.subsections?.map((subsection: DivisionAppendixSubsection) => (
                <section
                  key={subsection.id}
                  id={subsection.id}
                  className="reading-view__appendix-division"
                >
                  <h4>{`${deriveAppendixNumber(subsection.id)}\u00A0\u00A0\u00A0${subsection.title}`}</h4>
                  {subsection.paragraphs?.map((paragraph: AppendixParagraph, index: number) =>
                    renderParagraph(paragraph, subsection.id, index)
                  )}
                  {subsection.articles.map((article: DivisionAppendixArticle) => (
                    <article
                      key={article.id}
                      id={article.id}
                      className="reading-view__appendix-note"
                    >
                      <h5 className="reading-view__appendix-note-title">{`${deriveAppendixNumber(article.id)}\u00A0\u00A0\u00A0${article.title}`}</h5>
                      {article.see_also?.trim() ? (
                        <p className="reading-view__appendix-note-see-also">
                          {parseTextWithMarkers(article.see_also.trim(), [], interactive, [], [], appendixContext)}
                        </p>
                      ) : null}
                      <div className="reading-view__appendix-note-content">
                        {article.content?.map((item: NonNullable<typeof article.content>[number], index: number) => {
                          if (item.type === 'paragraph' || (!('type' in item) && 'content' in item)) {
                            return renderParagraph(item as AppendixParagraph, article.id, index);
                          }

                          if (item.type === 'table') {
                            return (
                              <TableBlock
                                key={`${article.id}-table-${item.id || index}`}
                                table={item}
                                interactive={interactive}
                                effectiveDate={effectiveDate}
                                renderContext={appendixContext}
                              />
                            );
                          }

                          if (item.type === 'figure') {
                            return (
                              <FigureBlock
                                key={`${article.id}-figure-${item.id || index}`}
                                figure={item}
                                interactive={interactive}
                                renderContext={appendixContext}
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
          );
        })}
      </div>
    </div>
  );
};
