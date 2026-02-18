import React from 'react';
import { parseTextWithMarkers } from './text-parsing';
import { FunctionalStatementLink } from '../components/reading/FunctionalStatementLink';
import { ObjectiveLink } from '../components/reading/ObjectiveLink';

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
});
