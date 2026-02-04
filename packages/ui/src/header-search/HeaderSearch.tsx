"use client";
import { useState, useEffect, useRef } from "react";
import { useSearch } from "@repo/data";
import {
  TESTID_HEADER_SEARCH,
  TESTID_HEADER_SEARCH_BUTTON,
  TESTID_HEADER_SEARCH_INPUT,
  TESTID_HEADER_SEARCH_CANCEL,
} from "@repo/constants/src/testids";
import Button from "../button/Button";
import Icon from "../icon/Icon";
import "./HeaderSearch.css";

export interface HeaderSearchProps {
  /** Callback when search is submitted */
  onSearch: (query: string) => void;
  /** Function to fetch search suggestions */
  getSuggestions?: (query: string) => Promise<string[]> | string[];
  /** Placeholder text for input */
  placeholder?: string;
  /** Whether search starts in open state (for testing) */
  defaultOpen?: boolean;
  /** Additional class name */
  className?: string;
}

export default function HeaderSearch({
  onSearch,
  getSuggestions,
  placeholder = "Search...",
  defaultOpen = false,
  className = "",
}: HeaderSearchProps) {
  // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMounted, setIsMounted] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use shared search hook
  const search = useSearch({
    onSearch: (query: string) => {
      onSearch(query);
    },
    getSuggestions,
  });

  // Ensure component only renders interactive elements after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const input = containerRef.current?.querySelector("input");
      input?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        search.handleClear();
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, search]);

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

  const handleOpen = () => setIsOpen(true);

  const handleCancel = () => {
    search.handleClear();
    setIsOpen(false);
  };

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

  // Prevent hydration mismatch by not rendering interactive elements until mounted
  if (!isMounted) {
    return (
      <div className={`ui-HeaderSearch --closed ${className}`} data-testid={TESTID_HEADER_SEARCH}>
        <button className="ui-HeaderSearch--SearchButton" aria-label="Search">
          <Icon type="search" />
          <span>Search</span>
        </button>
      </div>
    );
  }

  // Closed state: Search button with icon and text
  if (!isOpen) {
    return (
      <div className={`ui-HeaderSearch --closed ${className}`} data-testid={TESTID_HEADER_SEARCH}>
        <button
          className="ui-HeaderSearch--SearchButton"
          onClick={handleOpen}
          aria-label="Open search"
          data-testid={TESTID_HEADER_SEARCH_BUTTON}
        >
          <Icon type="search" />
          <span>Search</span>
        </button>
      </div>
    );
  }

  // Open state: Search input with cancel button
  return (
    <div ref={containerRef} className={`ui-HeaderSearch --open ${className}`} data-testid={TESTID_HEADER_SEARCH}>
      <div className="ui-HeaderSearch--SearchWrapper">
        <Icon type="search" className="ui-HeaderSearch--SearchIcon" aria-hidden="true" />
        <input
          type="text"
          value={search.query}
          onChange={(e) => search.setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => search.query.length >= 2 && search.suggestions.length > 0 && setShowSuggestions(true)}
          className="ui-HeaderSearch--Input"
          placeholder={placeholder}
          aria-label="Search building code"
          aria-expanded={shouldShowDropdown}
          aria-haspopup="listbox"
          autoComplete="off"
          data-testid={TESTID_HEADER_SEARCH_INPUT}
        />
        {search.query && (
          <button
            type="button"
            onClick={search.handleClear}
            className="ui-HeaderSearch--ClearButton"
            aria-label="Clear search"
          >
            <Icon type="close" />
          </button>
        )}
        {shouldShowDropdown && (
          <ul role="listbox" className="ui-HeaderSearch--Dropdown">
            {search.isLoading ? (
              <li className="ui-HeaderSearch--LoadingItem">Loading...</li>
            ) : (
              search.suggestions.map((suggestion: string, index: number) => (
                <li
                  key={suggestion}
                  role="option"
                  aria-selected={highlightedIndex === index}
                  className={`ui-HeaderSearch--Option ${highlightedIndex === index ? "--highlighted" : ""}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {suggestion}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      <Button
        variant="secondary"
        onPress={handleCancel}
        aria-label="Cancel search"
        data-testid={TESTID_HEADER_SEARCH_CANCEL}
        className="ui-HeaderSearch--CancelButton"
      >
        Cancel
      </Button>
    </div>
  );
}
