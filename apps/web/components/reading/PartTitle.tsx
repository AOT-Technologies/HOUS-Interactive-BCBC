import React from 'react';
import './PartTitle.css';

interface PartTitleProps {
  title: string;
}

export const PartTitle: React.FC<PartTitleProps> = ({ title }) => {
  const normalizedTitle = title.trim();
  const displayTitle = /^part\s+/i.test(normalizedTitle)
    ? normalizedTitle
    : `Part ${normalizedTitle}`;

  return <h1 className="partTitle">{displayTitle}</h1>;
};
