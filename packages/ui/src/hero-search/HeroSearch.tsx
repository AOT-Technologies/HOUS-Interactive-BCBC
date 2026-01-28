"use client";
import { useSearch } from "@repo/data/src/hooks/useSearch";
import {
  TESTID_HERO_SEARCH,
  TESTID_HERO_SEARCH_INPUT,
  TESTID_HERO_SEARCH_BUTTON,
} from "@repo/constants/src/testids";
import Button from "../button/Button";
import SearchCombobox from "../search-combobox/SearchCombobox";
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

/**
 * HeroSearch - Large, prominent search for homepage hero section
 * 
 * Features:
 * - Always visible (no toggle)
 * - Large size (~540px input)
 * - Optional title and subtitle
 * - Dark blue hero section background
 * - "Search" button with text
 * - Centered layout
 * - Autocomplete suggestions
 * 
 * @example
 * ```tsx
 * <HeroSearch
 *   title="BC Building Code"
 *   subtitle="Search and navigate the official 2024 British Columbia Building Code..."
 *   placeholder='Search for keywords (e.g. "Egress", "Radon") or Section...'
 *   onSearch={(query) => router.push(`/search?q=${query}`)}
 *   getSuggestions={(query) => searchIndex.suggest(query)}
 * />
 * ```
 */
export default function HeroSearch({
  onSearch,
  getSuggestions,
  placeholder = "Search...",
  title,
  subtitle,
  className = "",
}: HeroSearchProps) {
  // Use shared search hook
  const search = useSearch({
    onSearch,
    getSuggestions,
  });

  return (
    <section
      className={`ui-HeroSearch ${className}`}
      data-testid={TESTID_HERO_SEARCH}
    >
      <div className="ui-HeroSearch--Content">
        {title && <h1 className="ui-HeroSearch--Title">{title}</h1>}
        
        {subtitle && <p className="ui-HeroSearch--Subtitle">{subtitle}</p>}

        <div className="ui-HeroSearch--SearchWrapper">
          <SearchCombobox
            query={search.query}
            onQueryChange={search.setQuery}
            onSubmit={search.handleSubmit}
            suggestions={search.suggestions}
            onSelectSuggestion={search.handleSelectSuggestion}
            isLoading={search.isLoading}
            placeholder={placeholder}
            size="xlarge"
            showIcon={true}
            ariaLabel="Search building code"
            className="ui-HeroSearch--SearchCombobox"
            data-testid={TESTID_HERO_SEARCH_INPUT}
          />
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
