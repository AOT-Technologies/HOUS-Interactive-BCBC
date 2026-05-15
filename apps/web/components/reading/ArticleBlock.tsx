/**
 * ArticleBlock - Renders an article with its content
 * 
 * Uses type-driven recursive rendering to handle all content types
 * in source order (sentences, tables, figures, equations, notes)
 */

import React from 'react';
import type { Article } from '@bc-building-code/bcbc-parser';
import { ContentRenderer } from './ContentRenderer';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import type { ReferenceRenderContext } from '../../lib/cross-reference';
import { formatNumberedTitle } from '../../lib/title-formatting';
import './ArticleBlock.css';

type RawFormingPartEntry = { type: string; target: string };
type RawTableItem = { id?: string; forming_part?: RawFormingPartEntry[]; formingPart?: RawFormingPartEntry[] };

function extractArticleRef(id: string): string | null {
  const part = id.match(/\.part(\d+)/i)?.[1];
  const section = id.match(/\.sect(\d+)/i)?.[1];
  const subsection = id.match(/\.subsect(\d+)/i)?.[1];
  const article = id.match(/\.art(\d+)/i)?.[1];
  if (part && section && subsection && article) {
    return `${part}.${section}.${subsection}.${article}`;
  }
  return null;
}

function computeTableNumbers(articleContent: unknown[]): Map<string, string> {
  const map = new Map<string, string>();
  const tables = articleContent.filter(
    (item) => (item as { type?: string }).type === 'table'
  ) as RawTableItem[];

  if (tables.length <= 1) return map;

  const infos = tables.map((t) => {
    const id = t.id ?? '';
    const articleRef = extractArticleRef(id);
    const ownPrefix = id.replace(/\.table\d+$/i, '');
    const fp = t.forming_part ?? t.formingPart ?? [];
    const sentences = fp
      .filter(
        (e) =>
          e.type === 'internal' &&
          e.target?.startsWith(ownPrefix) &&
          e.target?.includes('.sent')
      )
      .map((e) => e.target.match(/\.sent(\d+)/i)?.[1] ?? null)
      .filter((s): s is string => s !== null);
    return { id, articleRef, sentences };
  });

  const allHaveOneSentence = infos.every((t) => t.sentences.length === 1);
  const allSentencesUnique =
    new Set(infos.flatMap((t) => t.sentences)).size === infos.length;
  const useSentenceSuffix = allHaveOneSentence && allSentencesUnique;

  infos.forEach((info, idx) => {
    if (!info.articleRef) return;
    if (useSentenceSuffix) {
      map.set(info.id, `${info.articleRef}.(${info.sentences[0]})`);
    } else {
      const letter = String.fromCharCode(65 + idx);
      map.set(info.id, `${info.articleRef}.-${letter}`);
    }
  });

  return map;
}

export interface ArticleBlockProps {
  article: Article;
  subsectionNumberPrefix?: string;
  effectiveDate?: string;
  interactive?: boolean;
}

export const ArticleBlock: React.FC<ArticleBlockProps> = ({
  article,
  subsectionNumberPrefix,
  effectiveDate,
  interactive = true
}) => {
  const articleWithSeeAlso = article as Article & { see_also?: string };
  const seeAlsoText = articleWithSeeAlso.see_also?.trim();
  const articleNoteText = (article as Article & { note?: string }).note?.trim();
  const fullArticleNumber = subsectionNumberPrefix
    ? `${subsectionNumberPrefix}.${article.number}`
    : article.number;
  const renderContext: ReferenceRenderContext = {
    kind: 'article',
    referenceId: article.id,
  };
  const tableNumbers = computeTableNumbers(article.content || []);

  return (
    <div className="articleBlock">
      <h4 className="articleHeading">
        {formatNumberedTitle(fullArticleNumber, article.title)}
      </h4>
      {seeAlsoText ? (
        <p className="articleSeeAlso">
          {parseTextWithMarkers(seeAlsoText, [], interactive, [], [], renderContext)}
        </p>
      ) : null}
      {articleNoteText ? (
        <p className="articleSeeAlso">
          {parseTextWithMarkers(articleNoteText, [], interactive, [], [], renderContext)}
        </p>
      ) : null}

      {/* Render all content in source order using type-driven dispatcher */}
      <div className="articleContent">
        {(article.content || []).map((item, index) => {
          const itemAny = item as { type?: string; id?: string };
          const tableNumberOverride =
            itemAny.type === 'table' && itemAny.id
              ? tableNumbers.get(itemAny.id)
              : undefined;
          return (
            <ContentRenderer
              key={`${article.id}-content-${index}`}
              node={item}
              effectiveDate={effectiveDate}
              interactive={interactive}
              renderContext={renderContext}
              tableNumberOverride={tableNumberOverride}
            />
          );
        })}
      </div>
    </div>
  );
};
