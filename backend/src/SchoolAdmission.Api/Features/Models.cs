namespace SchoolAdmission.Api.Features;

// Request and response shapes from the API contract (brief §4). Property names are serialized in camelCase.

public static class HoldStatus
{
    public const string Held = "HELD";
    public const string Confirmed = "CONFIRMED";
    public const string Expired = "EXPIRED";
    public const string Cancelled = "CANCELLED";
}

/// <summary>POST /classes body. Nullable so a missing field gets a readable 400 instead of a crash.</summary>
public sealed record CreateClassRequest(string? Name, int? TotalSeats);

/// <summary>POST /classes response.</summary>
public sealed record ClassCreated(string Id, string Name, int TotalSeats);

/// <summary>GET /classes and GET /classes/{classId}.</summary>
public sealed record ClassSeats(string Id, string Name, int TotalSeats, int HeldSeats, int ConfirmedSeats, int AvailableSeats);

/// <summary>POST /classes/{classId}/holds response.</summary>
public sealed record HoldCreated(string HoldId, string ClassId, string StudentId, string Status, DateTime ExpiresAt);

/// <summary>GET /holds/{holdId} and each item of GET /me/holds. className and createdAt are extra fields.</summary>
public sealed record HoldView(string HoldId, string ClassId, string ClassName, string Status, DateTime ExpiresAt, DateTime CreatedAt);

/// <summary>POST /holds/{holdId}/confirm response.</summary>
public sealed record HoldConfirmed(string HoldId, string Status);
