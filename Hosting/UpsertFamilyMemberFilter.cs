using FamilyVault.Files.Contracts;
using Microsoft.AspNetCore.Mvc.Filters;

namespace McWutWebApp.Hosting;

public sealed class UpsertFamilyMemberFilter(IFamilyRoster roster) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var user = context.HttpContext.User;
        if (user.Identity?.IsAuthenticated == true && user.GetVaultUserId() is not null)
        {
            await roster.UpsertAsync(user.ToFamilyMember(), context.HttpContext.RequestAborted);
        }

        await next();
    }
}
