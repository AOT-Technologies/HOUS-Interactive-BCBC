"use client";
import { useState, useEffect, useRef } from "react";
import { useSearch, type UseSearchOptions } from "@repo/data/src/hooks/useSearch";
import {
  TESTID_HEADER_SEARCH,
  TESTID_HEADER_SEARCH_BUTTON,
  TESTID_HEADER_SEARCH_INPUT,
  TESTID_HEADER_SEARCH_CANCEL,
} from "@repo/constants/src/testids";
import Button from "../button/Button";
import Icon from "../icon/Icon";
import SearchCombobox from "../search-combobox/SearchCombobox";
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

/**
 * HeaderSearch - Compact, toggleable search for header
 * 
 * Manages both closed (icon button) and open (input with autocomplete) states.
 * 
 * Features:
 * - Toggle open/close with search icon button
 * - Autocomplete suggestions
 * - Cancel button to clear and close
 * - Keyboard navigation (Enter, Escape)
 * - Auto-focus input when opened
 * 
 * @example
 * ```tsx
 * <HeaderSearch
 *   onSearch={(query) => router.push(`/search?q=${query}`)}
 *   getSuggestions={(query) => searchIndex.suggest(query)}
 *   placeholder="Search building code..."
 * />
 * ```
 */
export default function HeaderSearch({
  onSearch,
  getSuggestions,
  placeholder = "Search...",
  defaultOpen = false,
  className = "",
}: HeaderSearchProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use shared search hook
  const search = useSearch({
    onSearch: (query) => {
      onSearch(query);
      // Keep search open after submit so user can see what they searched
    },
    getSuggestions,
  });

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const input = containerRef.current?.querySelector("input");
        input?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, search]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleCancel = () => {
    search.handleClear();
    setIsOpen(false);
  };

  // Closed state: Icon button only
  if (!isOpen) {
    return (
      <div
        className={`ui-HeaderSearch --closed ${className}`}
        data-testid={TESTID_HEADER_SEARCH}
      >
        <Button
          variant="tertiary"
          isIconButton
          onPress={handleOpen}
          aria-label="Open search"
          data-testid={TESTID_HEADER_SEARCH_BUTTON}
        >
          <Icon type="search" />
        </Button>
      </div>
    );
  }

  // Open state: Search input with cancel button
  return (
    <div
      ref={containerRef}
      className={`ui-HeaderSearch --open ${className}`}
      data-testid={TESTID_HEADER_SEARCH}
    >
      <SearchCombobox
        query={search.query}
        onQueryChange={search.setQuery}
        onSubmit={search.handleSubmit}
        suggestions={search.suggestions}
        onSelectSuggestion={search.handleSelectSuggestion}
        isLoading={search.isLoading}
        placeholder={placeholder}
        size="medium"
        showIcon={true}
        ariaLabel="Search building code"
        inputClassName="ui-HeaderSearch--Input"
        data-testid={TESTID_HEADER_SEARCH_INPUT}
      />
      <Button
        variant="tertiary"
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
