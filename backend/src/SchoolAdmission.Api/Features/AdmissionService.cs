using Dapper;
using Npgsql;
using SchoolAdmission.Api.Infrastructure;

namespace SchoolAdmission.Api.Features;

/// <summary>
/// The admission rules (brief §5). Every time comparison uses the database clock, so any number of
/// backend processes agree on when a hold runs out.
/// </summary>
public sealed class AdmissionService(NpgsqlDataSource db, AdmissionSettings settings)
{
    private const int MaxNameLength = 100;
    private const int MaxSeats = 10_000;

    // A HELD hold past its time counts as EXPIRED straight away, before anything rewrites the row.
    private const string StatusNow = "CASE WHEN h.status = 'HELD' AND h.expires_at <= now() THEN 'EXPIRED' ELSE h.status END";

    private const string SeatsSql = """
        SELECT c.id, c.name, c.total_seats,
               count(h.id) FILTER (WHERE h.status = 'HELD' AND h.expires_at > now())::int AS held_seats,
               count(h.id) FILTER (WHERE h.status = 'CONFIRMED')::int                     AS confirmed_seats
        FROM classes c
        LEFT JOIN holds h ON h.class_id = c.id AND h.status IN ('HELD', 'CONFIRMED')
        """;

    private const string HoldSql = $"""
        SELECT h.id, h.class_id, c.name AS class_name, h.student_id, {StatusNow} AS status, h.expires_at, h.created_at
        FROM holds h JOIN classes c ON c.id = h.class_id
        """;

    static AdmissionService() => DefaultTypeMap.MatchNamesWithUnderscores = true;

    // ---------- classes ----------

    public async Task<ClassCreated> CreateClassAsync(CreateClassRequest? request)
    {
        var name = request?.Name?.Trim() ?? "";
        if (name.Length == 0)
            throw ApiException.BadRequest("INVALID_NAME", "Enter a class name, for example \"Class 6 - Morning Shift\".");
        if (name.Length > MaxNameLength)
            throw ApiException.BadRequest("INVALID_NAME", $"The class name can be at most {MaxNameLength} characters.");
        if (request?.TotalSeats is not { } seats)
            throw ApiException.BadRequest("INVALID_TOTAL_SEATS", "Enter the number of seats.");
        if (seats is < 1 or > MaxSeats)
            throw ApiException.BadRequest("INVALID_TOTAL_SEATS", $"The number of seats must be between 1 and {MaxSeats}.");

        var id = Ids.New("c");
        await using var conn = await db.OpenConnectionAsync();
        await conn.ExecuteAsync("INSERT INTO classes (id, name, total_seats) VALUES (@id, @name, @seats)", new { id, name, seats });
        return new ClassCreated(id, name, seats);
    }

    public async Task<IReadOnlyList<ClassSeats>> ListClassesAsync()
    {
        await using var conn = await db.OpenConnectionAsync();
        var rows = await conn.QueryAsync<SeatRow>(SeatsSql + " GROUP BY c.id ORDER BY c.created_at, c.id");
        return rows.Select(r => r.ToDto()).ToList();
    }

    public async Task<ClassSeats> GetClassAsync(string classId)
    {
        await using var conn = await db.OpenConnectionAsync();
        var row = await conn.QuerySingleOrDefaultAsync<SeatRow>(SeatsSql + " WHERE c.id = @classId GROUP BY c.id", new { classId });
        return row?.ToDto() ?? throw ClassNotFound();
    }

    // ---------- holds ----------

    /// <summary>
    /// Rules 1 and 3. The class row is locked with SELECT ... FOR UPDATE until commit, so applications to one
    /// class run one after another. The lock is held by PostgreSQL, so this also holds across several backend
    /// processes. Counting and inserting both happen under the lock, so held + confirmed never passes total_seats.
    /// </summary>
    public async Task<HoldCreated> CreateHoldAsync(string classId, string studentId)
    {
        await using var conn = await db.OpenConnectionAsync();
        await using var tx = await conn.BeginTransactionAsync();

        var totalSeats = await conn.QuerySingleOrDefaultAsync<int?>(
            "SELECT total_seats FROM classes WHERE id = @classId FOR UPDATE", new { classId }, tx);
        if (totalSeats is null) throw ClassNotFound();

        // clock_timestamp(), not now(): now() is when the transaction began, which may be before the lock was granted.
        await conn.ExecuteAsync("""
            UPDATE holds SET status = 'EXPIRED', updated_at = clock_timestamp()
            WHERE class_id = @classId AND status = 'HELD' AND expires_at <= clock_timestamp()
            """, new { classId }, tx);

        var mine = await conn.QuerySingleOrDefaultAsync<string>("""
            SELECT status FROM holds
            WHERE class_id = @classId AND student_id = @studentId AND status IN ('HELD', 'CONFIRMED')
            """, new { classId, studentId }, tx);
        if (mine == HoldStatus.Confirmed)
            throw ApiException.Conflict("ALREADY_ADMITTED", "This student is already admitted to this class.");
        if (mine == HoldStatus.Held)
            throw ApiException.Conflict("ALREADY_APPLIED", "This student already has an application waiting for payment in this class.");

        var taken = await conn.ExecuteScalarAsync<int>(
            "SELECT count(*)::int FROM holds WHERE class_id = @classId AND status IN ('HELD', 'CONFIRMED')", new { classId }, tx);
        if (taken >= totalSeats)
            throw ApiException.Conflict("NO_SEATS_AVAILABLE", "All seats in this class are taken. Try another class, or check again later.");

        var id = Ids.New("h");
        var expiresAt = await conn.ExecuteScalarAsync<DateTime>("""
            INSERT INTO holds (id, class_id, student_id, status, expires_at)
            VALUES (@id, @classId, @studentId, 'HELD', clock_timestamp() + make_interval(secs => @seconds))
            RETURNING expires_at
            """, new { id, classId, studentId, seconds = (double)settings.HoldDurationSeconds }, tx);

        await tx.CommitAsync();
        return new HoldCreated(id, classId, studentId, HoldStatus.Held, expiresAt);
    }

    public async Task<HoldView> GetHoldAsync(string holdId)
    {
        await using var conn = await db.OpenConnectionAsync();
        return (await FindAsync(conn, holdId) ?? throw HoldNotFound()).ToView();
    }

    public async Task<IReadOnlyList<HoldView>> ListStudentHoldsAsync(string studentId)
    {
        await using var conn = await db.OpenConnectionAsync();
        var rows = await conn.QueryAsync<HoldRow>(HoldSql + " WHERE h.student_id = @studentId ORDER BY h.created_at DESC", new { studentId });
        return rows.Select(r => r.ToView()).ToList();
    }

    /// <summary>
    /// Rules 4 and 5. Only the owner's unexpired HELD hold changes, and the guarded UPDATE can turn it into
    /// CONFIRMED only once. Paying again for a confirmed hold returns CONFIRMED and counts nothing new.
    /// </summary>
    public async Task<HoldConfirmed> ConfirmAsync(string holdId, string studentId)
    {
        await using var conn = await db.OpenConnectionAsync();
        EnsureOwner(await FindAsync(conn, holdId) ?? throw HoldNotFound(), studentId);

        var changed = await conn.ExecuteAsync("""
            UPDATE holds SET status = 'CONFIRMED', updated_at = now()
            WHERE id = @holdId AND student_id = @studentId AND status = 'HELD' AND expires_at > now()
            """, new { holdId, studentId });
        if (changed == 1) return new HoldConfirmed(holdId, HoldStatus.Confirmed);

        var hold = await FindAsync(conn, holdId) ?? throw HoldNotFound();
        return hold.Status switch
        {
            HoldStatus.Confirmed => new HoldConfirmed(holdId, HoldStatus.Confirmed),
            HoldStatus.Cancelled => throw ApiException.Conflict("HOLD_CANCELLED",
                "This application was cancelled, so the fee cannot be paid. Apply again if seats are left."),
            _ => throw HoldExpired(),
        };
    }

    /// <summary>Cancel an application still waiting for payment; its seat goes back to the pool.</summary>
    public async Task CancelAsync(string holdId, string studentId)
    {
        await using var conn = await db.OpenConnectionAsync();
        EnsureOwner(await FindAsync(conn, holdId) ?? throw HoldNotFound(), studentId);

        var changed = await conn.ExecuteAsync("""
            UPDATE holds SET status = 'CANCELLED', updated_at = now()
            WHERE id = @holdId AND student_id = @studentId AND status = 'HELD' AND expires_at > now()
            """, new { holdId, studentId });
        if (changed == 1) return;

        var hold = await FindAsync(conn, holdId) ?? throw HoldNotFound();
        switch (hold.Status)
        {
            case HoldStatus.Cancelled:
                return; // cancelling twice ends the same way
            case HoldStatus.Confirmed:
                throw ApiException.Conflict("ALREADY_CONFIRMED", "The admission fee is already paid, so this admission cannot be cancelled.");
            default:
                throw HoldExpired();
        }
    }

    /// <summary>Marks every HELD hold whose time has passed as EXPIRED; returns how many changed.</summary>
    public async Task<int> ExpireOverdueAsync(CancellationToken ct)
    {
        await using var conn = await db.OpenConnectionAsync(ct);
        return await conn.ExecuteAsync(new CommandDefinition(
            "UPDATE holds SET status = 'EXPIRED', updated_at = now() WHERE status = 'HELD' AND expires_at <= now()",
            cancellationToken: ct));
    }

    // ---------- helpers ----------

    private static Task<HoldRow?> FindAsync(NpgsqlConnection conn, string holdId) =>
        conn.QuerySingleOrDefaultAsync<HoldRow>(HoldSql + " WHERE h.id = @holdId", new { holdId });

    private static void EnsureOwner(HoldRow hold, string studentId)
    {
        if (hold.StudentId != studentId)
            throw ApiException.Forbidden("NOT_YOUR_APPLICATION", "This application belongs to a different birth registration number.");
    }

    private static ApiException ClassNotFound() =>
        ApiException.NotFound("CLASS_NOT_FOUND", "This class does not exist. The link may be wrong.");

    private static ApiException HoldNotFound() =>
        ApiException.NotFound("APPLICATION_NOT_FOUND", "This application does not exist.");

    private static ApiException HoldExpired() =>
        ApiException.Conflict("HOLD_EXPIRED", "The time to pay the admission fee ran out and the seat was released. Apply again if seats are left.");

    private sealed class SeatRow
    {
        public string Id { get; init; } = "";
        public string Name { get; init; } = "";
        public int TotalSeats { get; init; }
        public int HeldSeats { get; init; }
        public int ConfirmedSeats { get; init; }

        public ClassSeats ToDto() =>
            new(Id, Name, TotalSeats, HeldSeats, ConfirmedSeats, Math.Max(0, TotalSeats - HeldSeats - ConfirmedSeats));
    }

    private sealed class HoldRow
    {
        public string Id { get; init; } = "";
        public string ClassId { get; init; } = "";
        public string ClassName { get; init; } = "";
        public string StudentId { get; init; } = "";
        public string Status { get; init; } = "";
        public DateTime ExpiresAt { get; init; }
        public DateTime CreatedAt { get; init; }

        public HoldView ToView() => new(Id, ClassId, ClassName, Status, ExpiresAt, CreatedAt);
    }
}
