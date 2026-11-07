# Mellow project handoff

## Project

Mellow is a Discord bot with an Express/EJS configuration UI. It integrates with Sonarr, Radarr, Ombi, and Tautulli. Settings persist in `data/settings.json`; startup also supports migration from legacy SQLite settings.

The working repository is `https://github.com/godofjesters/Mellow.git`, branch `master`. The original project is configured as the `upstream` remote (`v0idp/Mellow`). Publish this fork's changes to `origin`, not `upstream`.

## Work completed in this chat

The repository review began at version 3.0.0, commit `0ba940c` (Harden Radarr movie request errors). The review found dependency advisories, a shared JWT signing secret, remembered tokens without expiration, unresolved Discord prompts, an out-of-range selection check, outdated setup instructions, and no automated tests.

Version 3.0.1 contains:

* Required `JWT_SECRET`: at least 32 non-whitespace characters; missing/short values and the former built-in secret fail startup. No secret fallback remains.
* Login tokens expire after 30 minutes, or 30 days with remember-me. Verification accepts HS256 and requires an expiration. Legacy tokens without expiration require a new login. Invalid password types are rejected without issuing cookies. The undefined `err` in Passport deserialization was corrected.
* Discord selections settle on cancellation, timeout, empty collectors, or permission failures. Text indexes must be whole integers in `[0, length)`. Reaction filters accept only displayed options from the initiating user. Failed message deletion does not invalidate a successful selection.
* Request confirmation returns a boolean. Sonarr, Radarr, and Ombi submit only when confirmed; reaction setup failures and timeouts do not submit requests. The confirmation helper now adds the reaction itself.
* Ombi unsuccessful searches and cancelled selections now settle instead of leaving pending promises. Direct `tvdb:` and `tmdb:` queries use the actual query instead of undefined `args.name`, and convert IDs to numbers.
* Discord ready handlers register using `Discord.Events.ClientReady`.
* Compatible dependency updates and refreshed lockfile: notably Discord.js 14.28.1, Express 4.22.3, Moment 2.31.0, plus patched transitive dependencies. Last audit reported zero vulnerabilities. Major upgrades to Express, EJS, bcryptjs, and express-promise-router were deliberately deferred for separate compatibility work.
* Default web port changed from 5060 to 5065 in the app, Compose, and documentation. Node fetch rejected 5060 as a bad port because it is reserved for SIP; browser clients restrict it too. Explicit `PORT` overrides still work.
* README now describes Node 22/npm 10, secret setup, Message Content Intent, tests, and upgrade requirements. `.env.example`, `.dockerignore`, and deployment instructions were added. `.env` is excluded from Git and Docker build context.

The user approved version 3.0.1 for this maintenance release and requested the changes be committed and pushed, with Debian rollout instructions.

## Secrets and local state

A cryptographically random 64-character hexadecimal JWT secret was generated into the local, ignored `.env`. Never print, commit, or bake that file into an image. Docker Compose reads it automatically; `npm start` requires `JWT_SECRET` in the process environment. Keep a deployment's secret stable across restarts; rotating it invalidates existing login tokens. Debian requires its own `.env` or a securely transferred existing secret.

No persistent local Mellow container was started. Docker image `mellow:3.0.1-test` was built; all test containers were disposable and removed automatically. A later Docker check found no running or stopped Mellow container. Other local containers belong to unrelated projects and must not be changed for Mellow work.

## Validation and development

Supported runtime: Node 22.x, npm 10.x. The Windows host had Node 26/npm 12, so runtime validation used Docker Desktop and the Dockerfile's Node 22 image. The Dockerfile uses PM2 7.0.4. Do not install native dependencies on an unsupported host just to run tests.

Run `npm ci` then `npm test` on a supported host. The test suite uses Node's built-in runner, without extra test dependencies. `tests/regression.test.js` contains eight test groups covering secret failures, text/reaction selection, timeouts, ownership filters, confirmation gating for all media services, Ombi error settlement, and actual HTTP authentication/protected routes/logout. External service calls are mocked.

Docker validation (PowerShell; adjust the absolute mount path on other hosts):

```powershell
docker build -t mellow:3.0.1-test .
docker run --rm --network none --mount "type=bind,source=D:\Side Projects\Mellowed\tests,target=/usr/src/app/tests,readonly" mellow:3.0.1-test npm test
docker run --rm --network none --mount "type=bind,source=D:\Side Projects\Mellowed\tests,target=/usr/src/app/tests,readonly" mellow:3.0.1-test node tests/docker-smoke.js
```

The smoke script is only for disposable containers. It temporarily replaces container-local settings with a fixture, runs the packaged PM2 command, verifies plaintext-password migration and HTTP login, restarts PM2, checks persisted settings, and restores the fixture file afterward. Never run it against production data or bind-mount real settings into its container.

Latest completed checks: Docker build passed, all eight regression groups passed with networking disabled, PM2 smoke test passed, npm production dependency audit reported zero vulnerabilities, all JS syntax checks passed, and `git diff --check` passed. Live Discord and real Sonarr/Radarr/Ombi/Tautulli integrations have not been tested. Legacy SQLite migration was not exercised against a real legacy database.

## Deployment

Follow-up help cleanup now iterates unique command instances so aliases do not duplicate entries in the help DM. Alias registration and execution are unchanged. A new regression covers the help list, retained aliases, and removal of the external support invite; all nine regression groups passed in the Node 22 Docker image with the updated builder mounted read-only and external networking disabled.

Follow-up Debian troubleshooting showed that changing the bind mount from `/opt/mellow` to `/opt/mellow/data` initialized fresh settings. Restoring the older `/opt/mellow/settings.json` into the active `/opt/mellow/data/settings.json` and restarting recovered the previous bot configuration: Hades connected with prefix `!`. Logs confirmed port 5065 and a successful bot test; web login success was not explicitly confirmed. Updated deployment instructions retain each existing installation's actual mount and environment-file paths, and set `PORT=5065` explicitly. The obsolete external support invite was removed from help, the client, and README in follow-up local edits.

See `DEPLOYMENT.md`. Build this fork locally using Compose; the upstream `voidp/mellow` registry image does not contain these changes. Default persistent host directory is `/opt/appdata/mellow`, container directory `/usr/src/app/data`, and web port 5065. Set a unique secret before startup and change the initial `mellow` / `default` login. Enable Discord Message Content Intent for prefix commands.

For upgrades, preserve and back up settings and `.env`. Verify startup logs and login after rebuilding. Tests must not write production settings or submit real media requests.
