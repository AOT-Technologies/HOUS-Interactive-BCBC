import React from 'react';
import './SectionTitle.css';

interface SectionTitleProps {
  number: string;
  title: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ number, title }) => {
  return (
    <h2 className="sectionTitle">
      <span className="sectionNumber">{number}</span> {title}
    </h2>
  );
};
