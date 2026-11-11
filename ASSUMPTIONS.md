# Assumptions

Decisions made where the brief does not say exactly what to do, and why.

## Never holding more seats than exist (rule 1 and footnote 1)

An application runs in one database transaction:

1. `SELECT total_seats FROM classes WHERE id = @classId FOR UPDATE` locks that class's row.
2. Overdue holds in that class are marked `EXPIRED`.
3. The student's existing active application is checked, then held + confirmed seats are counted.
4. If a seat is free, the hold is inserted. The transaction commits and the lock is released.

The lock is held by PostgreSQL, not in the backend's memory. Two backend processes on different ports use
the same database, so they wait for the same row lock, and applications for one class are handled one at a
time whichever process receives them. Applications for different classes do not wait for each other.

How this was checked:
- A test sends 50 applications at once for 10 seats and gets exactly 10 holds.
- Another test runs two app instances, each with its own connection pool, on one database: 60 applications
  for 7 seats give exactly 7 holds.
- By hand: a second backend container on port 8081 next to the one on 8080, same database, 60 parallel
  requests split between them for 7 seats: 7 succeeded, 53 got `409`.

A partial unique index on `holds (class_id, student_id) WHERE status IN ('HELD', 'CONFIRMED')` also
enforces rule 3 inside the database.

## Hold expiry (rule 2)

- Hold times come from the database clock, so all backend processes agree on when a hold expires.
- A `HELD` hold past its time is reported as `EXPIRED` on every read straight away, and its seat is no
  longer counted. A background job also stores `EXPIRED` in the table every 5 seconds
  (`HOLD_SWEEP_INTERVAL_SECONDS`). No API call is needed.
- After a hold expires or is cancelled, the student may apply to the same class again.

## Student identity

- The birth registration number must be exactly 17 digits, with no spaces or dashes. The UI and the API
  both check this; the API answers `400` otherwise.
- There is no login, so the UI keeps the number in the browser's `localStorage`. After a refresh, or after
  closing and reopening the browser, the same student's applications are shown again (UI rule 10).
- `X-Student-Id` is required only on the endpoints where the brief shows it (4, 6, 7 and 8).
  `GET /holds/{holdId}` works without it, as in the brief. Hold IDs are random, so they cannot be guessed.

## Classes

- A class name is 1 to 100 characters, and a class has 1 to 10,000 seats. Two classes may share a name.
- The brief has no endpoint to edit or delete a class, so a class cannot be changed after it is created.
- The brief asks for no login anywhere, so the admin screen is open to everyone, reached from the menu.
- IDs are a readable prefix plus random hex, for example `c_3f9a1c0b7d2e4a51` and `h_9c41e07ab25d3f18`.

## Confirm and cancel

- Paying again for a confirmed application returns `200 CONFIRMED` and counts the seat once (rule 5).
- Paying for an expired or cancelled application returns `409` with a message saying why.
- Acting on another student's application returns `403`.
- Only an application still waiting for payment can be cancelled. A paid admission is final, so cancelling
  it returns `409`. Cancelling an already cancelled application returns `204` again.

## Errors

Every error is JSON: `{ "error": "NO_SEATS_AVAILABLE", "message": "...", "details": null }`. The `message`
is written for parents, so the UI can show it as it is. If the database cannot be reached the API answers
`503`. If the backend cannot be reached, the UI says so and keeps retrying.

## Extra response fields

As the brief allows, `GET /holds/{holdId}` and `GET /me/holds` also return `className` and `createdAt`.
No field from the contract is removed or renamed.

## Frontend

- Seat counts refresh every 3 seconds (UI rule 9). Countdowns tick every second and follow the server's
  clock (from the `Date` header), so a wrong clock on the parent's computer does not change the time shown.
- `API_BASE_URL` is read when the frontend container starts, not when the image is built, so one image
  works with any backend address. The browser calls the backend directly, so CORS is open.
- The UI is in English. The three button labels the brief quotes in Bangla are kept exactly:
  "আবেদন করুন", "ভর্তি ফি দিন" and "বাতিল".
- Pressing "ভর্তি ফি দিন" counts as a successful payment, as the brief says.
