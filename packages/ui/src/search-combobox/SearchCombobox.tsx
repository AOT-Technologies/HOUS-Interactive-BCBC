"use client";
import { useRef } from "react";
import {
  ComboBox,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
  type ComboBoxProps as ReactAriaComboBoxProps,
  type Key,
} from "react-aria-components";
import {
  TESTID_SEARCH_COMBOBOX,
  TESTID_SEARCH_COMBOBOX_INPUT,
  TESTID_SEARCH_COMBOBOX_DROPDOWN,
  TESTID_SEARCH_COMBOBOX_OPTION,
  TESTID_SEARCH_COMBOBOX_LOADING,
  TESTID_SEARCH_COMBOBOX_EMPTY,
} from "@repo/constants/src/testids";
import Icon from "../icon/Icon";
import "./SearchCombobox.css";

export type SearchComboboxSize = "small" | "medium" | "large" | "xlarge";

export interface SearchComboboxProps {
  /** Current search query */
  query: string;
  /** Callback when query changes */
  onQueryChange: (query: string) => void;
  /** Callback when search is submitted (Enter key or button click) */
  onSubmit: () => void;
  /** Array of search suggestions */
  suggestions: string[];
  /** Callback when a suggestion is selected */
  onSelectSuggestion: (suggestion: string) => void;
  /** Whether suggestions are loading */
  isLoading?: boolean;
  /** Placeholder text for input */
  placeholder?: string;
  /** Size variant */
  size?: SearchComboboxSize;
  /** Whether to show search icon */
  showIcon?: boolean;
  /** Additional class name for container */
  className?: string;
  /** Additional class name for input */
  inputClassName?: string;
  /** Additional class name for dropdown */
  dropdownClassName?: string;
  /** ARIA label for the search input */
  ariaLabel?: string;
}

/**
 * SearchCombobox - Base search input component with autocomplete
 * 
 * Provides a reusable search input with autocomplete dropdown.
 * Uses React Aria Combobox for accessibility.
 * 
 * @example
 * ```tsx
 * <SearchCombobox
 *   query={query}
 *   onQueryChange={setQuery}
 *   onSubmit={handleSearch}
 *   suggestions={suggestions}
 *   onSelectSuggestion={handleSelect}
 *   size="medium"
 *   placeholder="Search..."
 * />
 * ```
 */
export default function SearchCombobox({
  query,
  onQueryChange,
  onSubmit,
  suggestions,
  onSelectSuggestion,
  isLoading = false,
  placeholder = "Search...",
  size = "medium",
  showIcon = true,
  className = "",
  inputClassName = "",
  dropdownClassName = "",
  ariaLabel = "Search",
}: SearchComboboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelectionChange = (key: Key | null) => {
    if (key) {
      onSelectSuggestion(key.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.defaultPrevented) {
      e.preventDefault();
      onSubmit();
    }
  };

  const hasSuggestions = suggestions.length > 0;
  const showDropdown = hasSuggestions || isLoading;

  return (
    <div
      className={`ui-SearchCombobox --${size} ${className}`}
      data-testid={TESTID_SEARCH_COMBOBOX}
    >
      <ComboBox
        inputValue={query}
        onInputChange={onQueryChange}
        onSelectionChange={handleSelectionChange}
        aria-label={ariaLabel}
        menuTrigger="focus"
      >
        <div className="ui-SearchCombobox--InputWrapper">
          {showIcon && (
            <Icon
              type="search"
              className="ui-SearchCombobox--Icon"
              aria-hidden="true"
            />
          )}
          <Input
            ref={inputRef}
            className={`ui-SearchCombobox--Input ${inputClassName}`}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            data-testid={TESTID_SEARCH_COMBOBOX_INPUT}
          />
        </div>

        {showDropdown && (
          <Popover className={`ui-SearchCombobox--Popover ${dropdownClassName}`}>
            <ListBox
              className="ui-SearchCombobox--Dropdown"
              data-testid={TESTID_SEARCH_COMBOBOX_DROPDOWN}
            >
              {isLoading ? (
                <ListBoxItem
                  key="loading"
                  className="ui-SearchCombobox--LoadingItem"
                  data-testid={TESTID_SEARCH_COMBOBOX_LOADING}
                  textValue="Loading..."
                >
                  <span className="ui-SearchCombobox--LoadingText">
                    Loading suggestions...
                  </span>
                </ListBoxItem>
              ) : hasSuggestions ? (
                suggestions.map((suggestion) => (
                  <ListBoxItem
                    key={suggestion}
                    className="ui-SearchCombobox--Option"
                    data-testid={TESTID_SEARCH_COMBOBOX_OPTION}
                    textValue={suggestion}
                  >
                    {suggestion}
                  </ListBoxItem>
                ))
              ) : (
                <ListBoxItem
                  key="empty"
                  className="ui-SearchCombobox--EmptyItem"
                  data-testid={TESTID_SEARCH_COMBOBOX_EMPTY}
                  textValue="No suggestions"
                >
                  <span className="ui-SearchCombobox--EmptyText">
                    No suggestions found
                  </span>
                </ListBoxItem>
              )}
            </ListBox>
          </Popover>
        )}
      </ComboBox>
    </div>
  );
}
