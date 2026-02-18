/**
 * ErrorState Component
 * 
 * Displays user-friendly error messages with recovery options.
 * Used for content loading failures, 404 errors, and validation errors.
 */

'use client';

import React from 'react';
import './ErrorState.css';

interface ErrorStateProps {
  title: string;
  message: string;
  contentPath?: string;
  onRetry?: () => void;
  showRetry?: boolean;
  showHomepageLink?: boolean;
  suggestions?: string[];
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  contentPath,
  onRetry,
  showRetry = true,
  showHomepageLink = true,
  suggestions = [],
}) => {
  return (
    <div className="error-state" role="alert" aria-live="assertive">
      <div className="error-state__content">
        <h2 className="error-state__title">{title}</h2>
        
        <p className="error-state__message">{message}</p>
        
        {contentPath && (
          <p className="error-state__path">
            <strong>Content path:</strong> {contentPath}
          </p>
        )}
        
        {suggestions.length > 0 && (
          <div className="error-state__suggestions">
            <p className="error-state__suggestions-title">Suggestions:</p>
            <ul className="error-state__suggestions-list">
              {suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="error-state__actions">
          {showRetry && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="error-state__button error-state__button--primary"
              aria-label="Try loading content again"
            >
              Try Again
            </button>
          )}
          
          {showHomepageLink && (
            <a
              href="/"
              className="error-state__link"
              aria-label="Return to homepage"
            >
              Return to Homepage
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
