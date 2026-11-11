namespace SchoolAdmission.Api.Infrastructure;

/// <summary>A failure the caller should see: an HTTP status, a stable error code and a message a parent can read.</summary>
public sealed class ApiException(int statusCode, string error, string message, object? details = null) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string Error { get; } = error;
    public object? Details { get; } = details;

    public static ApiException BadRequest(string error, string message) => new(400, error, message);
    public static ApiException Forbidden(string error, string message) => new(403, error, message);
    public static ApiException NotFound(string error, string message) => new(404, error, message);
    public static ApiException Conflict(string error, string message, object? details = null) => new(409, error, message, details);
}
