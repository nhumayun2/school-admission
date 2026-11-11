using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.PostgreSql;

namespace SchoolAdmission.Api.Tests;

/// <summary>One real PostgreSQL in Docker for the whole test run. Each test creates its own classes, so tests do not collide.</summary>
public sealed class DatabaseFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder().WithImage("postgres:17-alpine").Build();

    public string ConnectionString => _container.GetConnectionString();

    public Task InitializeAsync() => _container.StartAsync();

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();
}

[CollectionDefinition(Name)]
public sealed class DatabaseCollection : ICollectionFixture<DatabaseFixture>
{
    public const string Name = "database";
}

/// <summary>The real app, in memory, pointed at the test database. Two instances act as two backend processes.</summary>
public sealed class ApiFactory(string connectionString, int holdSeconds = 600) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", connectionString);
        builder.UseSetting("HOLD_DURATION_SECONDS", holdSeconds.ToString());
        builder.UseSetting("HOLD_SWEEP_INTERVAL_SECONDS", "1");
    }
}

public sealed record ClassDto(string Id, string Name, int TotalSeats, int HeldSeats, int ConfirmedSeats, int AvailableSeats);

public sealed record HoldDto(string HoldId, string ClassId, string? StudentId, string? ClassName, string Status, DateTime ExpiresAt);

public sealed record ErrorDto(string Error, string Message);

public static class Api
{
    private static int _next;

    /// <summary>A fresh, valid 17-digit birth registration number.</summary>
    public static string NewStudent() => "2015" + Interlocked.Increment(ref _next).ToString().PadLeft(13, '0');

    public static async Task<string> CreateClassAsync(this HttpClient http, int seats, string name = "Class 6 - Morning Shift")
    {
        var response = await http.PostAsJsonAsync("/classes", new { name, totalSeats = seats });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ClassDto>())!.Id;
    }

    public static Task<HttpResponseMessage> ApplyAsync(this HttpClient http, string classId, string? student) =>
        http.SendAsync(WithStudent(HttpMethod.Post, $"/classes/{classId}/holds", student));

    public static Task<HttpResponseMessage> ConfirmAsync(this HttpClient http, string holdId, string? student) =>
        http.SendAsync(WithStudent(HttpMethod.Post, $"/holds/{holdId}/confirm", student));

    public static Task<HttpResponseMessage> CancelAsync(this HttpClient http, string holdId, string? student) =>
        http.SendAsync(WithStudent(HttpMethod.Delete, $"/holds/{holdId}", student));

    public static async Task<HoldDto> HoldAsync(this HttpClient http, string classId, string student)
    {
        var response = await http.ApplyAsync(classId, student);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<HoldDto>())!;
    }

    public static async Task<ClassDto> SeatsAsync(this HttpClient http, string classId) =>
        (await http.GetFromJsonAsync<ClassDto>($"/classes/{classId}"))!;

    public static async Task<string> ErrorCodeAsync(this HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<ErrorDto>())!.Error;

    private static HttpRequestMessage WithStudent(HttpMethod method, string path, string? student)
    {
        var request = new HttpRequestMessage(method, path);
        if (student is not null) request.Headers.Add("X-Student-Id", student);
        return request;
    }
}
