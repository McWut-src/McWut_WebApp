using FamilyVault.Files.Contracts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace McWutWebApp.Hosting;

public sealed class VaultExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        context.Result = context.Exception switch
        {
            PasswordRequiredException => new JsonResult(new { requiresPassword = true }) { StatusCode = StatusCodes.Status401Unauthorized },
            VaultNotFoundException => new NotFoundResult(),
            QuotaExceededException ex => new ObjectResult(new { error = ex.Message, usedBytes = ex.UsedBytes, quotaBytes = ex.QuotaBytes })
            {
                StatusCode = StatusCodes.Status413PayloadTooLarge
            },
            FileTooLargeException ex => new ObjectResult(new { error = ex.Message })
            {
                StatusCode = ex.SizeBytes <= 0 ? StatusCodes.Status400BadRequest : StatusCodes.Status413PayloadTooLarge
            },
            InvalidFileNameException ex => new BadRequestObjectResult(new { error = ex.Message }),
            InvalidContentTypeException ex => new BadRequestObjectResult(new { error = ex.Message }),
            InvalidRangeException => new StatusCodeResult(StatusCodes.Status416RangeNotSatisfiable),
            UnauthorizedAccessException => new UnauthorizedResult(),
            _ => null
        };

        if (context.Result is not null)
        {
            context.ExceptionHandled = true;
        }
    }
}
