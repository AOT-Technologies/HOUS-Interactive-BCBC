using System.Text.RegularExpressions;

namespace Interactive_BCBC_E2E;

/// <summary>
/// Contains all test selectors, locators, and constants used across test files.
/// </summary>
public static class TestSelectors
{
    // ===== Page Navigation and Structure =====
    public const string NavigationTreeTestId = "navigation-tree";
    public const string NavigationNodeIdPrefix = "[data-testid^='navigation-node-']";
    public const string NavigationNodeFallbackClass = ".nav-tree-item";
    public const string NavTreeSelector = "nav.nav-tree";
    public const string NavigationRoleSelector = "[role='navigation']";

    // ===== Sidebar =====
    public const string SidebarTestId = "sidebar";
    public const string SidebarToggleButtonTestId = "button-sidebar-toggle";
    public const string SidebarMobileOpenWrapperClass = ".ui-Sidebar--MobileWrapper.--open";
    public const string SidebarAsideSelector = "aside";
    public const string SidebarSearchInputClass = ".home-sidebar-search-input";
    public const string SidebarSearchInputPlaceholder = "Search table of contents";
    public const string SidebarSearchInputFallback = "input[class*='sidebar-search']";

    // ===== Headers and Headings =====
    public const string HeadingH1Selector = "h1";
    public const string HeaderH1Selector = "header h1";

    // ===== Search =====
    public const string MainSearchInputTestId = "hero-search-input";
    public const string MainSearchInputClass = ".ui-HeroSearch--Input";
    public const string MainSearchInputAttributeSelector = "input[data-testid='hero-search-input']";
    public const string SearchResultsPanelTestId = "search-results-panel";
    public const string SearchResultsCardClass = ".search-results-card";
    public const string ViewSectionButtonText = "View Section";
    public const string ReadingViewClass = ".reading-view";
    public const string SearchResultsFilterToggleTestId = "search-results-filter-toggle";
    public const string SearchResultsFiltersTestId = "search-results-filters";
    public const string SearchResultsPageSelectWrapClass = ".search-results-page__select-wrap";
    public const string ButtonPrimaryTestId = "button-primary";
    public const string ButtonSecondaryTestId = "button-secondary";
    public const string ClearFiltersButtonClass = ".search-results-page__clear-filters";
    public const string ApplyFiltersButtonText = "Apply Filters";

    // ===== Buttons - Header =====
    public const string HeaderSearchButtonTestId = "header-search-button";
    public const string SearchMainButtonTestId = "button-hero-search-button";
    public const string HeaderSearchInputTestId = "header-search-input";
    public const string HeaderSearchCancelButtonTestId = "button-header-search-cancel";
    
    // ===== Buttons - Glossary =====
    public const string GlossaryButtonTestId = "glossary-button";
    public const string GlossaryButtonSelector = "button:has-text('Glossary')";
    
    // ===== Buttons - Download =====
    public const string DownloadButtonTestId = "download-button";
    public const string DownloadButtonSelector = "button:has-text('Download')";

    // ===== Download Page =====
    public const string DownloadPageTestId = "download-page";
    public const string DownloadIconTestId = "icon-download";
    public const string DownloadRevisionCardClass = ".download-revision-card";
    public const string DownloadRevisionPdfButtonClass = ".download-page__button.download-page__button--small.download-page__button--revision-pdf";
    public const string RevisionsAndErrataHeadingText = "Revisions and Errata";
    public const int NewTabLoadTimeout = 15000;

    // ===== Header / Navigation =====
    public const string HeaderMobileNavButtonTestId = "button-header-mobile-nav-button";
    public const string GlossaryLinkTestId = "link-header-nav-item-glossary";
    public const string HtmlButtonSelector = "button";
    public const string HtmlSelectSelector = "select";
    public const string HtmlOptionSelector = "option";

    // ===== Glossary Sidebar =====
    public const string GlossarySidebarTitleId = "glossary-sidebar-title";
    public const string GlossarySidebarTitleSelector = "#glossary-sidebar-title";
    public const string GlossarySidebarLetterClass = ".glossary-sidebar__letter";
    public const string GlossarySidebarTermTitleClass = ".glossary-sidebar__term-title";
    public const string GlossarySidebarSearchInputClass = ".glossary-sidebar__search";
    public const string GlossarySidebarSearchSummaryClass = ".glossary-sidebar__search-summary";
    public const string GlossarySidebarTermClass = ".glossary-sidebar__term";
    public const string GlossarySidebarCloseIconClass = ".glossary-sidebar__close-icon";
    // end glossary selectors

    // ===== Links and Other Elements =====
    public const string SidebarSearchInputClass_Alt = "[class*='sidebar'], [id*='sidebar']";

    // ===== Content Panel / Reader View =====
    public const string ContentPanelTestId = "content-panel";
    public const string CrossReferenceLinkClass = ".cross-reference-link__text";

    // ===== Cross Reference Modal =====
    public const string CrossReferenceModalContentClass = ".cross-reference-modal__content";
    public const string CrossReferenceModalCloseButtonClass = ".cross-reference-modal__close-button";
    public const string CrossReferenceModalGoToButtonClass = ".cross-reference-modal__button--go-to-section";
    public const string CrossReferenceModalCloseSecondClass = ".cross-reference-modal__button--close";
    public const string SubsectionHeadingClass = ".subsectionHeading";
    public const string ModalHeadingSelectors = "h2, h3, h4, [class*='Heading']";
    public const int MaxArticleRetries = 5;

    // ===== Footer =====
    public const string FooterTestId = "footer";

    // ===== Quick Access =====
    public const string QuickAccessClass = ".homepage-quick-access";
    public const string QuickAccessListClass = ".quick-access-pins--list";

    // ===== Section Grid and Cards =====
    public const string SectionGridClass = ".partSectionsGrid";
    public const string SectionCardClass = "[class*='partSectionCard']";
    public const string SectionCardTitleClass = ".partSectionCardTitle";
    public const string SectionTitleClass = ".sectionTitle";

    // ===== Sidebar Navigation Links =====
    public const string SidebarNavLinkClass = ".nav-tree-link";
    public const string SidebarNavLinkActiveClass = ".nav-tree-link--active";
    public const string SidebarNavLinkSectionClass = ".nav-tree-link--section";
    public const string SidebarNavLinkSubsectionClass = ".nav-tree-link--subsection";
    public const string QuickAccessItemsSelector = "> li, > a, > button, > div[role='button']";

    // ===== Breadcrumbs =====
    public const string BreadcrumbsListClass = ".breadcrumbs-list";
    public const string BreadcrumbsHomeButtonRole = "button";
    public const string BreadcrumbsHomeButtonName = "Home";

    // ===== Search Terms for Testing =====
    public const string SidebarSearchTestTerm = "fire";
    public const string SidebarSearchNoResultsTerm = "zzzzzz_12345";

    // Generic text values used in tests
    public const string SearchResultsTitleText = "Search Results";
    public const string GlossaryAllLetterText = "All";
    public const string EnterKey = "Enter";
    public const string GlossaryUrlSegment = "/glossary";

    public const string NoResultsFoundMessage = "No results found";
    public const string PdfFileExtension = ".pdf";

    // ===== Regex Patterns for Accessibility Queries =====
    public static readonly Regex SearchButtonNameRegex = new Regex("^\\s*Search\\s*$", RegexOptions.IgnoreCase);
    public static readonly Regex GlossaryButtonNameRegex = new Regex("glossary", RegexOptions.IgnoreCase);
    public static readonly Regex DownloadButtonNameRegex = new Regex("download", RegexOptions.IgnoreCase);
    public static readonly Regex ReportBugNameRegex = new Regex("report\\s+a\\s+bug", RegexOptions.IgnoreCase);
    public static readonly Regex SectionNumberStripRegex = new Regex(@"^(?:Section\s+)?(?:\d+(?:\.\d+)*)\.?\s+(.+)$", RegexOptions.IgnoreCase);

    // ===== Timeouts and Delays (in milliseconds) =====
    public const int NodeExpandWaitTime = 500;
    public const int BugReportVisibilityTimeout = 2000;
    public const int TreeRebuildVisibilityTimeout = 10000;
    public const int TreeTraversalMaxDepth = 10;
    public const int SectionLoadWaitTime = 1000;
    public const int NavigationLoadWaitTime = 2000;
    public const int SidebarVisibilityTimeout = 5000;
    public const int ModalAnimationWaitTime = 500;
    public const int ModalHeadingVisibilityTimeout = 3000;
    public const int SearchResultsPanelVisibilityTimeout = 10000;
    public const int SearchResultsCardVisibilityTimeout = 10000;

}


