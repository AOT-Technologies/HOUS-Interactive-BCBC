using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Playwright;
using NUnit.Framework;
using static Microsoft.Playwright.Assertions;

namespace Interactive_BCBC_E2E;

public class InteractiveBCBCTestBase : TestBase
{
    private const string TestDataFileName = "test-data.json";
    private static readonly Lazy<TestData> TestDataLoader = new(LoadTestData);

    protected static string[] SearchTerms => TestDataLoader.Value.SearchTerms;

    protected static string[] GlossarySearchTerms => TestDataLoader.Value.GlossarySearchTerms;

    public InteractiveBCBCTestBase(Profile profile) : base(profile)
    {
    }

    /// <summary>
    /// Clicks a tree node and verifies it expands to show child nodes.
    /// </summary>
    protected async Task VerifyNodeExpandsWithChildrenAsync(ILocator node)
    {
        // Prefer clicking an explicit expand toggle inside the node (if present)
        var toggle = node.GetByRole(AriaRole.Button);
        if (await toggle.CountAsync() > 0)
        {
            await toggle.First.ClickAsync();
        }
        else
        {
            await node.ClickAsync();
        }

        await Page.WaitForTimeoutAsync(TestSelectors.NodeExpandWaitTime);

        // Verify that child nodes are now visible (node is expanded)
        var childNodes = node.Locator(TestSelectors.NavigationNodeIdPrefix);
        if (await childNodes.CountAsync() == 0)
        {
            childNodes = node.Locator(TestSelectors.NavigationNodeFallbackClass);
        }

        // Only assert if child nodes exist
        if (await childNodes.CountAsync() > 0)
        {
            await Expect(childNodes.First).ToBeVisibleAsync();
        }
    }

    /// <summary>
    /// Opens the sidebar on mobile devices by clicking the toggle button.
    /// On desktop, sidebar is always visible so no action is needed.
    /// </summary>
    protected async Task OpenSidebarIfNeededAsync()
    {
        if (profile.DeviceName is not null)
        {
            var toggleButton = Page.GetByTestId(TestSelectors.SidebarToggleButtonTestId);
            await toggleButton.ClickAsync();
            await Page.WaitForTimeoutAsync(TestSelectors.NodeExpandWaitTime);
        }
    }

    /// <summary>
    /// Selects and clicks a random quick access item from the quick access list.
    /// Returns true if successful, false if no quick access items found.
    /// </summary>
    protected async Task<bool> SelectAndClickRandomQuickAccessItemAsync()
    {
        // On mobile, close the sidebar if it's open to prevent pointer interception
        if (profile.DeviceName is not null)
        {
            // Check if mobile sidebar is open by looking for the combined selector
            var openSidebar = Page.Locator(TestSelectors.SidebarMobileOpenWrapperClass);
            if (await openSidebar.CountAsync() > 0)
            {
                // Click the sidebar toggle to close it
                var toggleButton = Page.GetByTestId(TestSelectors.SidebarToggleButtonTestId);
                await toggleButton.ClickAsync();
                await Page.WaitForTimeoutAsync(TestSelectors.NodeExpandWaitTime);
            }
        }

        var quickAccessList = Page.Locator(TestSelectors.QuickAccessListClass);
        if (await quickAccessList.CountAsync() == 0)
            return false;

        var quickAccessItems = quickAccessList.Locator(TestSelectors.QuickAccessItemsSelector);
        var itemCount = await quickAccessItems.CountAsync();
        if (itemCount == 0)
            return false;

        var random = new Random();
        var randomIndex = random.Next(0, itemCount);
        var randomQuickAccessItem = quickAccessItems.Nth(randomIndex);
        await randomQuickAccessItem.ClickAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.SectionLoadWaitTime);
        return true;
    }

    /// <summary>
    /// Selects and clicks the first visible section card from the section grid.
    /// Returns a tuple of (card, title) if successful, or (null, null) otherwise.
    /// </summary>
    protected async Task<(ILocator?, string?)> SelectAndClickFirstSectionWithTitleAsync()
    {
        var sectionGrid = Page.Locator(TestSelectors.SectionGridClass);
        if (await sectionGrid.CountAsync() == 0)
            return (null, null);

        var firstVisibleCard = sectionGrid.Locator(TestSelectors.SectionCardClass).First;
        if (await firstVisibleCard.CountAsync() == 0)
            return (null, null);

        var cardVisible = await firstVisibleCard.IsVisibleAsync().ConfigureAwait(false);
        if (!cardVisible)
            return (null, null);

        // Extract title before clicking (in case it scrolls out of view)
        var sectionTitleElement = firstVisibleCard.Locator(TestSelectors.SectionCardTitleClass);
        var titleVisible = await sectionTitleElement.IsVisibleAsync().ConfigureAwait(false);
        if (!titleVisible)
            return (firstVisibleCard, null);

        var title = await sectionTitleElement.TextContentAsync().ConfigureAwait(false);

        await firstVisibleCard.ClickAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.SectionLoadWaitTime);
        return (firstVisibleCard, title);
    }

    /// <summary>
    /// Selects and clicks the first visible section card from the section grid.
    /// Returns the section card locator if successful, null otherwise.
    /// </summary>
    protected async Task<ILocator?> SelectAndClickFirstSectionAsync()
    {
        var sectionGrid = Page.Locator(TestSelectors.SectionGridClass);
        if (await sectionGrid.CountAsync() == 0)
            return null;

        var firstVisibleCard = sectionGrid.Locator(TestSelectors.SectionCardClass).First;
        if (await firstVisibleCard.CountAsync() == 0)
            return null;

        var cardVisible = await firstVisibleCard.IsVisibleAsync().ConfigureAwait(false);
        if (!cardVisible)
            return null;

        await firstVisibleCard.ClickAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.SectionLoadWaitTime);
        return firstVisibleCard;
    }

    /// <summary>
    /// Performs a search using the specified search type and term, then validates the search results page.
    /// Returns the search term that was used.
    /// </summary>
    protected async Task<string> PerformSearchAndValidateResultsAsync(SearchTests.SearchType searchType, string? searchTerm = null)
    {
        // Select a random search term if none provided
        if (searchTerm == null)
        {
            var random = new Random();
            var searchTermIndex = random.Next(0, SearchTerms.Length);
            searchTerm = SearchTerms[searchTermIndex];
        }

        // Perform search based on search type
        if (searchType == SearchTests.SearchType.MainSearch)
        {
            // Use hero search: type in hero input and click search button
            var heroSearchInput = Page.GetByTestId(TestSelectors.MainSearchInputTestId);
            await Expect(heroSearchInput).ToBeVisibleAsync();
            await heroSearchInput.FillAsync(searchTerm);

            var searchButton = Page.GetByTestId(TestSelectors.SearchMainButtonTestId);
            await Expect(searchButton).ToBeVisibleAsync();
            await searchButton.ClickAsync();
        }
        else if (searchType == SearchTests.SearchType.Header)
        {
            // Use header search: click header search button, type in header input, and press enter
            var headerSearchButton = Page.GetByTestId(TestSelectors.HeaderSearchButtonTestId);
            await Expect(headerSearchButton).ToBeVisibleAsync();
            await headerSearchButton.ClickAsync();

            var headerSearchInput = Page.GetByTestId(TestSelectors.HeaderSearchInputTestId);
            await Expect(headerSearchInput).ToBeVisibleAsync();
            await headerSearchInput.FillAsync(searchTerm);
            await headerSearchInput.PressAsync(TestSelectors.EnterKey);
        }

        // Wait for search results to load
        var searchResultsPanel = Page.GetByTestId(TestSelectors.SearchResultsPanelTestId);
        await Expect(searchResultsPanel).ToBeVisibleAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.SearchResultsPanelVisibilityTimeout);

        // Wait for navigation to search results page and validate title
        await Page.WaitForTimeoutAsync(TestSelectors.NavigationLoadWaitTime);

        // Assert that the title "Search Results" exists
        var searchResultsTitle = searchResultsPanel.GetByText(TestSelectors.SearchResultsTitleText);
        await Expect(searchResultsTitle).ToBeVisibleAsync();

        return searchTerm;
    }

    private static TestData LoadTestData()
    {
        var dataFilePath = Path.Combine(AppContext.BaseDirectory, "TestData", TestDataFileName);
        var json = File.ReadAllText(dataFilePath);
        var data = JsonSerializer.Deserialize<TestData>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (data is null)
            throw new InvalidOperationException($"Failed to deserialize test data from '{dataFilePath}'.");

        if (data.SearchTerms.Length == 0)
            throw new InvalidOperationException($"No search terms were loaded from '{dataFilePath}'.");

        if (data.GlossarySearchTerms.Length == 0)
            throw new InvalidOperationException($"No glossary search terms were loaded from '{dataFilePath}'.");

        return data;
    }

    private sealed class TestData
    {
        public string[] SearchTerms { get; init; } = [];

        public string[] GlossarySearchTerms { get; init; } = [];
    }
}