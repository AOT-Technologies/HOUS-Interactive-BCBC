"use client";
import { useState, useEffect, useRef } from "react";
import { useSearch } from "@repo/data";
import {
  TESTID_HERO_SEARCH,
  TESTID_HERO_SEARCH_INPUT,
  TESTID_HERO_SEARCH_BUTTON,
} from "@repo/constants/src/testids";
import Button from "../button/Button";
import Icon from "../icon/Icon";
import "./HeroSearch.css";

export interface HeroSearchProps {
  /** Callback when search is submitted */
  onSearch: (query: string) => void;
  /** Function to fetch search suggestions */
  getSuggestions?: (query: string) => Promise<string[]> | string[];
  /** Placeholder text for input */
  placeholder?: string;
  /** Hero section title (H1) */
  title?: string;
  /** Hero section subtitle/description */
  subtitle?: string;
  /** Additional class name */
  className?: string;
}

export default function HeroSearch({
  onSearch,
  getSuggestions,
  placeholder = "Search...",
  title,
  subtitle,
  className = "",
}: HeroSearchProps) {
  // ALL HOOKS AT THE TOP
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use shared search hook
  const search = useSearch({
    onSearch,
    getSuggestions,
  });

  // Show suggestions when we have them
  useEffect(() => {
    if (search.query.length >= 2 && (search.suggestions.length > 0 || search.isLoading)) {
      setShowSuggestions(true);
    } else if (search.query.length < 2) {
      setShowSuggestions(false);
    }
  }, [search.query, search.suggestions.length, search.isLoading]);

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [search.suggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < search.suggestions.length) {
        search.handleSelectSuggestion(search.suggestions[highlightedIndex]);
        setShowSuggestions(false);
      } else {
        search.handleSubmit();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => prev < search.suggestions.length - 1 ? prev + 1 : prev);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    search.handleSelectSuggestion(suggestion);
    setShowSuggestions(false);
  };

  const shouldShowDropdown = showSuggestions && (search.suggestions.length > 0 || search.isLoading);

  return (
    <section className={`ui-HeroSearch ${className}`} data-testid={TESTID_HERO_SEARCH}>
      <div className="ui-HeroSearch--Content">
        {title && <h1 className="ui-HeroSearch--Title">{title}</h1>}
        
        {subtitle && <p className="ui-HeroSearch--Subtitle">{subtitle}</p>}

        <div className="ui-HeroSearch--SearchWrapper">
          <div ref={containerRef} className="ui-HeroSearch--InputWrapper">
            <input
              type="text"
              value={search.query}
              onChange={(e) => search.setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => search.query.length >= 2 && search.suggestions.length > 0 && setShowSuggestions(true)}
              className="ui-HeroSearch--Input"
              placeholder={placeholder}
              aria-label="Search building code"
              aria-expanded={shouldShowDropdown}
              aria-haspopup="listbox"
              autoComplete="off"
              data-testid={TESTID_HERO_SEARCH_INPUT}
            />
            {search.query && (
              <button
                type="button"
                onClick={search.handleClear}
                className="ui-HeroSearch--ClearButton"
                aria-label="Clear search"
              >
                <Icon type="close" />
              </button>
            )}
            {shouldShowDropdown && (
              <div className="ui-HeroSearch--Dropdown">
                <div className="ui-HeroSearch--SuggestionsHeader">Search Suggestions</div>
                <ul role="listbox" className="ui-HeroSearch--SuggestionsList">
                  {search.isLoading ? (
                    <li className="ui-HeroSearch--LoadingItem">Loading...</li>
                  ) : (
                    search.suggestions.map((suggestion: string, index: number) => (
                      <li
                        key={suggestion}
                        role="option"
                        aria-selected={highlightedIndex === index}
                        className={`ui-HeroSearch--Option ${highlightedIndex === index ? "--highlighted" : ""}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        {suggestion}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
          <Button
            variant="primary"
            onPress={search.handleSubmit}
            isLargeButton
            aria-label="Submit search"
            data-testid={TESTID_HERO_SEARCH_BUTTON}
            className="ui-HeroSearch--Button"
          >
            Search
          </Button>
        </div>
      </div>
    </section>
  );
}
