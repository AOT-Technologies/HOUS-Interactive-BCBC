import React from 'react';
import { parseTextWithMarkers } from './text-parsing';
import { FunctionalStatementLink } from '../components/reading/FunctionalStatementLink';
import { ObjectiveLink } from '../components/reading/ObjectiveLink';
import { CrossReferenceLink } from '../components/reading/CrossReferenceLink';
import { GlossaryTerm } from '../components/reading/GlossaryTerm';

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
    expect(crossRefs[0].props.displayText).toBe('Figure 4.1.6.10.-A');
  });

  it('formats internal figure references with BC figure numbering for shortNum format', () => {
    const input = '[REF:internal:nbc.divB.part4.sect1.subsect6.art10.figure2:shortNum]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.displayText).toBe('4.1.6.10.-B');
  });

  it('parses standard references into cross-reference links', () => {
    const input = 'See [REF:standard:csaa440S1] for details.';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.referenceId).toBe('standard:csaa440S1');
  });

  it('parses external references into cross-reference links', () => {
    const input = 'See [REF:external:csa101a440] for details.';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(1);
    expect(crossRefs[0].props.referenceId).toBe('external:csa101a440');
  });

  it('parses external references with explicit label text', () => {
    const input = 'concrete stated in [REF:external:csaa23.1:Section 9 of][REF:standard:csaa23.1]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);

    expect(crossRefs).toHaveLength(2);
    expect(crossRefs[0].props.referenceId).toBe('external:csaa23.1');
    expect(crossRefs[0].props.displayText).toBe('Section 9 of');
    expect(crossRefs[1].props.referenceId).toBe('standard:csaa23.1');
  });

  it('preserves trailing space in external-reference label text', () => {
    const input = '[REF:external:csaa23.1:Section 9 of ][REF:standard:csaa23.1]';
    const nodes = parseTextWithMarkers(input, [], true);
    const crossRefs = getElementsByType(nodes, CrossReferenceLink);
    const textNodes = nodes.filter((node): node is string => typeof node === 'string');

    expect(crossRefs).toHaveLength(2);
    expect(crossRefs[0].props.referenceId).toBe('external:csaa23.1');
    expect(crossRefs[0].props.displayText).toBe('Section 9 of');
    expect(textNodes.join('')).toContain(' ');
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
