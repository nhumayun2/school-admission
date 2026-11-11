# AI usage

## Tool

Claude Code (Anthropic's Claude Opus model), used in VS Code.

## Where I used it

- Backend: the ASP.NET Core API, the SQL for the seat-locking transaction and the
  error handling.
- Tests: the backend tests, including the concurrency tests, and the frontend tests.
- Frontend: the React screens, the API client and the styling. A plain HTML prototype of the UI came
  first; I reviewed it before it was turned into React.
- Docker: the Dockerfiles, docker-compose.yml, docker-compose.test.yml
- Docs: first drafts of README.md

I worked step by step and committed after each step. I ran the app with docker compose up, tried
the screens in the browser, and ran the tests.

## Where the AI went wrong, and how I caught it

- The concurrency test used the same student twice. The helper that made test birth registration
  numbers padded them with 1s, so many "different" students got the same number and were refused as
  ALREADY_APPLIED instead of NO_SEATS_AVAILABLE. The test counts did not add up, which showed the
  problem. The helper now pads with 0s and every student is unique.
- A test package did not match the .NET version. The version range for
  Microsoft.AspNetCore.Mvc.Testing picked up a release built for a newer .NET, and the test project
  failed to build. I pinned the version that matches .NET 10.
- The create class form repeated itself. With the backend stopped, the error box said the same thing
  in its title and its text. I saw it when I stopped the backend on purpose and tried the form; the text
  now says what to do next.
- The seat plan animation did not replay after creating a class. The app goes back to the class list
  after a class is created, but the seats appeared without their animation. I noticed it in the browser;
  the cause was a missing dependency in a React effect.
- Too many code comments. The first frontend code had comments explaining obvious lines. I asked for
  them to be removed and for only the useful ones to stay.
- A build warning was left in the tests. Running the backend tests in Docker showed that the test
  database setup used an outdated constructor. It was replaced with the current one.
