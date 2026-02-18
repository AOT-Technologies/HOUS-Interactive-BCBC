import React from 'react';
import './PartTitle.css';

interface PartTitleProps {
  title: string;
}

export const PartTitle: React.FC<PartTitleProps> = ({ title }) => {
  return <h1 className="partTitle">{title}</h1>;
};
