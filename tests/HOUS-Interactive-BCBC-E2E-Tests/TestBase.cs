using System.Threading.Tasks;
using Microsoft.Playwright;
using NUnit.Framework;
using static Microsoft.Playwright.Assertions;

namespace Interactive_BCBC_E2E;

public abstract class TestBase
{
    public const string BaseUrlEnvironmentVariableName = "BASE_URL";
    public const string DefaultBaseUrl = "https://interactive-bcbc-app-d6af69-dev.apps.silver.devops.gov.bc.ca/";
    public const int DefaultViewportWidth = 1280;
    public const int DefaultViewportHeight = 720;
    public const string DesktopProfileName = "Desktop";
    public const string IPhone13ProfileName = "iPhone 13";
    public const string Pixel5ProfileName = "Pixel 5";

    public static readonly string BaseUrl = Environment.GetEnvironmentVariable(BaseUrlEnvironmentVariableName) ?? DefaultBaseUrl;
    public static readonly int DefaultTimeout = 10_000;
    public static readonly int NavigationTimeout = 20_000;
    public static readonly int ViewportSizeWidth = DefaultViewportWidth;
    public static readonly int ViewportSizeHeight = DefaultViewportHeight;
    
    protected readonly Profile profile;

    protected IPlaywright Playwright = null!;
    protected IBrowser Browser = null!;
    protected IBrowserContext Context = null!;
    protected IPage Page = null!;
    

    public TestBase(Profile profile) => this.profile = profile;

    [OneTimeSetUp]
    public async Task OneTimeSetUp()
    {
        Playwright = await Microsoft.Playwright.Playwright.CreateAsync();
        Browser = await Playwright.Chromium.LaunchAsync(new()
        {
            Headless = true,
            SlowMo = 0
        });
    }

    [SetUp]
    public async Task SetUp()
    {
        Context = await CreateContextAsync(profile);
        Page = await Context.NewPageAsync();
    }

    [TearDown]
    public async Task TearDown()
    {
        await Context.CloseAsync();
    }

    [OneTimeTearDown]
    public async Task OneTimeTearDown()
    {
        await Browser.CloseAsync();
        Playwright.Dispose();
    }

    /// <summary>
    /// Tries several locator strategies and returns the first one that exists (count>0).
    /// This keeps tests resilient while the UI is still evolving.
    /// </summary>
    protected async Task<ILocator> FirstExistingAsync(params Func<IPage, ILocator>[] candidates)
    {
        foreach (var candidate in candidates)
        {
            var loc = candidate(Page);
            if (await loc.CountAsync() > 0)
                return loc;
        }

        // Return the first candidate to produce a useful error message on assertion.
        return candidates[0](Page);
    }

    private async Task<IBrowserContext> CreateContextAsync(Profile profile)
    {
        // Desktop
        if (profile.DeviceName is null)
        {
            return await Browser.NewContextAsync(new()
            {
                ViewportSize = new ViewportSize { Width = ViewportSizeWidth, Height = ViewportSizeHeight }
            });
        }

        // Mobile device emulation
        var device = Playwright.Devices[profile.DeviceName];
        return await Browser.NewContextAsync(device);
    }

    public record Profile(string Name, string? DeviceName);

    public static class TestProfiles
    {
        public static readonly Profile Desktop = new(DesktopProfileName, DeviceName: null);
        public static readonly Profile IPhone13 = new(IPhone13ProfileName, IPhone13ProfileName);
        public static readonly Profile Pixel5 = new(Pixel5ProfileName, Pixel5ProfileName);

        public static IEnumerable<Profile> All =>
            [Desktop, IPhone13, Pixel5];
    }
}
