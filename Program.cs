using System.Text.Json.Serialization;
using FamilyVault.Files;
using FamilyVault.Files.Azure;
using FamilyVault.Files.Data;
using McWutWebApp.Hosting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel((context, options) =>
{
    var max = context.Configuration.GetValue<long?>("Files:MaxFileSizeBytes") ?? 104_857_600;
    options.Limits.MaxRequestBodySize = max;
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddFamilyVaultFiles(builder.Configuration);

var filesProvider = builder.Configuration["Files:Provider"] ?? "Local";
if (filesProvider.Equals("Azure", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddFamilyVaultAzure(builder.Configuration);
}

var identityOptions = builder.Configuration.GetSection(IdentitySiteOptions.SectionName).Get<IdentitySiteOptions>()
                      ?? new IdentitySiteOptions();
builder.Services.Configure<IdentitySiteOptions>(builder.Configuration.GetSection(IdentitySiteOptions.SectionName));
if (builder.Environment.IsDevelopment())
{
    builder.Services.PostConfigure<IdentitySiteOptions>(o => o.SeedDemoUsers = true);
}

if (filesProvider.Equals("Azure", StringComparison.OrdinalIgnoreCase))
{
    var azureCs = builder.Configuration["Files:Azure:ConnectionString"]
                  ?? throw new InvalidOperationException("Files:Azure:ConnectionString is required.");
    var keysContainer = builder.Configuration["Files:Azure:KeysContainer"] ?? "keys";
    builder.Services.AddDataProtection()
        .SetApplicationName("McWutWebApp")
        .PersistKeysToAzureBlobStorage(azureCs, keysContainer, "mcwut-keys.xml");
}
else
{
    var vaultRoot = builder.Configuration["Files:Local:RootPath"] ?? "App_Data/vault";
    var keysPath = Path.IsPathRooted(vaultRoot)
        ? Path.Combine(Directory.GetParent(vaultRoot.TrimEnd('/', '\\'))?.FullName ?? "/app/data", "keys")
        : Path.Combine(builder.Environment.ContentRootPath, "App_Data", "keys");
    Directory.CreateDirectory(keysPath);
    builder.Services.AddDataProtection()
        .SetApplicationName("McWutWebApp")
        .PersistKeysToFileSystem(new DirectoryInfo(keysPath));
}

builder.Services
    .AddDefaultIdentity<IdentityUser>(options =>
    {
        options.SignIn.RequireConfirmedAccount = false;
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = builder.Environment.IsDevelopment() ? 1 : 8;
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredUniqueChars = 0;
        options.Lockout.AllowedForNewUsers = false;
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Environment.IsProduction()
        ? CookieSecurePolicy.Always
        : CookieSecurePolicy.SameAsRequest;
    options.LoginPath = "/Identity/Account/Login";
    options.LogoutPath = "/Identity/Account/Logout";
    options.AccessDeniedPath = "/Identity/Account/AccessDenied";
});

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = options.DefaultPolicy;
    options.AddPolicy("Admin", policy => policy.RequireRole(IdentitySeed.AdminRole));
});

builder.Services.AddRazorPages(options =>
{
    options.Conventions.AllowAnonymousToPage("/Index");
    options.Conventions.AllowAnonymousToPage("/Privacy");
    options.Conventions.AllowAnonymousToPage("/Error");
    options.Conventions.AllowAnonymousToPage("/Share/Index");
    options.Conventions.AllowAnonymousToPage("/Join/Index");
    options.Conventions.AuthorizeFolder("/Admin", "Admin");
    options.Conventions.AllowAnonymousToAreaPage("Identity", "/Account/Login");
    if (identityOptions.AllowRegistration)
    {
        options.Conventions.AllowAnonymousToAreaPage("Identity", "/Account/Register");
    }
    else
    {
        options.Conventions.AuthorizeAreaPage("Identity", "/Account/Register");
    }

    options.Conventions.AllowAnonymousToAreaPage("Identity", "/Account/Logout");
    options.Conventions.AllowAnonymousToAreaPage("Identity", "/Account/ForgotPassword");
    options.Conventions.AllowAnonymousToAreaPage("Identity", "/Account/ResetPassword");
    options.Conventions.AllowAnonymousToAreaPage("Identity", "/Account/AccessDenied");
});

builder.Services.AddControllers(options =>
{
    options.Filters.Add<VaultExceptionFilter>();
})
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddScoped<UpsertFamilyMemberFilter>();
builder.Services.AddScoped<InviteService>();
builder.Services.AddSingleton<RetentionMapper>();
builder.Services.AddHostedService<DatabaseStartupWorker>();

var app = builder.Build();

var urls = Environment.GetEnvironmentVariable("ASPNETCORE_URLS") ?? "";
var httpOnly = urls.Contains("http://", StringComparison.OrdinalIgnoreCase)
               && !urls.Contains("https://", StringComparison.OrdinalIgnoreCase);

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    if (!httpOnly)
    {
        app.UseHsts();
    }
}

app.UseForwardedHeaders();
if (!httpOnly)
{
    app.UseHttpsRedirection();
}

app.UseRouting();
app.Use(async (context, next) =>
{
    var allow = context.RequestServices.GetRequiredService<Microsoft.Extensions.Options.IOptions<IdentitySiteOptions>>().Value.AllowRegistration;
    if (!allow && context.Request.Path.StartsWithSegments("/Identity/Account/Register", StringComparison.OrdinalIgnoreCase))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    await next();
});
app.UseAuthentication();
app.UseAuthorization();

app.MapStaticAssets().AllowAnonymous();
app.MapRazorPages()
    .WithStaticAssets();
app.MapControllers();
app.MapGet("/health", () => Results.Text("ok")).AllowAnonymous();
app.MapGet("/Vault", () => Results.Redirect("/files"));
app.MapGet("/Vault/Shared", () => Results.Redirect("/files/shared"));

app.Run();
