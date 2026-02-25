import React from 'react';
import { parseTextWithMarkers } from './text-parsing';
import { FunctionalStatementLink } from '../components/reading/FunctionalStatementLink';
import { ObjectiveLink } from '../components/reading/ObjectiveLink';
import { CrossReferenceLink } from '../components/reading/CrossReferenceLink';

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
});
