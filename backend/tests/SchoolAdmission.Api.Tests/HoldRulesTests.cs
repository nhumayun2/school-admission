using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace SchoolAdmission.Api.Tests;

/// <summary>Rules 2, 4 and 6, cancelling, input checks and the response shapes of the contract.</summary>
[Collection(DatabaseCollection.Name)]
public sealed class HoldRulesTests(DatabaseFixture db)
{
    [Fact]
    public async Task An_unpaid_hold_expires_on_its_own_and_its_seat_comes_back()
    {
        await using var app = new ApiFactory(db.ConnectionString, holdSeconds: 2);
        var http = app.CreateClient();
        var classId = await http.CreateClassAsync(seats: 1);
        var student = Api.NewStudent();
        var hold = await http.HoldAsync(classId, student);
        Assert.Equal(0, (await http.SeatsAsync(classId)).AvailableSeats);

        await Task.Delay(TimeSpan.FromSeconds(3));

        // No API call released it: the next reads already see it expired.
        Assert.Equal("EXPIRED", (await http.GetFromJsonAsync<HoldDto>($"/holds/{hold.HoldId}"))!.Status);
        Assert.Equal(1, (await http.SeatsAsync(classId)).AvailableSeats);

        var pay = await http.ConfirmAsync(hold.HoldId, student);
        Assert.Equal(HttpStatusCode.Conflict, pay.StatusCode);
        Assert.Equal("HOLD_EXPIRED", await pay.ErrorCodeAsync());
    }

    [Fact]
    public async Task Only_the_student_who_applied_can_pay()
    {
        await using var app = new ApiFactory(db.ConnectionString);
        var http = app.CreateClient();
        var classId = await http.CreateClassAsync(seats: 3);
        var hold = await http.HoldAsync(classId, Api.NewStudent());

        var pay = await http.ConfirmAsync(hold.HoldId, Api.NewStudent());

        Assert.Equal(HttpStatusCode.Forbidden, pay.StatusCode);
        Assert.Equal(0, (await http.SeatsAsync(classId)).ConfirmedSeats);
    }

    [Fact]
    public async Task Cancelling_gives_the_seat_back_but_a_paid_admission_cannot_be_cancelled()
    {
        await using var app = new ApiFactory(db.ConnectionString);
        var http = app.CreateClient();
        var classId = await http.CreateClassAsync(seats: 1);
        var student = Api.NewStudent();

        var first = await http.HoldAsync(classId, student);
        Assert.Equal(HttpStatusCode.NoContent, (await http.CancelAsync(first.HoldId, student)).StatusCode);
        Assert.Equal(1, (await http.SeatsAsync(classId)).AvailableSeats);

        var second = await http.HoldAsync(classId, student);
        await http.ConfirmAsync(second.HoldId, student);
        var cancel = await http.CancelAsync(second.HoldId, student);
        Assert.Equal(HttpStatusCode.Conflict, cancel.StatusCode);
        Assert.Equal(1, (await http.SeatsAsync(classId)).ConfirmedSeats);
    }

    [Fact]
    public async Task An_admitted_student_cannot_apply_to_the_same_class_again()
    {
        await using var app = new ApiFactory(db.ConnectionString);
        var http = app.CreateClient();
        var classId = await http.CreateClassAsync(seats: 5);
        var student = Api.NewStudent();
        var hold = await http.HoldAsync(classId, student);
        await http.ConfirmAsync(hold.HoldId, student);

        var again = await http.ApplyAsync(classId, student);

        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        Assert.Equal("ALREADY_ADMITTED", await again.ErrorCodeAsync());
    }

    [Theory]
    [InlineData(null, "STUDENT_ID_REQUIRED")]
    [InlineData("12345", "INVALID_STUDENT_ID")]
    [InlineData("2015269123456789X", "INVALID_STUDENT_ID")]
    public async Task A_missing_or_wrong_birth_registration_number_is_rejected(string? student, string error)
    {
        await using var app = new ApiFactory(db.ConnectionString);
        var http = app.CreateClient();
        var classId = await http.CreateClassAsync(seats: 5);

        var response = await http.ApplyAsync(classId, student);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(error, await response.ErrorCodeAsync());
    }

    [Fact]
    public async Task Bad_class_input_gets_a_readable_400()
    {
        await using var app = new ApiFactory(db.ConnectionString);
        var http = app.CreateClient();

        var noName = await http.PostAsJsonAsync("/classes", new { name = " ", totalSeats = 5 });
        var noSeats = await http.PostAsJsonAsync("/classes", new { name = "Class 9", totalSeats = 0 });
        var notJson = await http.PostAsync("/classes", new StringContent("{oops", System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal("INVALID_NAME", await noName.ErrorCodeAsync());
        Assert.Equal("INVALID_TOTAL_SEATS", await noSeats.ErrorCodeAsync());
        Assert.Equal(HttpStatusCode.BadRequest, notJson.StatusCode);
    }

    [Fact]
    public async Task Data_survives_an_app_restart()
    {
        string classId, holdId, student = Api.NewStudent();
        await using (var before = new ApiFactory(db.ConnectionString))
        {
            var http = before.CreateClient();
            classId = await http.CreateClassAsync(seats: 4);
            holdId = (await http.HoldAsync(classId, student)).HoldId;
        }

        await using var after = new ApiFactory(db.ConnectionString);
        var mine = await after.CreateClient().SendAsync(new HttpRequestMessage(HttpMethod.Get, "/me/holds")
        {
            Headers = { { "X-Student-Id", student } },
        });

        var holds = (await mine.Content.ReadFromJsonAsync<List<HoldDto>>())!;
        Assert.Contains(holds, h => h.HoldId == holdId && h.Status == "HELD");
        Assert.Equal(1, (await after.CreateClient().SeatsAsync(classId)).HeldSeats);
    }

    [Fact]
    public async Task Responses_use_the_field_names_of_the_contract()
    {
        await using var app = new ApiFactory(db.ConnectionString);
        var http = app.CreateClient();
        var created = await http.PostAsJsonAsync("/classes", new { name = "Class 6 - Day Shift", totalSeats = 2 });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var classJson = await Json(created);
        var classId = classJson.GetProperty("id").GetString()!;
        Has(classJson, "id", "name", "totalSeats");
        Has((await Json(await http.GetAsync("/classes")))[0], "id", "name", "totalSeats", "heldSeats", "confirmedSeats", "availableSeats");

        var student = Api.NewStudent();
        var applied = await http.ApplyAsync(classId, student);
        Assert.Equal(HttpStatusCode.Created, applied.StatusCode);
        var hold = await Json(applied);
        Has(hold, "holdId", "classId", "studentId", "status", "expiresAt");
        var holdId = hold.GetProperty("holdId").GetString();

        Has(await Json(await http.GetAsync($"/holds/{holdId}")), "holdId", "classId", "status", "expiresAt");
        var mine = await http.SendAsync(new HttpRequestMessage(HttpMethod.Get, "/me/holds") { Headers = { { "X-Student-Id", student } } });
        Has((await Json(mine))[0], "holdId", "classId", "className", "status", "expiresAt");
        Has(await Json(await http.ConfirmAsync(holdId!, student)), "holdId", "status");
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static void Has(JsonElement json, params string[] fields)
    {
        foreach (var field in fields) Assert.True(json.TryGetProperty(field, out _), $"missing field \"{field}\"");
    }
}
