using System.Threading.Tasks;
using NUnit.Framework;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace Interactive_BCBC_E2E;

// ===== Download Page Tests =====
[TestFixtureSource(typeof(TestProfiles), nameof(TestProfiles.All))]
public class DownloadPageTests : InteractiveBCBCTestBase
{
    public DownloadPageTests(Profile profile) : base(profile)
    {
    }

    [Test]
    public async Task DownloadPage_FullPDFAndRevisionPDFs_OpenInNewTabs()
    {
        // Step 1: Go to the landing page
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        // Step 2: Click the Download button at the top of the page.
        // On mobile the nav is collapsed — open it first (same pattern as Glossary test).
        if (profile.DeviceName is not null)
        {
            var mobileNav = Page.GetByTestId(TestSelectors.HeaderMobileNavButtonTestId);
            await Expect(mobileNav).ToBeVisibleAsync();
            await mobileNav.ClickAsync();
            await Page.WaitForTimeoutAsync(TestSelectors.NodeExpandWaitTime);
        }

        // The download button may be in the DOM but not visible; check each candidate for visibility.
        ILocator[] downloadCandidates =
        [
            Page.GetByTestId(TestSelectors.DownloadButtonTestId),
            Page.GetByRole(AriaRole.Button, new() { NameRegex = TestSelectors.DownloadButtonNameRegex }),
            Page.GetByRole(AriaRole.Link, new() { NameRegex = TestSelectors.DownloadButtonNameRegex }),
            Page.Locator(TestSelectors.DownloadButtonSelector),
        ];

        ILocator? visibleDownloadBtn = null;
        foreach (var candidate in downloadCandidates)
        {
            if (await candidate.CountAsync() > 0 && await candidate.First.IsVisibleAsync())
            {
                visibleDownloadBtn = candidate.First;
                break;
            }
        }
        Assert.That(visibleDownloadBtn, Is.Not.Null, "Download button should be visible on the page");
        await visibleDownloadBtn!.ClickAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.NavigationLoadWaitTime);

        // Step 3: Verify we've navigated to the download page
        var downloadPageLocator = Page.GetByTestId(TestSelectors.DownloadPageTestId);
        await Expect(downloadPageLocator).ToBeVisibleAsync();

        // Step 4: Click icon-download — verify it opens the full PDF in a new tab without errors
        var iconDownload = Page.GetByTestId(TestSelectors.DownloadIconTestId).First;
        await Expect(iconDownload).ToBeVisibleAsync();

        var fullPdfPage = await Context.RunAndWaitForPageAsync(async () =>
        {
            await iconDownload.ClickAsync();
        });

        Assert.That(fullPdfPage, Is.Not.Null, "Full PDF should open in a new tab");
        await fullPdfPage.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        Assert.That(fullPdfPage.Url, Is.Not.Null.And.Not.Empty, "Full PDF tab should have a valid URL");

        // Step 5: Verify "Revisions and Errata" section header exists on the download page
        var revisionsHeader = Page.GetByRole(AriaRole.Heading)
            .Filter(new LocatorFilterOptions { HasText = TestSelectors.RevisionsAndErrataHeadingText });
        await Expect(revisionsHeader.First).ToBeVisibleAsync();

        // Step 6: Select a random revision card and click its PDF button — verify a new tab with a PDF opens
        var revisionCards = Page.Locator(TestSelectors.DownloadRevisionCardClass);
        await Expect(revisionCards.First).ToBeVisibleAsync();
        var cardCount = await revisionCards.CountAsync();
        Assert.That(cardCount, Is.GreaterThan(0), "Should have at least one revision card");

        var random = new Random();
        var randomCard = revisionCards.Nth(random.Next(0, cardCount));

        var revisionPdfButton = randomCard.Locator(TestSelectors.DownloadRevisionPdfButtonClass);
        await Expect(revisionPdfButton).ToBeVisibleAsync();

        var revisionPdfPage = await Context.RunAndWaitForPageAsync(async () =>
        {
            await revisionPdfButton.ClickAsync();
        });

        Assert.That(revisionPdfPage, Is.Not.Null, "Revision PDF should open in a new tab");
        await revisionPdfPage.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        var revisionPdfUrl = revisionPdfPage.Url;
        Assert.That(revisionPdfUrl, Is.Not.Null.And.Not.Empty, "Revision PDF tab should have a valid URL");
        Assert.That(revisionPdfUrl, Does.Contain(TestSelectors.PdfFileExtension).IgnoreCase,
            "New tab should contain a PDF file");
    }
}