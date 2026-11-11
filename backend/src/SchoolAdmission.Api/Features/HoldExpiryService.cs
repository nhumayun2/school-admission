using SchoolAdmission.Api.Infrastructure;

namespace SchoolAdmission.Api.Features;

/// <summary>
/// Rule 2: seats come back on their own. Every few seconds, holds past their time are stored as EXPIRED.
/// Reads already treat an overdue hold as EXPIRED and do not count its seat, so this only keeps the table in step.
/// Safe in several processes at once: the UPDATE touches only rows that are still HELD.
/// </summary>
public sealed class HoldExpiryService(AdmissionService admissions, AdmissionSettings settings, ILogger<HoldExpiryService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(settings.SweepIntervalSeconds));
        do
        {
            try
            {
                var expired = await admissions.ExpireOverdueAsync(stoppingToken);
                if (expired > 0) logger.LogInformation("Released {Count} expired hold(s)", expired);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                // A database hiccup must not stop the loop; the next tick tries again.
                logger.LogWarning("Expiry sweep failed, will retry: {Message}", ex.Message);
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
