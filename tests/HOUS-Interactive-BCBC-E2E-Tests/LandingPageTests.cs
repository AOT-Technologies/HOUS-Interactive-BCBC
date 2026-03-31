using System.Threading.Tasks;
using NUnit.Framework;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;
namespace Interactive_BCBC_E2E;

// ===== Landing Page Tests =====
[TestFixtureSource(typeof(TestProfiles), nameof(TestProfiles.All))]
public class LandingPageTests : InteractiveBCBCTestBase
{
    public LandingPageTests(Profile profile) : base(profile)
    {
    }

    [Test]
    public async Task HomePage_Sanity_KeyElementsVisible()
    {
        // Step 1: Go to URL
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        // Basic "loaded" check
        Assert.That(Page.Url, Does.StartWith(BaseUrl));

        // Title / Heading
        var heading = await FirstExistingAsync(
            p => p.GetByRole(AriaRole.Heading),
            p => p.Locator(TestSelectors.HeaderH1Selector)
        );
        await Expect(heading.First).ToBeVisibleAsync();

        // Main Search
        var mainSearch = Page.GetByTestId(TestSelectors.MainSearchInputTestId);
        await Expect(mainSearch).ToBeVisibleAsync();

        var searchBtnMain = Page.GetByTestId(TestSelectors.SearchMainButtonTestId);
        if (await searchBtnMain.CountAsync() > 0)
        {
            await Expect(searchBtnMain).ToBeVisibleAsync();
        }

        // Top buttons: Search / Glossary / Download
        var searchBtnHeader = Page.GetByTestId(TestSelectors.HeaderSearchButtonTestId);
        await Expect(searchBtnHeader).ToBeVisibleAsync();

        var glossaryBtn = Page.GetByTestId(TestSelectors.GlossaryButtonTestId);
        if (await glossaryBtn.CountAsync() > 0)
        {
            await Expect(glossaryBtn).ToBeEnabledAsync();
        }

        var downloadBtn = Page.GetByTestId(TestSelectors.DownloadButtonTestId);
        if (await downloadBtn.CountAsync() > 0)
        {
            await Expect(downloadBtn).ToBeEnabledAsync();
        }

        // Report a bug
        var reportBug = await FirstExistingAsync(
            p => p.GetByRole(AriaRole.Link, new() { NameRegex = TestSelectors.ReportBugNameRegex }),
            p => p.GetByRole(AriaRole.Button, new() { NameRegex = TestSelectors.ReportBugNameRegex })
        );
        if (await reportBug.CountAsync() > 0)
        {
            await Expect(reportBug).ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions { Timeout = TestSelectors.BugReportVisibilityTimeout });
        }

        // Sidebar present - only check on desktop
        if (profile.DeviceName is null)
        {
            var sidebar = Page.GetByTestId(TestSelectors.SidebarTestId);
            await Expect(sidebar).ToBeVisibleAsync();

            // Footer present
            var footer = Page.GetByTestId(TestSelectors.FooterTestId);
            await Expect(footer).ToBeVisibleAsync();

            // Quick access section present
            var quickAccess = Page.Locator(TestSelectors.QuickAccessClass);
            if (await quickAccess.CountAsync() > 0)
            {
                await Expect(quickAccess).ToBeVisibleAsync();
            }

            // Breadcrumbs present
            var breadcrumbs = Page.Locator(TestSelectors.BreadcrumbsListClass);
            await Expect(breadcrumbs).ToBeVisibleAsync();

            // Home button in breadcrumbs
            var homeButton = breadcrumbs.GetByRole(AriaRole.Button, new() { Name = TestSelectors.BreadcrumbsHomeButtonName });
            if (await homeButton.CountAsync() > 0)
            {
                await Expect(homeButton).ToBeVisibleAsync();
            }
        }
    }

    [Test]
    public async Task QuickAccessSection_ClickRandomQuickAccessAndSection_VerifyNavigationAndSidebarSelection()
    {
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        await OpenSidebarIfNeededAsync();

        // Step 1: Select a random quick access item
        var quickAccessSuccess = await SelectAndClickRandomQuickAccessItemAsync();
        Assert.That(quickAccessSuccess, Is.True, "Should find and click a quick access item");

        // Step 2: Get and click the first section with its title
        var (sectionCard, storedTitle) = await SelectAndClickFirstSectionWithTitleAsync();
        Assert.That(sectionCard, Is.Not.Null, "Should find and click a section card");
        Assert.That(storedTitle, Is.Not.Null.And.Not.Empty, "Section card should have a title");

        // Step 3: Assert the section title in view matches the stored title
        // The view title may include a section number (e.g., "1.1 General"), extract just the title part
        var viewSectionTitle = Page.Locator(TestSelectors.SectionTitleClass);
        await Expect(viewSectionTitle).ToBeVisibleAsync();
        var viewTitleText = await viewSectionTitle.First.TextContentAsync();
        
        // Extract title without leading section numbers (e.g., "1.1 " or "1.1 Some Title" -> "Some Title")
        var finalViewTitle = viewTitleText?.Trim();
        if (finalViewTitle != null)
        {
            // Remove prefixes like "1.1 " or "Section 3.1. "
            var match = TestSelectors.SectionNumberStripRegex.Match(finalViewTitle);
            if (match.Success)
            {
                finalViewTitle = match.Groups[1].Value;
            }
        }
        
        Assert.That(finalViewTitle?.Trim(), Is.EqualTo(storedTitle?.Trim()), 
            "Section title in view should match the clicked section card title");

        // Step 4: Check sidebar and open if needed on mobile
        await OpenSidebarIfNeededAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.NodeExpandWaitTime);

        var sidebar = Page.GetByTestId(TestSelectors.SidebarTestId);
        await Expect(sidebar).ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions { Timeout = TestSelectors.SidebarVisibilityTimeout });

        // Step 5: Assert the relevant node is selected in the sidebar tree
        var activeNavLinks = sidebar.Locator(TestSelectors.SidebarNavLinkSectionClass + TestSelectors.SidebarNavLinkActiveClass);
        var activeCount = await activeNavLinks.CountAsync();
        Assert.That(activeCount, Is.EqualTo(1), "Exactly one section nav link should be marked as active");

        // Step 6: Assert other visible nav links are not selected
        var allSectionNavLinks = sidebar.Locator(TestSelectors.SidebarNavLinkSectionClass);
        var allCount = await allSectionNavLinks.CountAsync();
        Assert.That(allCount, Is.GreaterThan(0), "There should be section nav links in the sidebar");

        // Verify that only one has the active class by checking the count difference
        var inactiveCount = allCount - activeCount;
        Assert.That(inactiveCount, Is.GreaterThanOrEqualTo(0), "Inactive count should be non-negative");
    }
}
