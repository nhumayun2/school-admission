using Npgsql;

namespace SchoolAdmission.Api.Data;

/// <summary>Creates the tables when the app starts. Safe when several backend processes start together.</summary>
public static class Schema
{
    // Every process takes this advisory lock first, so only one runs the DDL at a time.
    private const long LockKey = 4_120_261_111;

    private const string Ddl = """
        CREATE TABLE IF NOT EXISTS classes (
            id          text        PRIMARY KEY,
            name        text        NOT NULL,
            total_seats integer     NOT NULL CHECK (total_seats > 0),
            created_at  timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS holds (
            id         text        PRIMARY KEY,
            class_id   text        NOT NULL REFERENCES classes (id),
            student_id text        NOT NULL CHECK (student_id ~ '^[0-9]{17}$'),
            status     text        NOT NULL CHECK (status IN ('HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED')),
            expires_at timestamptz NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        );

        -- A student may have only one active (HELD) or CONFIRMED application per class.
        CREATE UNIQUE INDEX IF NOT EXISTS ux_holds_one_active
            ON holds (class_id, student_id) WHERE status IN ('HELD', 'CONFIRMED');

        CREATE INDEX IF NOT EXISTS ix_holds_class_active ON holds (class_id) WHERE status IN ('HELD', 'CONFIRMED');
        CREATE INDEX IF NOT EXISTS ix_holds_student      ON holds (student_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS ix_holds_due          ON holds (expires_at) WHERE status = 'HELD';
        """;

    public static async Task EnsureCreatedAsync(NpgsqlDataSource db, ILogger logger)
    {
        // In Docker the database may still be starting, so retry for about a minute.
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await using var conn = await db.OpenConnectionAsync();
                await using var tx = await conn.BeginTransactionAsync();
                await using (var lockCmd = new NpgsqlCommand($"SELECT pg_advisory_xact_lock({LockKey})", conn, tx))
                    await lockCmd.ExecuteNonQueryAsync();
                await using (var ddl = new NpgsqlCommand(Ddl, conn, tx))
                    await ddl.ExecuteNonQueryAsync();
                await tx.CommitAsync();
                logger.LogInformation("Database schema is ready");
                return;
            }
            catch (Exception ex) when (ex is NpgsqlException or System.Net.Sockets.SocketException && attempt < 30)
            {
                logger.LogWarning("Database not reachable yet (attempt {Attempt}): {Message}", attempt, ex.Message);
                await Task.Delay(TimeSpan.FromSeconds(2));
            }
        }
    }
}
