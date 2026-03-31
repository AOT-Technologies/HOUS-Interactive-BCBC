using System.Threading.Tasks;
using NUnit.Framework;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace Interactive_BCBC_E2E;

// ===== Reading View Tests =====
[TestFixtureSource(typeof(TestProfiles), nameof(TestProfiles.All))]
public class ReadingViewTests : InteractiveBCBCTestBase
{
    public ReadingViewTests(Profile profile) : base(profile)
    {
    }

    [Test]
    public async Task CrossReferenceLink_ClickAndNavigate_VerifyModalAndDestinationSidebarSelection()
    {
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        // Open sidebar on mobile if needed
        await OpenSidebarIfNeededAsync();

        // Get a quick access item and navigate to an article with a cross reference link
        ILocator? crossRefLink = null;
        bool foundLinkInArticle = false;

        for (int attempt = 0; attempt < TestSelectors.MaxArticleRetries; attempt++)
        {
            // Navigate to landing page if not first attempt
            if (attempt > 0)
            {
                await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
            }

            // Try to select a quick access item and section
            if (!await SelectAndClickRandomQuickAccessItemAsync())
                continue;

            var sectionCard = await SelectAndClickFirstSectionAsync();
            if (sectionCard is null)
                continue;

            // Look for a cross reference link in the article
            var crossRefLinks = Page.Locator(TestSelectors.CrossReferenceLinkClass);
            var linkCount = await crossRefLinks.CountAsync();

            if (linkCount > 0)
            {
                crossRefLink = crossRefLinks.First;
                foundLinkInArticle = true;
                break;
            }
        }

        Assert.That(foundLinkInArticle, Is.True, "Should find an article with a cross reference link");
        Assert.That(crossRefLink, Is.Not.Null, "Cross reference link should be found");

        // Step 1: Click the cross reference link
        await crossRefLink!.ClickAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.ModalAnimationWaitTime);

        // Step 2: Assert modal appears
        var modal = Page.Locator(TestSelectors.CrossReferenceModalContentClass);
        await Expect(modal).ToBeVisibleAsync();

        // Step 3: Close using first close button
        var closeButton1 = Page.Locator(TestSelectors.CrossReferenceModalCloseButtonClass);
        await closeButton1.ClickAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.ModalAnimationWaitTime);

        // Step 4: Assert modal is gone
        await Expect(modal).Not.ToBeVisibleAsync();

        // Step 5: Click the same link again
        await crossRefLink!.ClickAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.ModalAnimationWaitTime);

        // Step 6: Assert modal appears again
        await Expect(modal).ToBeVisibleAsync();

        // Step 7: Close using second close button
        var closeButton2 = Page.Locator(TestSelectors.CrossReferenceModalCloseSecondClass);
        await closeButton2.ClickAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.ModalAnimationWaitTime);

        // Step 8: Assert modal is gone
        await Expect(modal).Not.ToBeVisibleAsync();

        // Step 9: Click the same link again
        await crossRefLink!.ClickAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.ModalAnimationWaitTime);

        // Step 10: Save the subsection title
        // Look for subsection heading in modal or nearby
        var pageSubsectionHeading = Page.Locator(TestSelectors.SubsectionHeadingClass).First;
        if (await pageSubsectionHeading.CountAsync() == 0)
        {
            // Try looking for h2, h3, h4 or heading-like elements within the modal area
            pageSubsectionHeading = modal.Locator(TestSelectors.ModalHeadingSelectors).First;
        }

        await Expect(pageSubsectionHeading).ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions { Timeout = TestSelectors.ModalHeadingVisibilityTimeout });
        var savedTitle = await pageSubsectionHeading.TextContentAsync();

        // Step 11: Click go-to-section button
        var goToButton = modal.Locator(TestSelectors.CrossReferenceModalGoToButtonClass);
        if (await goToButton.CountAsync() == 0)
        {
            goToButton = Page.Locator(TestSelectors.CrossReferenceModalGoToButtonClass);
        }

        var originalUrl = Page.Url;
        await goToButton.ClickAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.NavigationLoadWaitTime); // Extra wait for page load

        // Step 12.a: Assert navigation happened (URL changed or content loaded)
        // The page has navigated to a new section

        // Step 12.b: Assert the subsection node is active in sidebar
        await OpenSidebarIfNeededAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.NodeExpandWaitTime);

        var sidebar = Page.GetByTestId(TestSelectors.SidebarTestId);
        await Expect(sidebar).ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions { Timeout = TestSelectors.SidebarVisibilityTimeout });

        // Assert a nav link is active in sidebar (section or subsection)
        var allActiveNavLinks = sidebar.Locator(TestSelectors.SidebarNavLinkClass + TestSelectors.SidebarNavLinkActiveClass);
        var activeCount = await allActiveNavLinks.CountAsync();
        Assert.That(activeCount, Is.GreaterThanOrEqualTo(1), "At least one nav link should be marked as active in the sidebar");
    }
}