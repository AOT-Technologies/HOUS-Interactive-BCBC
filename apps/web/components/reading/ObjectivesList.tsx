/**
 * ObjectivesList - Renders a list of code objectives with sub-objectives
 * 
 * Displays objectives that appear in Division A, Part 2, Section 2.2.1.1
 * with proper formatting, key labels, and nested sub-objectives.
 * 
 * Handles both parsed format (subObjectives) and raw JSON format (sub_objectives)
 * since content chunks may use either depending on the generation pipeline.
 */

import React from 'react';
import type { SentenceObjective, SentenceSubObjective } from '@bc-building-code/bcbc-parser';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import type { ReferenceRenderContext } from '../../lib/cross-reference';
import './ObjectivesList.css';

/** Raw objective shape from JSON chunks (snake_case) */
interface RawObjective {
    id: string;
    key: string;
    title: string;
    definition: string;
    sub_objectives?: RawSubObjective[];
    subObjectives?: SentenceSubObjective[];
}

interface RawSubObjective {
    id: string;
    key: string;
    title: string;
    definition: string;
}

export interface ObjectivesListProps {
    objectives: (SentenceObjective | RawObjective)[];
    interactive?: boolean;
    renderContext?: ReferenceRenderContext;
}

function getSubObjectives(objective: SentenceObjective | RawObjective): SentenceSubObjective[] {
    // Handle both camelCase (parsed) and snake_case (raw JSON) formats
    if ('subObjectives' in objective && objective.subObjectives) {
        return objective.subObjectives;
    }
    if ('sub_objectives' in objective && objective.sub_objectives) {
        return objective.sub_objectives;
    }
    return [];
}

export const ObjectivesList: React.FC<ObjectivesListProps> = ({
    objectives,
    interactive = true,
    renderContext,
}) => {
    if (!objectives || objectives.length === 0) {
        return null;
    }

    return (
        <div className="objectivesList">
            <dl className="objectivesList__list">
                {objectives.map((objective) => {
                    const subObjectives = getSubObjectives(objective);
                    return (
                        <div key={objective.id} className="objectivesList__item" id={objective.id}>
                            <dt className="objectivesList__term">
                                <span className="objectivesList__key">{objective.key}</span>
                                <span className="objectivesList__title">{objective.title}</span>
                            </dt>
                            <dd className="objectivesList__definition">
                                {parseTextWithMarkers(objective.definition, [], interactive, [], [], renderContext)}
                            </dd>

                            {/* Render sub-objectives if present */}
                            {subObjectives.length > 0 && (
                                <dd className="objectivesList__subObjectives">
                                    <dl className="objectivesList__subList">
                                        {subObjectives.map((sub) => (
                                            <div key={sub.id} className="objectivesList__subItem" id={sub.id}>
                                                <dt className="objectivesList__subTerm">
                                                    <span className="objectivesList__key">{sub.key}</span>
                                                    <span className="objectivesList__title">{sub.title}</span>
                                                </dt>
                                                <dd className="objectivesList__subDefinition">
                                                    {parseTextWithMarkers(sub.definition, [], interactive, [], [], renderContext)}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                </dd>
                            )}
                        </div>
                    );
                })}
            </dl>
        </div>
    );
};
