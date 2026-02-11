import React from 'react';
import './SectionTitle.css';

interface SectionTitleProps {
  title: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ title }) => {
  return <h2 className="sectionTitle">{title}</h2>;
};
