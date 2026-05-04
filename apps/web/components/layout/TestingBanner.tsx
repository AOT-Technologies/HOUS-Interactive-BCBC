import './TestingBanner.css';

export default function TestingBanner() {
  return (
    <div className="TestingBanner" role="banner" aria-label="Site status">
      <p className="TestingBanner--text">
        <strong>In Testing</strong> — This site is under active development. Content and features may change.
      </p>
    </div>
  );
}
