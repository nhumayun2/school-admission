using System.Text.RegularExpressions;

namespace SchoolAdmission.Api.Infrastructure;

/// <summary>The student's identity: the 17-digit birth registration number in the X-Student-Id header.</summary>
public static partial class StudentId
{
    public const string Header = "X-Student-Id";

    [GeneratedRegex(@"^[0-9]{17}$")]
    private static partial Regex SeventeenDigits();

    public static string From(HttpRequest request)
    {
        var value = request.Headers[Header].ToString().Trim();
        if (value.Length == 0)
            throw ApiException.BadRequest("STUDENT_ID_REQUIRED",
                "Enter the student's birth registration number (X-Student-Id header) to continue.");
        if (!SeventeenDigits().IsMatch(value))
            throw ApiException.BadRequest("INVALID_STUDENT_ID", "The birth registration number must be exactly 17 digits.");
        return value;
    }
}
