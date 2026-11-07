# Debian setup and updates

Install Docker Engine first. Prefix `docker` commands with `sudo` if required.

## Clean installation

Do not use this section to replace an existing installation; follow the update section instead.

```bash
sudo apt update
sudo apt install -y git openssl
git clone https://github.com/godofjesters/Mellow.git
cd Mellow
docker build -t mellow:updated .
sudo mkdir -p /opt/mellow
sudo install -d -m 700 /opt/mellow-config

if ! sudo test -f /opt/mellow-config/mellow.env; then
  sudo sh -c 'umask 077; printf "JWT_SECRET=%s\n" "$(openssl rand -hex 32)" > /opt/mellow-config/mellow.env'
fi
sudo chmod 600 /opt/mellow-config/mellow.env

docker run -d \
  --name mellow \
  --restart unless-stopped \
  -p 5065:5065 \
  -e PORT=5065 \
  -v /opt/mellow:/usr/src/app/data \
  --env-file /opt/mellow-config/mellow.env \
  mellow:updated

docker logs --tail=100 mellow
curl -I http://127.0.0.1:5065/login
```

Open `http://YOUR_DEBIAN_IP:5065`. Fresh-install credentials are **mellow / default**; change them in General Settings. Keep the secret across restarts and updates. Keep the UI within your trusted network or behind your existing authenticated HTTPS proxy.

## Discord bot

1. Create or select an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Obtain the bot token and enable **Message Content Intent** under Bot → Privileged Gateway Intents.
3. Invite it with View Channels, Send Messages, Embed Links, Attach Files, Add Reactions, and Read Message History. Include Manage Messages if command-message deletion is enabled.
4. For the existing Hades application, use [this invite](https://discord.com/oauth2/authorize?client_id=1537210169837232228&permissions=126016&integration_type=0&scope=bot). Replace the client ID for a different application. Channel overrides must allow the bot access.
5. Enter the token in Mellow's Bot Settings. Configure the prefix and channel name, then save; Mellow restarts the bot automatically.
6. Configure media services, then test `!help` if using the `!` prefix.

Service addresses must be reachable inside Docker. `localhost` refers to the container. No old external support-server invite is needed.

## Updating while preserving old settings

First find the currently mounted settings directory:

```bash
docker inspect mellow --format '{{range .Mounts}}{{if eq .Destination "/usr/src/app/data"}}{{.Source}}{{end}}{{end}}'
```

Use that exact path below. Original installations used `/opt/mellow`; the later revised guide used `/opt/mellow/data`. Both work. Changing the mount to a different directory without transferring settings creates a fresh configuration.

Set these variables to the existing paths. For the Debian installation restored during troubleshooting:

```bash
SETTINGS_DIR=/opt/mellow/data
ENV_FILE=/opt/mellow/mellow.env
```

If inspection returned `/opt/mellow`, set `SETTINGS_DIR=/opt/mellow` instead. New installations following this guide use `ENV_FILE=/opt/mellow-config/mellow.env`. Do not generate a new secret during an update.

Validate both paths before proceeding:

```bash
sudo test -f "$SETTINGS_DIR/settings.json" || { echo 'Check SETTINGS_DIR: settings.json missing'; exit 1; }
sudo test -f "$ENV_FILE" || { echo 'Check ENV_FILE: environment file missing'; exit 1; }
```

Build the replacement before stopping the current bot:

```bash
cd ~/Mellow
git pull --ff-only origin master
docker build -t mellow:updated .
```

Proceed only if the build succeeded. Stop the bot and back up the settings and existing secret:

```bash
docker stop mellow
BACKUP_DIR="/opt/mellow-backup-$(date +%Y%m%d-%H%M%S)"
sudo install -d -m 700 "$BACKUP_DIR"
sudo cp -a "$SETTINGS_DIR" "$BACKUP_DIR/settings"
sudo cp -p "$ENV_FILE" "$BACKUP_DIR/mellow.env"
```

Proceed only if the backup succeeded. Replace the container using the same paths:

```bash
docker rm mellow
docker run -d \
  --name mellow \
  --restart unless-stopped \
  -p 5065:5065 \
  -e PORT=5065 \
  -v "$SETTINGS_DIR:/usr/src/app/data" \
  --env-file "$ENV_FILE" \
  mellow:updated

docker logs --tail=100 mellow
curl -I http://127.0.0.1:5065/login
```

Use your **previous username and password**. The same settings file preserves your bot token, prefix, and service configuration. Existing tokens without expiration require a new login after upgrading to 3.0.1.

If startup says `No JSON settings found`, check the mount before configuring anything. Do not replace your original settings with the newly initialized file.

The repository's Compose file uses `/opt/appdata/mellow` by default. Change its volume source to your existing settings directory before switching an established installation to Compose, and preserve the existing JWT secret.

## Optional isolated tests

These containers do not mount real settings:

```bash
docker build -t mellow:3.0.1-test .
docker run --rm --network none \
  --mount "type=bind,source=$(pwd)/tests,target=/usr/src/app/tests,readonly" \
  mellow:3.0.1-test npm test
docker run --rm --network none \
  --mount "type=bind,source=$(pwd)/tests,target=/usr/src/app/tests,readonly" \
  mellow:3.0.1-test node tests/docker-smoke.js
```
