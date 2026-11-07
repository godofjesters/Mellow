# Mellow [![Paypal](https://img.shields.io/badge/PayPal-Donate-Green.svg?logo=Paypal&style=flat-square)](https://www.paypal.com/donate?hosted_button_id=CQ6VM34ZC68HE) [![Docker](https://img.shields.io/badge/Docker-Hub-lightblue.svg?logo=docker&style=flat-square)](https://cloud.docker.com/u/voidp/repository/docker/voidp/mellow) [![Run on Repl.it](https://repl.it/badge/github/v0idp/Mellow)](https://repl.it/github/v0idp/Mellow)

<p align="center">
   <img src="src/resources/logo.png" width="256" height="256">
</p>
<p align="center">
   Mellow can communicate with several APIs like Ombi, Sonarr, Radarr and Tautulli which are related to home streaming to use those services directly in your Discord client.
</p>

## Features

* Search for Movies & TV Shows in Ombi or Sonarr / Radarr
* Request Movies & TV Shows in Ombi or Sonarr / Radarr
* Get a list of all Libraries on your Server in Tautulli
* Additional Features following soon!

## Requirements

* [Node.js 22.x](https://nodejs.org/en/download/) and npm 10.x (matching the Docker runtime)
* A unique random `JWT_SECRET` of at least 32 characters

## Create Bot

Go to https://discord.com/developers/applications/ and press ``New Application``. Copy the Client ID first, you will need that later.
After you have done that go to the Settings Tab to the left and select Bot and press ``Add Bot``. You can now copy the Token from the Bot which you will
need for the Mellow Configuration later on.

Enable **Message Content Intent** on the application's Bot page so prefix commands can be read.

## Invite Bot

Before your Bot actually listen to the channels on your server you will have to invite it first. I recommend using this for beginners: https://discordapi.com/permissions.html
Select the Permissions from below and paste the Client ID down there which you copied earlier. After that just click the link on the bottom and you will
be redirect to a new page where you can select the server you want to invite the Bot too.

* Read Messages
* Embed Links
* Read Message History
* Use External Emojis
* Send Messages
* Manage Messages
* Attach Files
* Mention @everyone
* Add Reactions

## Installation

Go into the Mellow root folder and type
```sh
npm ci
```

Generate a secret and set it in your environment before starting:
```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
PowerShell: `$env:JWT_SECRET = 'paste-generated-secret-here'`.
Bash: `export JWT_SECRET='paste-generated-secret-here'`.
Use the same secret across restarts. Then start the bot:
```sh
npm start
```

## Configuration

After starting the bot you will need to configure it by visiting ``youripordomain:port`` and filling out the Bot Settings which will start the bot with your token.
The default login credentials are username: ``mellow`` password: ``default``. Please change these as soon as possible!
Note: It's recommended to set a username and password in General Settings. This way only you can access the web interface.

## Docker Setup & Start

Build this fork from source so the image includes its updates:

```sh
# First create .env with a generated JWT_SECRET (see .env.example).
docker compose up -d --build
docker compose logs --tail=100 mellow
```

The UI is available at `http://YOUR_SERVER_IP:5065`. Settings persist in `/opt/appdata/mellow/`.
Compose reads `.env` automatically; `npm start` requires the environment variable to be set explicitly.
The upstream `voidp/mellow` registry image does not contain this fork's changes.

See [DEPLOYMENT.md](DEPLOYMENT.md) for Debian installation, backup, testing, and upgrade instructions.

## Testing

Run `npm test` after `npm ci`. Tests use Node's built-in test runner and cover login security, HTTP routes, Discord selections, and request confirmation without connecting to Discord or media services.

To test in the supported Docker runtime:
```sh
docker build -t mellow:3.0.1-test .
docker run --rm --mount "type=bind,source=/absolute/path/to/Mellow/tests,target=/usr/src/app/tests,readonly" mellow:3.0.1-test npm test
docker run --rm --network none --mount "type=bind,source=/absolute/path/to/Mellow/tests,target=/usr/src/app/tests,readonly" mellow:3.0.1-test node tests/docker-smoke.js
```

## 3.0.1 upgrade notes

* Configure a unique random `JWT_SECRET` of at least 32 characters before upgrading. Missing, short, and the former built-in secret are rejected at startup. Existing settings files retain their format.
* The default web port is now **5065**, because browsers block SIP port 5060. Update Docker port mappings and bookmarks, or set `PORT` explicitly to another allowed port.
* Remembered logins expire after 30 days; other logins expire after 30 minutes. Old tokens without an expiration are rejected, so sign in again after upgrading.
* Discord selections now settle on cancellation or timeout, reject invalid indexes, and tolerate missing delete permissions. Media requests require a confirmed reaction.
* Compatible dependency updates address the security advisories reported during this release. Major framework upgrades are deferred to a separately tested release.

## Contributing

1. Fork it (<https://github.com/v0idp/Mellow/fork>)
2. Create your feature branch (`git checkout -b feature/fooBar`)
3. Commit your changes (`git commit -am 'Add some fooBar'`)
4. Push to the branch (`git push origin feature/fooBar`)
5. Create a new Pull Request
