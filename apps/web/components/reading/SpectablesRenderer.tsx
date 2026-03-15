import React from 'react';
import { parseTextWithMarkers } from '../../lib/text-parsing';
import type { Spectables } from '../../lib/stores/spectables-store';
import { TableBlock } from './TableBlock';

interface SpectablesRendererProps {
  spectables: Spectables;
  interactive?: boolean;
  effectiveDate?: string;
}

export const SpectablesRenderer: React.FC<SpectablesRendererProps> = ({
  spectables,
  interactive = true,
  effectiveDate,
}) => (
  <div className="reading-view__appendix">
    <h2 className="reading-view__appendix-heading">
      {parseTextWithMarkers(spectables.title || 'Span Tables', [], interactive)}
    </h2>
    <div className="reading-view__appendix-notes">
      {(spectables.tables || []).map((table) => (
        <TableBlock
          key={table.id}
          table={table}
          interactive={interactive}
          effectiveDate={effectiveDate}
        />
      ))}
    </div>
  </div>
);

