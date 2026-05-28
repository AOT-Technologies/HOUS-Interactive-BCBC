import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FigureBlock } from './FigureBlock';
import type { Figure } from '@bc-building-code/bcbc-parser';

const baseFigure: Figure = {
  id: 'nbc.divC.part2.sect3.subsect1.art2.figure1',
  type: 'figure',
  number: '2.3.1.2.-A',
  title: '',
  imageUrl: '',
  altText: 'A test figure',
};

describe('FigureBlock', () => {
  describe('figure label', () => {
    it('renders figure number label by default', () => {
      const { container } = render(<FigureBlock figure={baseFigure} />);
      const label = container.querySelector('.figure-block__number');
      expect(label).not.toBeNull();
      expect(label?.textContent).toContain('Figure');
    });

    it('suppresses the label when hide_label is true', () => {
      const figure = { ...baseFigure, hide_label: true } as any;
      const { container } = render(<FigureBlock figure={figure} />);
      expect(container.querySelector('.figure-block__number')).toBeNull();
    });

    it('shows the label when hide_label is false', () => {
      const figure = { ...baseFigure, hide_label: false } as any;
      const { container } = render(<FigureBlock figure={figure} />);
      expect(container.querySelector('.figure-block__number')).not.toBeNull();
    });

    it('derives the label from the figure id', () => {
      const { container } = render(<FigureBlock figure={baseFigure} />);
      // nbc.divC.part2.sect3.subsect1.art2.figure1 → "Figure 2.3.1.2.-A"
      expect(container.querySelector('.figure-block__number')?.textContent).toBe('Figure 2.3.1.2.-A');
    });
  });

  describe('image rendering', () => {
    it('renders an img element when imageUrl is provided', () => {
      const figure = { ...baseFigure, imageUrl: '/bc-graphics/test.jpg' };
      const { container } = render(<FigureBlock figure={figure} />);
      const img = container.querySelector('img');
      expect(img).not.toBeNull();
      expect(img?.getAttribute('src')).toBe('/bc-graphics/test.jpg');
    });

    it('renders an img from graphic.src when imageUrl is absent', () => {
      const figure = {
        ...baseFigure,
        imageUrl: undefined,
        graphic: { src: 'bc-graphics/figure-c-2-3-1-2-1', alt_text: 'Schedule A form' },
      } as any;
      const { container } = render(<FigureBlock figure={figure} />);
      const img = container.querySelector('img');
      expect(img).not.toBeNull();
      // resolveImagePath adds leading slash and .jpg extension
      expect(img?.getAttribute('src')).toBe('/bc-graphics/figure-c-2-3-1-2-1.jpg');
    });

    it('does not render an img element when no image source is provided', () => {
      const figure = { ...baseFigure, imageUrl: undefined } as any;
      const { container } = render(<FigureBlock figure={figure} />);
      expect(container.querySelector('img')).toBeNull();
    });

    it('uses alt text from altText field', () => {
      const figure = { ...baseFigure, imageUrl: '/test.jpg', altText: 'Custom alt' };
      const { container } = render(<FigureBlock figure={figure} />);
      expect(container.querySelector('img')?.getAttribute('alt')).toBe('Custom alt');
    });

    it('falls back to graphic.alt_text for alt text', () => {
      const figure = {
        ...baseFigure,
        altText: undefined,
        imageUrl: undefined,
        graphic: { src: 'bc-graphics/figure-c-2-3-1-2-1', alt_text: 'Schedule A alt' },
      } as any;
      const { container } = render(<FigureBlock figure={figure} />);
      expect(container.querySelector('img')?.getAttribute('alt')).toBe('Schedule A alt');
    });
  });

  describe('title and caption', () => {
    it('renders title when provided', () => {
      const figure = { ...baseFigure, title: 'Schedule A', imageUrl: '/test.jpg' };
      render(<FigureBlock figure={figure} />);
      expect(screen.getByText('Schedule A')).toBeInTheDocument();
    });

    it('does not render title element when title is empty string', () => {
      const { container } = render(<FigureBlock figure={{ ...baseFigure, imageUrl: '/test.jpg' }} />);
      expect(container.querySelector('.figure-block__title')).toBeNull();
    });

    it('renders caption when provided', () => {
      const figure = { ...baseFigure, caption: 'Figure caption text', imageUrl: '/test.jpg' };
      render(<FigureBlock figure={figure} />);
      expect(screen.getByText('Figure caption text')).toBeInTheDocument();
    });
  });

  describe('figure notes', () => {
    it('renders notes when provided', () => {
      const figure = {
        ...baseFigure,
        imageUrl: '/test.jpg',
        notes: [
          { id: 'nbc.divC.part2.sect3.subsect1.art2.figure1.note1', content: 'This is note one.' },
        ],
      };
      render(<FigureBlock figure={figure} />);
      expect(screen.getByText(/This is note one\./)).toBeInTheDocument();
    });

    it('does not render notes section when notes array is empty', () => {
      const figure = { ...baseFigure, imageUrl: '/test.jpg', notes: [] };
      const { container } = render(<FigureBlock figure={figure} />);
      expect(container.querySelector('.figure-block__notes')).toBeNull();
    });
  });

  describe('accessibility and structure', () => {
    it('sets the figure id on the root element', () => {
      const { container } = render(<FigureBlock figure={baseFigure} />);
      const figureEl = container.querySelector('figure');
      expect(figureEl?.getAttribute('id')).toBe(baseFigure.id);
    });

    it('renders a <figure> element as root', () => {
      const { container } = render(<FigureBlock figure={baseFigure} />);
      expect(container.querySelector('figure')).not.toBeNull();
    });

    it('hides label and renders full-width image for form pages (hide_label pattern)', () => {
      // Mirrors the Letters of Assurance figures in Division C, Part 2, Section 3
      const formFigure = {
        id: 'nbc.divC.part2.sect3.subsect1.art2.figure1',
        type: 'figure' as const,
        number: '',
        title: '',
        imageUrl: undefined,
        altText: undefined,
        hide_label: true,
        graphic: {
          src: 'bc-graphics/figure-c-2-3-1-2-1',
          alt_text: 'Schedule A form',
        },
      } as any;

      const { container } = render(<FigureBlock figure={formFigure} />);

      expect(container.querySelector('.figure-block__number')).toBeNull();
      const img = container.querySelector('img');
      expect(img).not.toBeNull();
      expect(img?.getAttribute('src')).toBe('/bc-graphics/figure-c-2-3-1-2-1.jpg');
      expect(img?.getAttribute('alt')).toBe('Schedule A form');
    });
  });
});
