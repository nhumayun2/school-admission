using Npgsql;

namespace SchoolAdmission.Api.Infrastructure;

/// <summary>
/// Every failure leaves as JSON — { error, message, details } — so the UI always has a readable message to show.
/// </summary>
public sealed class ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ApiException ex)
        {
            await WriteAsync(context, ex.StatusCode, ex.Error, ex.Message, ex.Details);
        }
        catch (BadHttpRequestException ex) when (!context.Response.HasStarted)
        {
            // Body that is not JSON, or a field of the wrong type such as "totalSeats": "ten".
            logger.LogDebug(ex, "Bad request body");
            await WriteAsync(context, 400, "INVALID_REQUEST", "The request body is not valid JSON of the expected shape.", null);
        }
        catch (Exception ex) when (ex is NpgsqlException or TimeoutException && !context.Response.HasStarted)
        {
            logger.LogError(ex, "Database unavailable");
            await WriteAsync(context, 503, "DATABASE_UNAVAILABLE", "The database cannot be reached right now. Please try again in a moment.", null);
        }
        catch (Exception ex) when (!context.Response.HasStarted)
        {
            logger.LogError(ex, "Unhandled error");
            await WriteAsync(context, 500, "INTERNAL_ERROR", "Something went wrong on the server. Please try again.", null);
        }
    }

    private static Task WriteAsync(HttpContext context, int status, string error, string message, object? details)
    {
        context.Response.Clear();
        context.Response.StatusCode = status;
        return context.Response.WriteAsJsonAsync(new { error, message, details });
    }
}
