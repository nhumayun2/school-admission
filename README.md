# School Admission System

Online admission for a school that admits on a first-come, first-served basis.
Parents apply for a seat in a class (each shift is its own class). The seat is held for a limited time
and becomes a confirmed admission when the admission fee is paid; unpaid holds expire and the seat
goes back to the pool.

- `backend/`: ASP.NET Core (.NET 10) API with PostgreSQL
- `frontend/`: React 19 UI built with Vite

## Run with Docker

Only Docker is needed (Docker Desktop, or Docker Engine with the Compose plugin).

```sh
docker compose up --build
```

This starts PostgreSQL, the backend and the frontend. The first build takes a few minutes.

| What | URL |
|---|---|
| Frontend (open this) | http://localhost:3000 |
| Backend API | http://localhost:8080 |

Data is kept in the `pgdata` volume, so it survives `docker compose down` and `up`.
To start from an empty database: `docker compose down -v`.

### Trying it out

1. Open http://localhost:3000 and go to **Create class**. Add a class, for example "Class 6 - Morning Shift" with 120 seats.
2. Type a 17-digit birth registration number in the box at the top of the page.
3. On **Classes**, press **আবেদন করুন**. The seat is held for 10 minutes.
4. On the application page, press **ভর্তি ফি দিন** to confirm the admission, or **বাতিল** to cancel it.
5. **My applications** lists every application for the number in the top box.

### Settings

All are optional. Set them in the shell or in a `.env` file next to `docker-compose.yml`.

| Variable | Default | What it does |
|---|---|---|
| `FRONTEND_PORT` | `3000` | Port the frontend is published on |
| `API_BASE_URL` | `http://localhost:8080` | Backend URL the browser calls. Read when the frontend container starts, so no rebuild is needed |
| `HOLD_DURATION_SECONDS` | `600` | How long a seat stays held before it expires |

The backend reads its database connection from `ConnectionStrings__Default` (set in `docker-compose.yml`).
`HOLD_SWEEP_INTERVAL_SECONDS` (default `5`) sets how often expired holds are released.

If port 3000 is already in use: `FRONTEND_PORT=3100 docker compose up` (PowerShell: `$env:FRONTEND_PORT=3100; docker compose up`).

## Run the tests

### With Docker only

```sh
docker compose -f docker-compose.test.yml run --rm backend-tests
docker compose -f docker-compose.test.yml run --rm frontend-tests
```

The backend tests start their own throwaway PostgreSQL container, so the app does not need to be running.

### With the SDKs installed

Backend (needs the .NET 10 SDK and a running Docker):

```sh
cd backend
dotnet test
```

Frontend (needs Node.js 20.19+ or 22.12+):

```sh
cd frontend
npm ci
npm test
```

### What is tested

- **Backend (14 tests, real PostgreSQL):** 50 students applying at once for 10 seats get exactly 10 holds;
  two backend instances sharing one database still never over-hold; a double click gives one hold; expiry,
  confirm, cancel, ownership (`403`), input validation, data surviving a restart, and the API field names.
- **Frontend (28 tests):** the birth registration number box, the create class form, the API client,
  countdown and expiry logic, and the apply, pay and "last seat taken" flows against a fake backend.

## API

| Method | Path | |
|---|---|---|
| `POST` | `/classes` | Create a class |
| `GET` | `/classes` | List classes with seat counts |
| `GET` | `/classes/{classId}` | One class |
| `POST` | `/classes/{classId}/holds` | Apply (hold a seat), needs `X-Student-Id` |
| `GET` | `/holds/{holdId}` | One application |
| `POST` | `/holds/{holdId}/confirm` | Pay the fee, needs `X-Student-Id` |
| `DELETE` | `/holds/{holdId}` | Cancel, needs `X-Student-Id` |
| `GET` | `/me/holds` | This student's applications, needs `X-Student-Id` |

Errors are JSON: `{ "error": "NO_SEATS_AVAILABLE", "message": "...", "details": null }`.

## How the seat limit holds under load

Every apply runs in one database transaction that first locks the class row
(`SELECT ... FROM classes WHERE id = @id FOR UPDATE`). Applies for the same class therefore run one at a time,
count the active holds, and insert only if a seat is free. Because the lock lives in PostgreSQL, this also works
with several backend instances. A partial unique index stops one student from holding two active seats in the
same class. Expiry is decided by time in every query, and a background job also marks expired holds every few seconds.

See `ASSUMPTIONS.md` for the decisions the brief left open.
