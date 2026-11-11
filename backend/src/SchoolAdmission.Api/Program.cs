using Microsoft.AspNetCore.Http.Json;
using Npgsql;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Features;
using SchoolAdmission.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton(sp => AdmissionSettings.From(sp.GetRequiredService<IConfiguration>()));
builder.Services.AddSingleton<AdmissionService>();
builder.Services.AddHostedService<HoldExpiryService>();

// The connection string comes from configuration, so ConnectionStrings__Default in the environment overrides it.
builder.Services.AddSingleton(sp =>
{
    var connectionString = sp.GetRequiredService<IConfiguration>().GetConnectionString("Default")
        ?? throw new InvalidOperationException("Set the database connection in ConnectionStrings__Default.");
    return NpgsqlDataSource.Create(connectionString);
});

// Malformed JSON throws BadHttpRequestException, which the error middleware turns into a readable 400.
builder.Services.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = true);
builder.Services.Configure<JsonOptions>(o => o.SerializerOptions.PropertyNameCaseInsensitive = true);

// The UI runs on another origin (its own port), so the browser needs CORS to call the API.
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

await Schema.EnsureCreatedAsync(
    app.Services.GetRequiredService<NpgsqlDataSource>(),
    app.Services.GetRequiredService<ILogger<Program>>());

app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseCors();
app.MapAdmissionApi();

// Unknown addresses get the same JSON error shape as everything else.
app.MapFallback(() => Results.Json(new { error = "NOT_FOUND", message = "This address does not exist on the server." }, statusCode: 404));

app.Run();

public partial class Program; // lets the test project start the app in memory
