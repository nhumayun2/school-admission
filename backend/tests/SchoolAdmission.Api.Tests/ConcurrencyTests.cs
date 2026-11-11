using System.Net;

namespace SchoolAdmission.Api.Tests;

/// <summary>Rule 1 (and footnote 1), rule 3 and rule 5 under many requests at the same moment.</summary>
[Collection(DatabaseCollection.Name)]
public sealed class ConcurrencyTests(DatabaseFixture db)
{
    [Fact]
    public async Task Fifty_students_applying_at_once_for_ten_seats_get_exactly_ten_holds()
    {
        await using var app = new ApiFactory(db.ConnectionString);
        var http = app.CreateClient();
        var classId = await http.CreateClassAsync(seats: 10);

        var responses = await Task.WhenAll(Enumerable.Range(0, 50).Select(_ => http.ApplyAsync(classId, Api.NewStudent())));

        Assert.Equal(10, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(40, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        var seats = await http.SeatsAsync(classId);
        Assert.Equal(10, seats.HeldSeats);
        Assert.Equal(0, seats.AvailableSeats);
    }

    [Fact]
    public async Task Two_backend_processes_on_one_database_still_never_oversell()
    {
        // Two separate app instances, each with its own services and connection pool, sharing one database.
        await using var first = new ApiFactory(db.ConnectionString);
        await using var second = new ApiFactory(db.ConnectionString);
        var a = first.CreateClient();
        var b = second.CreateClient();
        var classId = await a.CreateClassAsync(seats: 7);

        var responses = await Task.WhenAll(Enumerable.Range(0, 60)
            .Select(i => (i % 2 == 0 ? a : b).ApplyAsync(classId, Api.NewStudent())));

        Assert.Equal(7, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        var seats = await b.SeatsAsync(classId);
        Assert.Equal(7, seats.HeldSeats + seats.ConfirmedSeats);
    }

    [Fact]
    public async Task One_student_double_clicking_apply_gets_only_one_application()
    {
        await using var app = new ApiFactory(db.ConnectionString);
        var http = app.CreateClient();
        var classId = await http.CreateClassAsync(seats: 20);
        var student = Api.NewStudent();

        var responses = await Task.WhenAll(Enumerable.Range(0, 15).Select(_ => http.ApplyAsync(classId, student)));

        Assert.Equal(1, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(1, (await http.SeatsAsync(classId)).HeldSeats);
    }

    [Fact]
    public async Task Paying_for_the_same_hold_many_times_at_once_counts_one_seat()
    {
        await using var app = new ApiFactory(db.ConnectionString);
        var http = app.CreateClient();
        var classId = await http.CreateClassAsync(seats: 5);
        var student = Api.NewStudent();
        var hold = await http.HoldAsync(classId, student);

        var responses = await Task.WhenAll(Enumerable.Range(0, 20).Select(_ => http.ConfirmAsync(hold.HoldId, student)));

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
        var seats = await http.SeatsAsync(classId);
        Assert.Equal(1, seats.ConfirmedSeats);
        Assert.Equal(0, seats.HeldSeats);
    }
}
