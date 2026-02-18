'use client';

import React from 'react';
import Button from '@repo/ui/button';
import Icon from '@repo/ui/icon';
import './PdfDownloadButton.css';

interface PdfDownloadButtonProps {
  label: string;
}

export const PdfDownloadButton: React.FC<PdfDownloadButtonProps> = ({ label }) => {
  const handleDownload = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <Button
      variant="secondary"
      onPress={handleDownload}
      className="pdf-download-button"
      aria-label={`Download ${label}`}
    >
      <span className="pdf-download-button__icon" aria-hidden="true">
        <Icon type="download" />
      </span>
      <span className="pdf-download-button__label">{label}</span>
    </Button>
  );
};
