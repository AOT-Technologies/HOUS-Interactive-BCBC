import React from 'react';
import './SectionTitle.css';

interface SectionTitleProps {
  number: string;
  title: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ number, title }) => {
  const normalizedTitle = title.trim();

  return (
    <h2 className="sectionTitle">
      Section <span className="sectionNumber">{number}</span>. {normalizedTitle}
    </h2>
  );
};
