namespace SchoolAdmission.Api.Infrastructure;

public sealed class AdmissionSettings
{
    /// <summary>How long a seat stays held before it expires. Env: HOLD_DURATION_SECONDS (default 600).</summary>
    public int HoldDurationSeconds { get; init; } = 600;

    /// <summary>How often expired holds are released. Env: HOLD_SWEEP_INTERVAL_SECONDS (default 5).</summary>
    public int SweepIntervalSeconds { get; init; } = 5;

    public static AdmissionSettings From(IConfiguration config)
    {
        var hold = config.GetValue<int?>("HOLD_DURATION_SECONDS") ?? 600;
        var sweep = config.GetValue<int?>("HOLD_SWEEP_INTERVAL_SECONDS") ?? 5;
        if (hold < 1) throw new InvalidOperationException("HOLD_DURATION_SECONDS must be at least 1.");
        if (sweep < 1) throw new InvalidOperationException("HOLD_SWEEP_INTERVAL_SECONDS must be at least 1.");
        return new AdmissionSettings { HoldDurationSeconds = hold, SweepIntervalSeconds = sweep };
    }
}
