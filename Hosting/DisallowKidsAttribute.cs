using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace McWutWebApp.Hosting;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class DisallowKidsAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (context.HttpContext.User.IsInRole(IdentitySeed.KidRole))
        {
            context.Result = new ForbidResult();
            return;
        }

        await next();
    }
}
