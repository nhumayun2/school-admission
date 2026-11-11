namespace SchoolAdmission.Api.Infrastructure;

public sealed class AdmissionSettings
{
    /// <summary>How long a seat stays held before it expires. Env: HOLD_DURATION_SECONDS (default 600).</summary>
    public int HoldDurationSeconds { get; init; } = 600;

    public static AdmissionSettings From(IConfiguration config)
    {
        var seconds = config.GetValue<int?>("HOLD_DURATION_SECONDS") ?? 600;
        if (seconds < 1) throw new InvalidOperationException("HOLD_DURATION_SECONDS must be at least 1.");
        return new AdmissionSettings { HoldDurationSeconds = seconds };
    }
}
