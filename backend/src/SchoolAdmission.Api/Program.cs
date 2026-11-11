using Npgsql;
using SchoolAdmission.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// The connection string comes from configuration, so ConnectionStrings__Default in the environment overrides it.
builder.Services.AddSingleton(sp =>
{
    var connectionString = sp.GetRequiredService<IConfiguration>().GetConnectionString("Default")
        ?? throw new InvalidOperationException("Set the database connection in ConnectionStrings__Default.");
    return NpgsqlDataSource.Create(connectionString);
});

var app = builder.Build();

await Schema.EnsureCreatedAsync(
    app.Services.GetRequiredService<NpgsqlDataSource>(),
    app.Services.GetRequiredService<ILogger<Program>>());

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
