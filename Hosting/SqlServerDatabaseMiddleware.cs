namespace McWutWebApp.Hosting;

public sealed class SqlServerDatabaseMiddleware(RequestDelegate next, ILogger<SqlServerDatabaseMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context, SqlServerDatabaseGate gate)
    {
        if (SqlServerDatabaseGate.RequestNeedsDatabase(context))
        {
            if (!await gate.EnsureReadyAsync(context.RequestAborted))
            {
                await WriteWakingResponseAsync(context);
                return;
            }
        }

        try
        {
            await next(context);
        }
        catch (Exception ex) when (SqlServerDatabaseGate.IsPausing(ex) && !context.Response.HasStarted)
        {
            logger.LogWarning("SQL Server is waking from pause. Presenting 503 auto-refresh page.");
            gate.ResetState();
            await WriteWakingResponseAsync(context);
        }
    }

    private static async Task WriteWakingResponseAsync(HttpContext context)
    {
        context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        context.Response.Headers.RetryAfter = "5";
        context.Response.Headers.CacheControl = "no-store, no-cache";

        var isApi = context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase);
        if (isApi)
        {
            context.Response.ContentType = "application/json; charset=utf-8";
            await context.Response.WriteAsync("{\"error\":\"The database is waking up. Retrying shortly.\",\"retryAfter\":5}", context.RequestAborted);
            return;
        }

        context.Response.ContentType = "text/html; charset=utf-8";
        const string html = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta http-equiv="refresh" content="5" />
                <title>Waking Database — McWut</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0b1f3a; margin: 0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
                    .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; max-width: 440px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                    .spinner { width: 36px; height: 36px; margin: 0 auto 20px; border: 3px solid #e2e8f0; border-top-color: #0b1f3a; border-radius: 50%; animation: spin 1s linear infinite; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    h1 { font-size: 1.25rem; margin: 0 0 8px; color: #0b1f3a; }
                    p { font-size: 0.95rem; color: #64748b; margin: 0 0 16px; line-height: 1.5; }
                    .btn { display: inline-block; padding: 8px 16px; background: #0b1f3a; color: white; text-decoration: none; border-radius: 6px; font-size: 0.875rem; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="spinner"></div>
                    <h1>Waking up the database</h1>
                    <p>Azure SQL Serverless was paused while idle. It takes about 5 seconds to wake up. This page will refresh automatically.</p>
                    <a class="btn" href="">Refresh now</a>
                </div>
            </body>
            </html>
            """;
        await context.Response.WriteAsync(html, context.RequestAborted);
    }
}
