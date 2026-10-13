namespace McWutWebApp.Hosting;

public sealed class SqlServerDatabaseMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, SqlServerDatabaseGate gate)
    {
        if (SqlServerDatabaseGate.RequestNeedsDatabase(context))
        {
            if (!await gate.EnsureReadyAsync(context.RequestAborted))
            {
                context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
                await context.Response.WriteAsync("The database is not available.", context.RequestAborted);
                return;
            }
        }

        await next(context);
    }
}
