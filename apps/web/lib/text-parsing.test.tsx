import React from 'react';
import { render, screen } from '@testing-library/react';
import { parseTextWithMarkers } from './text-parsing';
import { FunctionalStatementLink } from '../components/reading/FunctionalStatementLink';
import { ObjectiveLink } from '../components/reading/ObjectiveLink';
import { CrossReferenceLink } from '../components/reading/CrossReferenceLink';
import { GlossaryTerm } from '../components/reading/GlossaryTerm';
import { SentenceBlock } from '../components/reading/SentenceBlock';
import type { ReferenceRenderContext } from './cross-reference';
import type { Sentence } from '@bc-building-code/bcbc-parser';
import { useStandardsMapStore } from '../stores/standards-map-store';
import { useVersionStore } from '../stores/version-store';

const getElementsByType = (
  nodes: React.ReactNode[],
  componentType: React.ElementType
): React.ReactElement[] => {
  const found: React.ReactElement[] = [];

  const visit = (node: React.ReactNode): void => {
    if (!React.isValidElement(node)) return;

    if (node.type === componentType) {
      found.push(node);
    }

    const children = React.Children.toArray(node.props.children);
    children.forEach(visit);
  };

  nodes.forEach(visit);
  return found;
};

const getTextContent = (nodes: React.ReactNode[]): string => {
  let text = '';

  const visit = (node: React.ReactNode): void => {
    if (typeof node === 'string') {
      text += node;
      return;
    }

    if (!React.isValidElement(node)) return;
    const children = React.Children.toArray(node.props.children);
    children.forEach(visit);
  };

  nodes.forEach(visit);
  return text;
};

const articleContext: ReferenceRenderContext = {
  kind: 'article',
  referenceId: 'nbc.divA.part1.sect3.subsect3.art3',
};

beforeEach(() => {
  useStandardsMapStore.getState().clearCache();
  useVersionStore.setState({ currentVersion: '2024' });
});

describe('parseTextWithMarkers - objective-based code references', () => {
  it('parses a compound functional statement + objective reference', () => {
    const input = '[[REF:functional-statement:fs01]-[REF:sub-objective:nbc-obj-os1.1]]';
    const nodes = parseTextWithMarkers(input, [], true);

    const functionalRefs = getElementsByType(nodes, FunctionalStatementLink);
    const objectiveRefs = getElementsByType(nodes, ObjectiveLink);

    expect(functionalRefs).toHaveLength(1);
    expect(functionalRefs[0].props.statementId).toBe('fs01');

    expect(objectiveRefs).toHaveLength(1);
    expect(objectiveRefs[0].props.objectiveId).toBe('nbc-obj-os1.1');
  });

  it('parses objective IDs containing hyphens and dots without truncation', () => {
    const input = '[[REF:sub-objective:nbc-obj-os5.2]]';
    const nodes = parseTextWithMarkers(input, [], true);
    const objectiveRefs = getElementsByType(nodes, ObjectiveLink);

    expect(objectiveRefs).toHaveLength(1);
    expect(objectiveRefs[0].props.objectiveId).toBe('nbc-obj-os5.2');
  });

  it('does not leave raw double-bracket markers in output text', () => {
    const input =
      '[[REF:functional-statement:fs30]-[REF:sub-objective:nbc-obj-os5.1],[REF:sub-objective:nbc-obj-os5.3]]';
    const nodes = parseTextWithMarkers(input, [], true);
    const textNodes = nodes.filter((node): node is string => typeof node === 'string');

    expect(textNodes.join('')).not.toContain('[[REF:');
  });

  it('formats internal figure references with BC figure numbering for long format', () => {
    const input = 'see [REF:internal:nbc.divB.part4.sect1.subsect6.art10.figure1:long]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('Figure 4.1.6.10.');
  });

  it('formats internal figure references with BC figure numbering for shortNum format', () => {
    const input = '[REF:internal:nbc.divB.part4.sect1.subsect6.art10.figure2:shortNum]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('4.1.6.10');
  });

  it('formats internal table references using parent article numbering for long format', () => {
    const input = '[REF:internal:nbc.divB.part9.sect3.subsect1.art7.table1:long]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('Table 9.3.1.7.');
  });

  it('formats part-level references as part labels for long format', () => {
    const input = '[REF:internal:nbc.divB.part5:long] applies to all buildings.';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.referenceId).toBe('nbc.divB.part5');
    expect(crossRefs[0].props.displayText).toBe('Part 5 of Division B');
  });

  it('consumes explicit part labels following a long-format part reference marker', () => {
    const input = 'See [REF:internal:nbc.divB.part5:long]Part 5. for details.';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);
    const text = getTextContent(nodes);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('Part 5.');
    expect(text).toContain('See ');
    expect(text).toContain(' for details.');
  });

  it('renders same-article references as plain text when article context is provided', () => {
    const input = 'See [REF:internal:nbc.divA.part1.sect3.subsect3.art3.sent1:long] for details.';
    const nodes = parseTextWithMarkers(input, [], true, [], [], articleContext);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(0);
    expect(getTextContent(nodes)).toContain('Sentence 1.3.3.3.(1)');
  });

  it('keeps out-of-article references interactive when article context is provided', () => {
    const input = 'See [REF:internal:nbc.divA.part1.sect3.subsect3.art2.sent1:long] for details.';
    const nodes = parseTextWithMarkers(input, [], true, [], [], articleContext);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.referenceId).toBe('nbc.divA.part1.sect3.subsect3.art2.sent1');
  });

  it('expands short sentence references to full numbering when they target a different article', () => {
    const input = 'Sentence [REF:internal:nbc.divA.part1.sect3.subsect3.art2.sent1:short] applies.';
    const nodes = parseTextWithMarkers(input, [], true, [], [], articleContext);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('1.3.3.2.(1)');
  });

  it('expands short clause references to full numbering when they target a different article', () => {
    const input = 'Clause [REF:internal:nbc.divB.part10.sect2.subsect2.art1.sent1.clause1:short] applies.';
    const nodes = parseTextWithMarkers(input, [], true, [], [], articleContext);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('10.2.2.1.(1)(a)');
  });

  it('renders same-appendix references as plain text when appendix context is provided', () => {
    const input =
      'See [REF:internal:nbc.divB.appendixD.appsect1.subsect2.article1.para2:long] of Appendix D.';
    const nodes = parseTextWithMarkers(input, [], true, [], [], {
      kind: 'appendix',
      referenceId: 'nbc.divB.appendixD.appsect1.subsect1.article1',
    });
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(0);
    expect(getTextContent(nodes)).toContain('Sentence D-1.2.1.(2)');
  });

  it('renders same application-note references as plain text when note context is provided', () => {
    const input = 'See [REF:internal:nbc.divC.part2.appendix.appnote7:short] for details.';
    const nodes = parseTextWithMarkers(input, [], true, [], [], {
      kind: 'application-note',
      referenceId: 'nbc.divC.part2.appendix.appnote7',
    });
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(0);
    expect(getTextContent(nodes)).toContain('Note');
  });

  it('keeps different application-note references interactive when note context is provided', () => {
    const input = 'See [REF:internal:nbc.divC.part2.appendix.appnote8:short] for details.';
    const nodes = parseTextWithMarkers(input, [], true, [], [], {
      kind: 'application-note',
      referenceId: 'nbc.divC.part2.appendix.appnote7',
    });
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.referenceId).toBe('nbc.divC.part2.appendix.appnote8');
  });

  it('renders spectables table-note references as cross-reference links with note labels', () => {
    const input =
      'See [REF:internal:nbc.divBV2.part9.spectables1.table1.note14:long], [REF:internal:nbc.divBV2.part9.spectables1.table1.note16:short] and [REF:internal:nbc.divBV2.part9.spectables1.table1.note22:short].';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(3);
    expect(crossRefs[0].props.referenceId).toBe('nbc.divBV2.part9.spectables1.table1.note14');
    expect(crossRefs[0].props.displayText).toBe('(14)');
    expect(crossRefs[1].props.referenceId).toBe('nbc.divBV2.part9.spectables1.table1.note16');
    expect(crossRefs[1].props.displayText).toBe('(16)');
    expect(crossRefs[2].props.referenceId).toBe('nbc.divBV2.part9.spectables1.table1.note22');
    expect(crossRefs[2].props.displayText).toBe('(22)');
  });

  it('parses note references with explicit display label payload', () => {
    const input = 'See [REF:internal:nbc.divC.part2.appendix.appnote1:short:Note A-2.2.1.2.(1)] for details.';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.referenceId).toBe('nbc.divC.part2.appendix.appnote1');
    expect(crossRefs[0].props.displayText).toBe('Note A-2.2.1.2.(1)');
  });

  it('consumes full note label including trailing bracket qualifier', () => {
    const input = 'retain (see [REF:internal:nbc.divB.part2.sect2.subsect7.appnote1:long]Note 2.2.7. (a))';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);
    const textNodes = nodes.filter((node): node is string => typeof node === 'string');

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('Note 2.2.7. (a)');
    expect(textNodes.join('')).not.toContain(' (a)');
  });

  it('consumes trailing bracket qualifier after app-note short marker', () => {
    const input = 'ascertain that (see [REF:internal:nbc.divC.part2.appendix.appnote7:short] (a))';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);
    const textNodes = nodes.filter((node): node is string => typeof node === 'string');

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText.startsWith('Note ')).toBe(true);
    expect(crossRefs[0].props.displayText.endsWith('(a)')).toBe(true);
    expect(textNodes.join('')).not.toContain(' (a)');
  });

  it('consumes trailing bracket qualifier after app-note custom label marker', () => {
    const input = 'ascertain that (see [REF:internal:nbc.divC.part2.appendix.appnote7:short:Note A-2.2.7.2.(1)] (a))';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);
    const textNodes = nodes.filter((node): node is string => typeof node === 'string');

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('Note A-2.2.7.2.(1) (a)');
    expect(textNodes.join('')).not.toContain(' (a)');
  });

  it('strips trailing period from article label when source period follows (avoids double period)', () => {
    // Input: "(See [REF...:long].)" — the source "." closes the sentence.
    // Display text "Article 1.3.3.2." ends with ".", so the duplicate-period
    // logic strips it to "Article 1.3.3.2", and the source period renders the
    // closing "(See Article 1.3.3.2.)" correctly with a single period.
    const input = '(See [REF:internal:nbc.divA.part1.sect3.subsect3.art2:long].)';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('Article 1.3.3.2');
  });

  it('avoids duplicate trailing period for generated appnote labels when source has period', () => {
    const input = '(See [REF:internal:nbc.divC.part2.appendix.appnote1:short].)';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText.endsWith('.')).toBe(false);
  });

  it('formats Appendix D table references with BC appendix numbering', () => {
    const input =
      'See Table [REF:internal:nbc.divB.appendixD.appsect1.subsect1.article2.table1:long] of Appendix D.';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('D-1.1.2.-A');
  });

  it('avoids duplicating the leading type label for Appendix D sentence references', () => {
    const input =
      'See Sentence [REF:internal:nbc.divB.appendixD.appsect1.subsect2.article1.para2:long] of Appendix D.';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('D-1.2.1.(2).');
  });

  it('avoids duplicating the leading sentence label after plural Sentences text', () => {
    const input =
      'Except as provided in Sentences [REF:internal:nbc.divB.part1.sect1.subsect3.art1.sent2:short] and [REF:internal:nbc.divB.part1.sect1.subsect3.art1.sent4:short] and as required by Sentence [REF:internal:nbc.divBV2.part9.sect7.subsect4.art3.sent2:short]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);
    const renderedText = getTextContent(nodes);

    expect(crossRefs).toHaveLength(3);
    expect(crossRefs[0].props.displayText).toBe('(2)');
    expect(crossRefs[1].props.displayText).toBe('(4)');
    expect(crossRefs[2].props.displayText).toBe('(2)');
    expect(renderedText).toContain('Except as provided in Sentences ');
    expect(renderedText).toContain(' and as required by Sentence ');
  });

  it('adds trailing period to numbered prefix before title-format internal references', () => {
    const input = 'See 9.3.1.4 [REF:internal:nbc.divBV2.part9.sect3.subsect1.art4:title]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);
    const renderedText = getTextContent(nodes);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('Article 9.3.1.4.');
    expect(renderedText).toContain('See 9.3.1.4. ');
  });

  it('renders long sentence references with full numbering when preceded by Sentence', () => {
    const input =
      'Sentence [REF:internal:nbc.divBV2.part9.sect7.subsect4.art3.sent2:long]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('9.7.4.3.(2)');
  });

  it('formats section long references with full numbering (no division suffix)', () => {
    const input = '[REF:internal:nbc.divBV2.part9.sect8:long]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('Section 9.8.');
  });

  it('formats cross-division section long references with division suffix', () => {
    const input = '[REF:internal:nbc.divC.part2.sect3:long]';
    const nodes = parseTextWithMarkers(input, [], true, [], [], articleContext);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('Section 2.3. of Division C');
  });

  it('formats subsection long references with full numbering (no division suffix)', () => {
    const input = '[REF:internal:nbc.divB.part1.sect1.subsect2:long]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('Subsection 1.1.2.');
  });

  it('formats cross-division subsection long references with division suffix', () => {
    const input = '[REF:internal:nbc.divB.part1.sect1.subsect2:long]';
    const nodes = parseTextWithMarkers(input, [], true, [], [], articleContext);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('Subsection 1.1.2. of Division B');
  });

  it('suppresses cross-division suffix for section references in table context', () => {
    const tableContext: ReferenceRenderContext = { kind: 'table', referenceId: 'nbc.divA.part1.sect1.subsect1.art1.table1' };
    const input = '[REF:internal:nbc.divC.part2.sect3:long]';
    const nodes = parseTextWithMarkers(input, [], true, [], [], tableContext);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('Section 2.3.');
    expect(crossRefs[0].props.currentDivision).toBeUndefined();
  });

  it('suppresses cross-division suffix for subsection references in table context', () => {
    const tableContext: ReferenceRenderContext = { kind: 'table', referenceId: 'nbc.divA.part1.sect1.subsect1.art1.table1' };
    const input = '[REF:internal:nbc.divB.part3.sect2.subsect8:long]';
    const nodes = parseTextWithMarkers(input, [], true, [], [], tableContext);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('Subsection 3.2.8.');
  });

  it('consumes redundant inline "of Division B" following a cross-division subsection reference', () => {
    // Source has ". of Division B" inline after the marker — should not duplicate the generated suffix.
    // The cross-reference link carries the suffix in its displayText prop; the inline source text
    // should be consumed (not rendered as additional plain text).
    const input = 'need not comply with [REF:internal:nbc.divB.part3.sect2.subsect8:long] . of Division B, provided';
    const nodes = parseTextWithMarkers(input, [], true, [], [], articleContext);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);
    const plainText = getTextContent(nodes);

    expect(crossRefs).toHaveLength(1);
    // The cross-ref link's displayText includes the suffix exactly once
    expect(crossRefs[0].props.displayText).toBe('Subsection 3.2.8. of Division B');
    // The plain text outside the cross-ref link does NOT contain "of Division B" —
    // the inline ". of Division B" was consumed and not rendered twice
    expect(plainText).not.toContain('of Division B');
  });

  it('formats sentence long references with full numbering', () => {
    const input = '[REF:internal:nbc.divA.part1.sect2.subsect1.art1.sent1:long]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('Sentence 1.2.1.1.(1)');
  });

  it('renders medium sentence references with full numbering when preceded by Sentence', () => {
    const input =
      'Sentence [REF:internal:nbc.divBV2.part9.sect7.subsect4.art3.sent2:medium]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('9.7.4.3.(2)');
  });

  it('renders medium clause references with full numbering when preceded by Clause', () => {
    const input =
      'Clause [REF:internal:nbc.divB.part10.sect2.subsect2.art1.sent1.clause1:medium]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('10.2.2.1.(1)(a)');
  });

  it('renders same-article clause references as plain text when article context is provided', () => {
    const input = 'See [REF:internal:nbc.divA.part1.sect3.subsect3.art3.sent1.clause1:medium] for details.';
    const nodes = parseTextWithMarkers(input, [], true, [], [], articleContext);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(0);
    expect(getTextContent(nodes)).toContain('Clause 1.3.3.3.(1)(a)');
  });

  it('renders same-article short clause references as plain text when article context is provided', () => {
    const input = 'See [REF:internal:nbc.divA.part1.sect3.subsect3.art3.sent1.clause1:short] for details.';
    const nodes = parseTextWithMarkers(input, [], true, [], [], articleContext);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(0);
    expect(getTextContent(nodes)).toContain('Clause (a)');
  });

  it('renders standard references as inline citation text', () => {
    useStandardsMapStore.setState({
      cache: new Map([
        [
          'standards-map:2024',
          {
            csaa440S1: {
              standard_ref_id: 'csaa440S1',
              agency: 'CSA',
              full_number: 'A440S1-19',
              full_title: 'Canadian Supplement to AAMA/WDMA/CSA 101/I.S.2/A440',
            },
          },
        ],
      ]),
    });

    const input = 'See [REF:standard:csaa440S1] for details.';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(0);
    expect(getTextContent(nodes)).toContain(
      'CSA A440S1, "Canadian Supplement to AAMA/WDMA/CSA 101/I.S.2/A440"'
    );
  });

  it('strips trailing edition suffix from displayed standard numbers', () => {
    useStandardsMapStore.setState({
      cache: new Map([
        [
          'standards-map:2024',
          {
            astmd1227: {
              standard_ref_id: 'astmd1227',
              agency: 'ASTM',
              full_number: 'D1227/D1227M-13',
              full_title: 'Standard Specification for Emulsified Asphalt Used as a Protective Coating for Roofing',
            },
          },
        ],
      ]),
    });

    const input = 'See [REF:standard:astmd1227] for details.';
    const nodes = parseTextWithMarkers(input, [], true);

    expect(getTextContent(nodes)).toContain(
      'ASTM D1227/D1227M, "Standard Specification for Emulsified Asphalt Used as a Protective Coating for Roofing"'
    );
    expect(getTextContent(nodes)).not.toContain('D1227/D1227M-13');
  });

  it('separates adjacent standard references with comma and space', () => {
    useStandardsMapStore.setState({
      cache: new Map([
        [
          'standards-map:2024',
          {
            nrcc40383: {
              standard_ref_id: 'nrcc40383',
              agency: 'NRCC',
              full_number: '40383',
              full_title: 'First Publication',
            },
            nrcc35951: {
              standard_ref_id: 'nrcc35951',
              agency: 'NRCC',
              full_number: '35951',
              full_title: 'Second Publication',
            },
          },
        ],
      ]),
    });

    const input =
      'found in the following publications:[REF:standard:nrcc40383][REF:standard:nrcc35951]Commentary entitled';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);
    const renderedText = getTextContent(nodes);

    expect(crossRefs).toHaveLength(0);
    expect(renderedText).toContain('publications:');
    expect(renderedText).toContain(', ');
    expect(renderedText).toContain('Commentary entitled');
  });

  it('adds space after last adjacent standard ref before following text, even if more markers exist later', () => {
    useStandardsMapStore.setState({
      cache: new Map([
        [
          'standards-map:2024',
          {
            nrcc40383: {
              standard_ref_id: 'nrcc40383',
              agency: 'NRCC',
              full_number: '40383',
              full_title: 'First Publication',
            },
            nrcc35951: {
              standard_ref_id: 'nrcc35951',
              agency: 'NRCC',
              full_number: '35951',
              full_title: 'Second Publication',
            },
            'nrcc-nbcug4': {
              standard_ref_id: 'nrcc-nbcug4',
              agency: 'NRCC',
              full_number: 'NBCUG4',
              full_title: 'Third Publication',
            },
          },
        ],
      ]),
    });

    const input =
      'See [REF:standard:nrcc40383][REF:standard:nrcc35951]Commentary entitled [REF:standard:nrcc-nbcug4].';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);
    const renderedText = getTextContent(nodes);

    expect(crossRefs).toHaveLength(0);
    expect(renderedText).toContain(', ');
    expect(renderedText).toContain('Commentary entitled ');
  });

  it('renders non-URL external references as plain text', () => {
    const input = 'See [REF:external:csa101a440] for details.';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(0);
    expect(getTextContent(nodes)).toContain('csa101a440');
  });

  it('parses URL external references into cross-reference links', () => {
    const input = 'Visit [REF:external:https://www.scc.ca:(www.scc.ca)] for details.';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.referenceId).toBe('external:https://www.scc.ca');
    expect(crossRefs[0].props.displayText).toBe('(www.scc.ca)');
  });

  it('parses external references with explicit label text', () => {
    useStandardsMapStore.setState({
      cache: new Map([
        [
          'standards-map:2024',
          {
            'csaa23.1': {
              standard_ref_id: 'csaa23.1',
              agency: 'CSA',
              full_number: 'A23.1-19',
              full_title: 'Concrete Materials and Methods of Concrete Construction',
            },
          },
        ],
      ]),
    });

    const input = 'concrete stated in [REF:external:csaa23.1:Section 9 of][REF:standard:csaa23.1]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(0);
    expect(getTextContent(nodes)).toContain(
      'CSA A23.1, "Concrete Materials and Methods of Concrete Construction"'
    );
    expect(getTextContent(nodes)).toContain('Section 9 of');
  });

  it('preserves trailing space in external-reference label text', () => {
    useStandardsMapStore.setState({
      cache: new Map([
        [
          'standards-map:2024',
          {
            'csaa23.1': {
              standard_ref_id: 'csaa23.1',
              agency: 'CSA',
              full_number: 'A23.1-19',
              full_title: 'Concrete Materials and Methods of Concrete Construction',
            },
          },
        ],
      ]),
    });

    const input = '[REF:external:csaa23.1:Section 9 of ][REF:standard:csaa23.1]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(0);
    expect(getTextContent(nodes)).toContain('Section 9 of ');
  });

  it('parses spaced double-bracket functional/objective references', () => {
    const input = '[ [REF:functional-statement:fs05] - [REF:sub-objective:nbc-obj-os1.5] ]';
    const nodes = parseTextWithMarkers(input, [], true);

    const functionalRefs = getElementsByType(nodes, FunctionalStatementLink);
    const objectiveRefs = getElementsByType(nodes, ObjectiveLink);

    expect(functionalRefs).toHaveLength(1);
    expect(functionalRefs[0].props.statementId).toBe('fs05');
    expect(objectiveRefs).toHaveLength(1);
    expect(objectiveRefs[0].props.objectiveId).toBe('nbc-obj-os1.5');
  });

  it('parses multiline spaced double-bracket references', () => {
    const input = '[ [REF:functional-statement:fs20] ,\n[REF:functional-statement:fs21] - [REF:sub-objective:nbc-obj-op2.3] ]';
    const nodes = parseTextWithMarkers(input, [], true);

    const functionalRefs = getElementsByType(nodes, FunctionalStatementLink);
    const objectiveRefs = getElementsByType(nodes, ObjectiveLink);

    expect(functionalRefs.length).toBeGreaterThanOrEqual(2);
    expect(objectiveRefs).toHaveLength(1);
    expect(objectiveRefs[0].props.objectiveId).toBe('nbc-obj-op2.3');
  });

  it('renders glossary label from marker payload in new format', () => {
    const input = 'in [REF:term:bldng-r:building area] that do not create a hazard';
    const nodes = parseTextWithMarkers(input, [], true);
    const glossaryTerms = getElementsByType(nodes, GlossaryTerm);

    expect(glossaryTerms).toHaveLength(1);
    expect(glossaryTerms[0].props.termId).toBe('bldng-r');
    expect(glossaryTerms[0].props.text).toBe('building area');
  });

  it('keeps compatibility with legacy glossary format', () => {
    const input = 'all [REF:term:bldng]buildings shall comply';
    const nodes = parseTextWithMarkers(input, [], true);
    const glossaryTerms = getElementsByType(nodes, GlossaryTerm);

    expect(glossaryTerms).toHaveLength(1);
    expect(glossaryTerms[0].props.termId).toBe('bldng');
    expect(glossaryTerms[0].props.text).toBe('buildings');
  });
});

describe('parseTextWithMarkers - nested lists', () => {
  it('renders a variable sub-list embedded inside a bulleted list item', () => {
    const sentence: Sentence = {
      id: 'sentence-nested-list',
      type: 'sentence',
      number: '2',
      text: 'The following conditions are met:[LIST:bulleted]',
      glossaryTerms: [],
      lists: [
        {
          type: 'bulleted',
          items: [
            { content: 'its equivalent thickness is not less than 200 mm ,' },
            { content: 'the effective length, kl_u, is not more than 3.7 m where[LIST:variable]' },
          ],
        },
        {
          type: 'variable',
          items: [
            { symbol: 'k', description: '= effective length factor' },
            { symbol: 'l_u', description: '= unsupported length of the wall in metres.' },
          ],
        },
      ],
    } as unknown as Sentence;

    render(<SentenceBlock sentence={sentence} />);

    expect(screen.getByText(/its equivalent thickness/)).toBeInTheDocument();
    expect(screen.getByText(/the effective length/)).toBeInTheDocument();
    expect(screen.getByText('k')).toBeInTheDocument();
    expect(screen.getByText('= effective length factor')).toBeInTheDocument();
    expect(screen.getByText(/= unsupported length/)).toBeInTheDocument();
  });

  it('does not leak [LIST:variable] as raw text when sub-list is present', () => {
    const sentence: Sentence = {
      id: 'sentence-no-leak',
      type: 'sentence',
      number: '1',
      text: 'Conditions:[LIST:bulleted]',
      glossaryTerms: [],
      lists: [
        {
          type: 'bulleted',
          items: [
            { content: 'first condition,' },
            { content: 'second condition where[LIST:variable]' },
          ],
        },
        {
          type: 'variable',
          items: [{ symbol: 'A', description: '= area' }],
        },
      ],
    } as unknown as Sentence;

    render(<SentenceBlock sentence={sentence} />);

    expect(screen.queryByText(/\[LIST:variable\]/)).not.toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('= area')).toBeInTheDocument();
  });

  it('assigns distinct sub-lists to separate parent bullets in order', () => {
    // Mirrors the "Wired Glass Assembly Support" case:
    // bullet b → gets sub-list 2, bullet d → gets sub-list 3 (not sub-list 2 again)
    const sentence: Sentence = {
      id: 'sentence-multi-nested',
      type: 'sentence',
      number: '1',
      text: 'The wired glass is[LIST:bulleted]',
      glossaryTerms: [],
      lists: [
        {
          type: 'bulleted',
          items: [
            { content: 'not less than 6 mm thick;' },
            { content: 'reinforced by a wire mesh having dimensions of[LIST:bulleted]' },
            { content: 'set in fixed steel frames; and' },
            { content: 'limited in area so that[LIST:bulleted]' },
          ],
        },
        {
          type: 'bulleted',
          items: [
            { content: 'approximately 25 mm across the flats, or' },
            { content: 'approximately 13 mm across the flats.' },
          ],
        },
        {
          type: 'bulleted',
          items: [
            { content: 'individual panes are not more than 0.84 m, and' },
            { content: 'the area not supported by mullions is not more than 7.5 m.' },
          ],
        },
      ],
    } as unknown as Sentence;

    render(<SentenceBlock sentence={sentence} />);

    // Sub-list 2 items appear once each
    expect(screen.getAllByText(/approximately 25 mm/)).toHaveLength(1);
    expect(screen.getAllByText(/approximately 13 mm/)).toHaveLength(1);
    // Sub-list 3 items appear once each (not duplicated from sub-list 2)
    expect(screen.getAllByText(/individual panes/)).toHaveLength(1);
    expect(screen.getAllByText(/not supported by mullions/)).toHaveLength(1);
  });
});
