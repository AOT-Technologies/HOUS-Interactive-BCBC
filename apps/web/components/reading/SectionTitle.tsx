import React from 'react';
import { formatNumberedTitle } from '../../lib/title-formatting';
import './SectionTitle.css';

interface SectionTitleProps {
  number: string;
  title: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ number, title }) => {
  return (
    <h2 className="sectionTitle">
      Section <span className="sectionNumber">{formatNumberedTitle(number, title)}</span>
    </h2>
  );
};
