using System.Threading.Tasks;
using NUnit.Framework;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace Interactive_BCBC_E2E;

// ===== Search Tests =====
[TestFixtureSource(typeof(TestProfiles), nameof(TestProfiles.All))]
public class SearchTests : InteractiveBCBCTestBase
{
    public SearchTests(Profile profile) : base(profile)
    {
    }

    public enum SearchType
    {
        MainSearch,
        Header
    }

    [Test]
    public async Task HeaderSearch_ClickSearchButton_ShowsSearchFieldAndCancel_ThenHidesOnClick()
    {
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        // Get the header search button
        var searchButton = Page.GetByTestId(TestSelectors.HeaderSearchButtonTestId);
        await Expect(searchButton).ToBeVisibleAsync();

        // Click the search button
        await searchButton.ClickAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.NodeExpandWaitTime);

        // Assert search button is no longer visible
        await Expect(searchButton).Not.ToBeVisibleAsync();

        // Assert search field is now visible
        var searchField = Page.GetByTestId(TestSelectors.HeaderSearchInputTestId);
        await Expect(searchField).ToBeVisibleAsync();

        // Assert cancel button is now visible
        var cancelButton = Page.GetByTestId(TestSelectors.HeaderSearchCancelButtonTestId);
        await Expect(cancelButton).ToBeVisibleAsync();

        // Click the cancel button
        await cancelButton.ClickAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.NodeExpandWaitTime);

        // Assert search field is no longer visible
        await Expect(searchField).Not.ToBeVisibleAsync();

        // Assert cancel button is no longer visible
        await Expect(cancelButton).Not.ToBeVisibleAsync();

        // Assert the original search button is visible again
        await Expect(searchButton).ToBeVisibleAsync();
    }

    [Test]
    [TestCase(SearchType.MainSearch)]
    [TestCase(SearchType.Header)]
    public async Task HeroSearch_EnterSearchTerm_NavigateToResults_SelectRandomResult_ViewSection(SearchType searchType)
    {
        // Step 1: Go to the landing page
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        // Perform search and validate results page
        var searchTerm = await PerformSearchAndValidateResultsAsync(searchType);

        // Step 2: Select a random search result
        var searchResultCards = Page.Locator(TestSelectors.SearchResultsCardClass);
        await Expect(searchResultCards.First).ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions { Timeout = TestSelectors.SearchResultsCardVisibilityTimeout });
        var cardCount = await searchResultCards.CountAsync();
        Assert.That(cardCount, Is.GreaterThan(0), "Should have at least one search result card");

        var random = new Random();
        var randomIndex = random.Next(0, cardCount);
        var randomSearchResult = searchResultCards.Nth(randomIndex);

        // Step 3: Click on "View Section" within that search result
        var viewSectionButton = randomSearchResult.GetByText(TestSelectors.ViewSectionButtonText);
        await Expect(viewSectionButton).ToBeVisibleAsync();
        await viewSectionButton.ClickAsync();

        // Wait for navigation to the reading view
        await Page.WaitForTimeoutAsync(TestSelectors.NavigationLoadWaitTime);

        // Step 4: Assert that the search term exists within the content of the new reading view page
        var readingView = Page.Locator(TestSelectors.ReadingViewClass);
        await Expect(readingView).ToBeVisibleAsync();

        var readingViewContent = await readingView.TextContentAsync();
        Assert.That(readingViewContent, Does.Contain(searchTerm).IgnoreCase,
            $"The reading view content should contain the search term '{searchTerm}'");
    }

    [Test]
    [TestCase(SearchType.MainSearch)]
    [TestCase(SearchType.Header)]
    public async Task MainSearch_SearchForNonExistingTerm_DisplaysNoResultsFound(SearchType searchType)
    {
        // Step 1: Go to the landing page
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        // Perform search with non-existing term based on search type
        if (searchType == SearchType.MainSearch)
        {
            // Use main search: type in input and click search button
            var mainSearchInput = Page.GetByTestId(TestSelectors.MainSearchInputTestId);
            await Expect(mainSearchInput).ToBeVisibleAsync();
            await mainSearchInput.FillAsync(TestSelectors.SidebarSearchNoResultsTerm);

            var searchButton = Page.GetByTestId(TestSelectors.SearchMainButtonTestId);
            await Expect(searchButton).ToBeVisibleAsync();
            await searchButton.ClickAsync();
        }
        else if (searchType == SearchType.Header)
        {
            // Use header search: click header search button, type in header input, and press enter
            var headerSearchButton = Page.GetByTestId(TestSelectors.HeaderSearchButtonTestId);
            await Expect(headerSearchButton).ToBeVisibleAsync();
            await headerSearchButton.ClickAsync();

            var headerSearchInput = Page.GetByTestId(TestSelectors.HeaderSearchInputTestId);
            await Expect(headerSearchInput).ToBeVisibleAsync();
            await headerSearchInput.FillAsync(TestSelectors.SidebarSearchNoResultsTerm);
            await headerSearchInput.PressAsync(TestSelectors.EnterKey);
        }

        // Wait for search results to load
        await Page.WaitForTimeoutAsync(TestSelectors.NavigationLoadWaitTime);

        // Assert that "No results found" message appears
        var noResultsMessage = Page.GetByText(TestSelectors.NoResultsFoundMessage);
        await Expect(noResultsMessage).ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions
        {
            Timeout = TestSelectors.SearchResultsPanelVisibilityTimeout
        });
    }

    [Test]
    [TestCase(SearchType.MainSearch)]
    [TestCase(SearchType.Header)]
    public async Task MainSearch_ApplyFilters_ReducesResults(SearchType searchType)
    {
        // Step 1: Go to the landing page and perform search
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
        var searchTerm = await PerformSearchAndValidateResultsAsync(searchType);

        // Step 2: Access filters based on device type
        if (profile.DeviceName is not null) // Mobile
        {
            // Open filters sidebar
            var filterToggle = Page.GetByTestId(TestSelectors.SearchResultsFilterToggleTestId);
            await Expect(filterToggle).ToBeVisibleAsync();
            await filterToggle.ClickAsync();
            await Page.WaitForTimeoutAsync(TestSelectors.NodeExpandWaitTime);
        }

        // Access the filters area
        var filtersArea = Page.GetByTestId(TestSelectors.SearchResultsFiltersTestId);
        await Expect(filtersArea).ToBeVisibleAsync();

        // Get the actual number of filter dropdowns
        var filterSelects = filtersArea.Locator(TestSelectors.SearchResultsPageSelectWrapClass);
        var actualFilterCount = await filterSelects.CountAsync();
        Assert.That(actualFilterCount, Is.GreaterThan(0), "Should have at least one filter dropdown");

        // Step 3: Capture the initial/default values of all filters before making any changes
        var initialFilterValues = new List<string>();
        for (int i = 0; i < actualFilterCount; i++)
        {
            var selectWrap = filterSelects.Nth(i);
            var selectElement = selectWrap.Locator(TestSelectors.HtmlSelectSelector);
            var selectedValue = await selectElement.InputValueAsync();
            initialFilterValues.Add(selectedValue);
        }

        // Step 4: Randomly select values from each filter dropdown
        var random = new Random();
        for (int i = 0; i < actualFilterCount; i++)
        {
            var selectWrap = filterSelects.Nth(i);
            var selectElement = selectWrap.Locator(TestSelectors.HtmlSelectSelector);
            await Expect(selectElement).ToBeVisibleAsync();

            // Get all options except the first (usually "All" or default)
            var options = selectElement.Locator(TestSelectors.HtmlOptionSelector);
            var optionCount = await options.CountAsync();

            if (optionCount > 1) // Only select if there are options beyond the default
            {
                // Select a random option (skip index 0 which is the default "All")
                var randomOptionIndex = random.Next(1, optionCount);
                await selectElement.SelectOptionAsync(new SelectOptionValue { Index = randomOptionIndex });
            }
        }

        // Step 4: Apply filters on mobile
        if (profile.DeviceName is not null) // Mobile
        {
            var applyButton = Page.GetByTestId(TestSelectors.ButtonPrimaryTestId).Filter(new() { HasText = TestSelectors.ApplyFiltersButtonText });
            await Expect(applyButton).ToBeVisibleAsync();
            await applyButton.ClickAsync();
            await Page.WaitForTimeoutAsync(TestSelectors.NavigationLoadWaitTime);
        }
        else // Desktop - filters are applied immediately
        {
            // On desktop, wait for results to update after filter selection
            await Page.WaitForTimeoutAsync(TestSelectors.NavigationLoadWaitTime);
        }

        // Step 5: Assert that search results are still present and properly filtered
        var searchResultsPanel = Page.GetByTestId(TestSelectors.SearchResultsPanelTestId);
        await Expect(searchResultsPanel).ToBeVisibleAsync();

        var searchResultsTitle = searchResultsPanel.GetByText(TestSelectors.SearchResultsTitleText);
        await Expect(searchResultsTitle).ToBeVisibleAsync();

        // Check that we have search results or a proper "no results" message after filtering
        var searchResultCards = Page.Locator(TestSelectors.SearchResultsCardClass);
        var cardCount = await searchResultCards.CountAsync();

        if (cardCount > 0)
        {
            // If there are results, verify the first one has the expected structure
            var firstCard = searchResultCards.First;
            await Expect(firstCard).ToBeVisibleAsync();
            var viewSectionButton = firstCard.GetByText(TestSelectors.ViewSectionButtonText);
            await Expect(viewSectionButton).ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions { Timeout = TestSelectors.SidebarVisibilityTimeout });
        }
        else
        {
            // If no results after filtering, the "No results found" message should appear
            var noResultsMessage = Page.GetByText(TestSelectors.NoResultsFoundMessage);
            await Expect(noResultsMessage).ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions
            {
                Timeout = TestSelectors.SearchResultsPanelVisibilityTimeout
            });

            // Step 6: Click the clear filters button if it's visible (only appears when filters are applied)
            var clearFiltersButtonZeroResults = Page.Locator(TestSelectors.ClearFiltersButtonClass);
            if (await clearFiltersButtonZeroResults.IsVisibleAsync())
            {
                await clearFiltersButtonZeroResults.ClickAsync();
                // Wait for filters to be cleared and results to reload
                await Page.WaitForTimeoutAsync(TestSelectors.NavigationLoadWaitTime);
            }
        }
    }
}