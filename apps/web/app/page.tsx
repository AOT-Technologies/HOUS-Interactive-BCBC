import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BC Building Code Interactive',
  description:
    'Interactive web application for the British Columbia Building Code - search, navigate, and understand the building code.',
};

export default function Home() {
  return (
    <div className="u-container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <h2>Welcome to the BC Building Code Interactive Application</h2>
      <p>
        This application provides an intuitive, searchable interface for the
        2024 British Columbia Building Code.
      </p>

      <section style={{ marginTop: '2rem' }}>
        <h3>Key Features</h3>
        <ul>
          <li>Full-text search with instant results</li>
          <li>Hierarchical navigation through code sections</li>
          <li>Inline glossary definitions</li>
          <li>Effective date filtering for amendments</li>
          <li>Responsive design for all devices</li>
          <li>WCAG AAA accessible</li>
        </ul>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h3>Getting Started</h3>
        <p>
          Use the navigation menu above to explore the building code, or use
          the search feature to find specific requirements.
        </p>
      </section>
    </div>
  );
}
