using SchoolAdmission.Api.Infrastructure;

namespace SchoolAdmission.Api.Features;

/// <summary>The eight endpoints of the API contract (brief §4), plus a health check.</summary>
public static class Endpoints
{
    public static void MapAdmissionApi(this IEndpointRouteBuilder app)
    {
        // 1. Create a class (every shift is its own class)
        app.MapPost("/classes", async (CreateClassRequest? body, AdmissionService service) =>
        {
            var created = await service.CreateClassAsync(body);
            return Results.Created($"/classes/{created.Id}", created);
        });

        // 2. All classes with their seat counts
        app.MapGet("/classes", async (AdmissionService service) => Results.Ok(await service.ListClassesAsync()));

        // 3. One class's seat counts
        app.MapGet("/classes/{classId}", async (string classId, AdmissionService service) =>
            Results.Ok(await service.GetClassAsync(classId)));

        // 4. Apply: hold a seat (409 when no seat is left)
        app.MapPost("/classes/{classId}/holds", async (string classId, HttpRequest request, AdmissionService service) =>
        {
            var hold = await service.CreateHoldAsync(classId, StudentId.From(request));
            return Results.Created($"/holds/{hold.HoldId}", hold);
        });

        // 5. Current state of an application
        app.MapGet("/holds/{holdId}", async (string holdId, AdmissionService service) =>
            Results.Ok(await service.GetHoldAsync(holdId)));

        // 6. Pay the admission fee
        app.MapPost("/holds/{holdId}/confirm", async (string holdId, HttpRequest request, AdmissionService service) =>
            Results.Ok(await service.ConfirmAsync(holdId, StudentId.From(request))));

        // 7. Cancel an application (204)
        app.MapDelete("/holds/{holdId}", async (string holdId, HttpRequest request, AdmissionService service) =>
        {
            await service.CancelAsync(holdId, StudentId.From(request));
            return Results.NoContent();
        });

        // 8. This student's applications
        app.MapGet("/me/holds", async (HttpRequest request, AdmissionService service) =>
            Results.Ok(await service.ListStudentHoldsAsync(StudentId.From(request))));

        app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
    }
}
