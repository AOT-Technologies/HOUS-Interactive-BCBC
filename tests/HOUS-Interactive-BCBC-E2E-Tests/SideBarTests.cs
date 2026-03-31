using System.Threading.Tasks;
using NUnit.Framework;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace Interactive_BCBC_E2E;

// ===== Sidebar Tests =====
[TestFixtureSource(typeof(TestProfiles), nameof(TestProfiles.All))]
public class SideBarTests : InteractiveBCBCTestBase
{
    public SideBarTests(Profile profile) : base(profile)
    {
    }

    [Test]
    public async Task HomePage_SidebarTree_IsVisible_AndHasNodes()
    {
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        // Open sidebar on mobile if needed
        await OpenSidebarIfNeededAsync();

        var tree = Page.GetByTestId(TestSelectors.NavigationTreeTestId);
        await Expect(tree).ToBeVisibleAsync();

        // Has at least one node/item (best effort)
        var treeItems = tree.Locator(TestSelectors.NavigationNodeIdPrefix);
        if (await treeItems.CountAsync() == 0)
        {
            // fallback if data-testid isn't available
            treeItems = tree.Locator(TestSelectors.NavigationNodeFallbackClass);
        }

        await Expect(treeItems.First).ToBeVisibleAsync();
    }

    [Test]
    public async Task HomePage_SidebarSearchField_IsVisible_AndEnabled()
    {
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        // Open sidebar on mobile if needed
        await OpenSidebarIfNeededAsync();

        var sidebar = Page.GetByTestId(TestSelectors.SidebarTestId);
        await Expect(sidebar).ToBeVisibleAsync();

        var sidebarSearch = sidebar.Locator(TestSelectors.SidebarSearchInputClass);

        await Expect(sidebarSearch).ToBeVisibleAsync();
        await Expect(sidebarSearch).ToBeEnabledAsync();
    }

    [Test]
    public async Task SidebarTree_ExpandToLeaf_ShowsReaderTitle()
    {
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        // Open sidebar on mobile if needed
        await OpenSidebarIfNeededAsync();

        // Get the sidebar tree
        var tree = Page.GetByTestId(TestSelectors.NavigationTreeTestId);
        await Expect(tree).ToBeVisibleAsync();

        // Get the first tree node
        var firstNode = tree.Locator(TestSelectors.NavigationNodeIdPrefix).First;
        if (await firstNode.CountAsync() == 0)
        {
            firstNode = tree.Locator(TestSelectors.NavigationNodeFallbackClass).First;
        }

        // Start with the first node
        var currentNode = firstNode;

        // Continue expanding the first visible branch until we reach a leaf node.
        for (int depth = 0; depth < TestSelectors.TreeTraversalMaxDepth; depth++)
        {
            try
            {
                // For each node, check if sidebar is open; reopen if needed
                var sidebarCheckLocator = Page.GetByTestId(TestSelectors.SidebarTestId);
                bool sidebarVisible = await sidebarCheckLocator.IsVisibleAsync();

                if (!sidebarVisible && profile.DeviceName is not null)
                {
                    // Mobile sidebar is closed; reopen it and re-find the node at the current depth
                    await OpenSidebarIfNeededAsync();
                    await Page.WaitForTimeoutAsync(TestSelectors.NodeExpandWaitTime);

                    var treeRoot = Page.GetByTestId(TestSelectors.NavigationTreeTestId);
                    await Expect(treeRoot).ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions { Timeout = TestSelectors.TreeRebuildVisibilityTimeout });

                    // Rebuild locator for the correct node by descending first-child path
                    var current = treeRoot.Locator(TestSelectors.NavigationNodeIdPrefix);
                    if (await current.CountAsync() == 0)
                        current = treeRoot.Locator(TestSelectors.NavigationNodeFallbackClass);

                    for (int i = 0; i < depth; i++)
                    {
                        var nextLoc = current.First.Locator(TestSelectors.NavigationNodeIdPrefix);
                        if (await nextLoc.CountAsync() == 0)
                            nextLoc = current.First.Locator(TestSelectors.NavigationNodeFallbackClass);
                        if (await nextLoc.CountAsync() == 0)
                            break;
                        current = nextLoc;
                    }

                    currentNode = current.First;
                }

                // Get child nodes of current
                var childNodes = currentNode.Locator(TestSelectors.NavigationNodeIdPrefix);
                if (await childNodes.CountAsync() == 0)
                {
                    childNodes = currentNode.Locator(TestSelectors.NavigationNodeFallbackClass);
                }

                // If there are no child nodes, we've reached a leaf
                if (await childNodes.CountAsync() == 0)
                {
                    break;
                }

                // Get the first child and expand it
                var nextNode = childNodes.First;
                await VerifyNodeExpandsWithChildrenAsync(nextNode);

                // Move to the expanded child for the next iteration
                currentNode = nextNode;
            }
            catch
            {
                break;
            }
        }

        // Click the leaf node to open the reader view
        await currentNode.ClickAsync();
        await Page.WaitForTimeoutAsync(TestSelectors.NodeExpandWaitTime);

        // Verify the reader/content panel contains a heading
        var contentPanel = Page.GetByTestId(TestSelectors.ContentPanelTestId);
        await Expect(contentPanel).ToBeVisibleAsync();
        var contentTitle = contentPanel.GetByRole(AriaRole.Heading).First;
        Assert.That(await contentTitle.CountAsync(), Is.GreaterThan(0));
    }

    [Test]
    public async Task SidebarSearch_SearchForTerm_FiltersNodesAndExpandsWithChildren()
    {
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        // Open sidebar on mobile if needed
        await OpenSidebarIfNeededAsync();

        // Get the sidebar and search field
        var sidebar = Page.GetByTestId(TestSelectors.SidebarTestId);
        await Expect(sidebar).ToBeVisibleAsync();

        var sidebarSearch = sidebar.Locator(TestSelectors.SidebarSearchInputClass);
        await Expect(sidebarSearch).ToBeVisibleAsync();

        // Type the search term
        await sidebarSearch.FillAsync(TestSelectors.SidebarSearchTestTerm);

        // Wait longer on mobile for search results to load
        int searchWaitTime = profile.DeviceName is not null
            ? TestSelectors.NavigationLoadWaitTime
            : TestSelectors.SectionLoadWaitTime;
        await Page.WaitForTimeoutAsync(searchWaitTime);

        // Get the tree and verify it's visible
        var tree = Page.GetByTestId(TestSelectors.NavigationTreeTestId);
        await Expect(tree).ToBeVisibleAsync();

        // Get the filtered tree items - wait for them to appear
        var treeItems = tree.Locator(TestSelectors.NavigationNodeIdPrefix);
        if (await treeItems.CountAsync() == 0)
        {
            treeItems = tree.Locator(TestSelectors.NavigationNodeFallbackClass);
        }

        // Verify at least one node exists with extended timeout for mobile
        await Expect(treeItems.First).ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions
        {
            Timeout = profile.DeviceName is not null
                ? TestSelectors.TreeRebuildVisibilityTimeout
                : TestSelectors.SidebarVisibilityTimeout
        });

        // Verify the first visible node contains the search term (case-insensitive)
        var firstNodeText = await treeItems.First.TextContentAsync();
        Assert.That(firstNodeText?.ToLower(), Does.Contain(TestSelectors.SidebarSearchTestTerm.ToLower()));

        // Verify the first node can be expanded to show children
        await VerifyNodeExpandsWithChildrenAsync(treeItems.First);
    }

    [Test]
    public async Task SidebarSearch_SearchForNonExistingTerm_DisplaysNoResultsFound()
    {
        await Page.GotoAsync(BaseUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

        // Open sidebar on mobile if needed
        await OpenSidebarIfNeededAsync();

        // Get the sidebar and search field
        var sidebar = Page.GetByTestId(TestSelectors.SidebarTestId);
        await Expect(sidebar).ToBeVisibleAsync();

        var sidebarSearch = sidebar.Locator(TestSelectors.SidebarSearchInputClass);
        await Expect(sidebarSearch).ToBeVisibleAsync();

        // Type the non-existing search term
        await sidebarSearch.FillAsync(TestSelectors.SidebarSearchNoResultsTerm);

        // Wait longer on mobile for search results
        int searchWaitTime = profile.DeviceName is not null
            ? TestSelectors.NavigationLoadWaitTime
            : TestSelectors.SectionLoadWaitTime;
        await Page.WaitForTimeoutAsync(searchWaitTime);

        // Look for "No results found" message with extended timeout for mobile
        var noResultsMessage = Page.GetByText(TestSelectors.NoResultsFoundMessage);
        await Expect(noResultsMessage).ToBeVisibleAsync(new LocatorAssertionsToBeVisibleOptions
        {
            Timeout = profile.DeviceName is not null
                ? TestSelectors.TreeRebuildVisibilityTimeout
                : TestSelectors.SidebarVisibilityTimeout
        });
    }
}