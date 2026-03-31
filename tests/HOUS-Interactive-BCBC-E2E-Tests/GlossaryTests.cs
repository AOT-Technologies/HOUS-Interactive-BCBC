using System.Threading.Tasks;
using NUnit.Framework;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace Interactive_BCBC_E2E;

// ===== Glossary Tests =====
[TestFixtureSource(typeof(TestProfiles), nameof(TestProfiles.All))]
public class GlossaryTests : InteractiveBCBCTestBase
{
    public GlossaryTests(Profile profile) : base(profile)
    {
    }

    [Test]
    public async Task Glossary_BrowseAndSearch_Works()
    {
        // Step 1: navigate to home
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        // open mobile nav if necessary
        if (profile.DeviceName is not null)
        {
            var mobileNav = Page.GetByTestId(TestSelectors.HeaderMobileNavButtonTestId);
            await Expect(mobileNav).ToBeVisibleAsync();
            await mobileNav.ClickAsync();
        }

        // navigate to glossary (there may be multiple matching elements; choose a visible one)
        var glossaryLinks = Page.GetByTestId(TestSelectors.GlossaryLinkTestId);
        var glossaryLink = glossaryLinks.First;
        var linkCount = await glossaryLinks.CountAsync();
        for (int i = 0; i < linkCount; i++)
        {
            var candidate = glossaryLinks.Nth(i);
            if (await candidate.IsVisibleAsync())
            {
                glossaryLink = candidate;
                break;
            }
        }
        await Expect(glossaryLink).ToBeVisibleAsync();
        await glossaryLink.ClickAsync();

        // assert sidebar title appears
        var title = Page.Locator(TestSelectors.GlossarySidebarTitleSelector);
        await Expect(title).ToBeVisibleAsync();

        // pick a random letter button, retrying until we see at least one term
        var letters = Page.Locator(TestSelectors.GlossarySidebarLetterClass);
        var letterCount = await letters.CountAsync();
        Assert.That(letterCount, Is.GreaterThan(0), "Should have glossary letter buttons");
        var rnd = new Random();
        string letterText = string.Empty;
        var termTitles = Page.Locator(TestSelectors.GlossarySidebarTermTitleClass);
        int termCount = 0;

        for (int attempt = 0; attempt < letterCount; attempt++)
        {
            var letterIndex = rnd.Next(0, letterCount);
            var letterElement = letters.Nth(letterIndex);
            letterText = (await letterElement.TextContentAsync()) ?? string.Empty;
            await letterElement.ClickAsync();

            termCount = await termTitles.CountAsync();
            if (termCount > 0)
            {
                await Expect(termTitles.First).ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions { Timeout = TestSelectors.NavigationLoadWaitTime });
                break;
            }

            // clear letter filter and try another
            var allBtn = letters.Filter(new LocatorFilterOptions { HasText = TestSelectors.GlossaryAllLetterText });
            if (await allBtn.CountAsync() > 0)
            {
                await allBtn.First.ClickAsync();
            }
        }

        if (termCount > 0)
        {
            var termIndex = rnd.Next(0, termCount);
            var termElement = termTitles.Nth(termIndex);
            var termText = (await termElement.TextContentAsync()) ?? string.Empty;
            var normalizedLetter = letterText.Trim();
            if (!string.Equals(normalizedLetter, TestSelectors.GlossaryAllLetterText, StringComparison.OrdinalIgnoreCase))
            {
                Assert.That(termText.ToUpperInvariant(), Does.StartWith(normalizedLetter.ToUpperInvariant()));
            }
            else
            {
                Assert.That(termText, Is.Not.Null.And.Not.Empty);
            }
        }

        // clear letter filter by clicking the "All" button
        var allButton = letters.Filter(new LocatorFilterOptions { HasText = TestSelectors.GlossaryAllLetterText });
        if (await allButton.CountAsync() > 0)
        {
            await allButton.First.ClickAsync();
        }

        // perform glossary search
        var searchInput = Page.Locator(TestSelectors.GlossarySidebarSearchInputClass);
        await Expect(searchInput).ToBeVisibleAsync();
        var randomIndex = rnd.Next(0, GlossarySearchTerms.Length);
        var searchTerm = GlossarySearchTerms[randomIndex];
        await searchInput.FillAsync(searchTerm);
        await searchInput.PressAsync(TestSelectors.EnterKey);

        var summary = Page.Locator(TestSelectors.GlossarySidebarSearchSummaryClass);
        await Expect(summary).ToBeVisibleAsync();

        var results = Page.Locator(TestSelectors.GlossarySidebarTermClass);
        var resultsCount = await results.CountAsync();
        Assert.That(resultsCount, Is.GreaterThan(0), "Should see glossary results");
        var resultIndex = rnd.Next(0, resultsCount);
        var resultText = (await results.Nth(resultIndex).TextContentAsync()) ?? string.Empty;
        Assert.That(resultText, Does.Contain(searchTerm).IgnoreCase);

        // clear the term field via the x button
        await searchInput.ClickAsync();
        var clearButton = searchInput.Locator(TestSelectors.HtmlButtonSelector);
        if (await clearButton.CountAsync() > 0)
        {
            await clearButton.ClickAsync();
        }

        // unhappy path - no results expected
        await searchInput.FillAsync(TestSelectors.SidebarSearchNoResultsTerm);
        await searchInput.PressAsync(TestSelectors.EnterKey);
        var zeroCount = await results.CountAsync();
        Assert.That(zeroCount, Is.EqualTo(0), "No glossary results expected for unhappy term");

        // close glossary and ensure we left the glossary URL
        var closeIcon = Page.Locator(TestSelectors.GlossarySidebarCloseIconClass);
        await Expect(closeIcon).ToBeVisibleAsync();
        await closeIcon.ClickAsync();
        Assert.That(Page.Url, Does.Not.Contain(TestSelectors.GlossaryUrlSegment), "Closing glossary should navigate away from glossary page");
    }
}