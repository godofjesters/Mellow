# Debian deployment

Install Docker Engine and the Compose plugin using [Docker's official Debian instructions](https://docs.docker.com/engine/install/debian/). The application runs inside Docker; Debian does not need Node.js installed.

## First installation

Run these commands as your normal SSH user with sudo access:

```bash
sudo apt update
sudo apt install -y git openssl
git clone https://github.com/godofjesters/Mellow.git
cd Mellow
git switch master
sudo install -d -m 700 /opt/appdata/mellow
```

Create `.env` once. If migrating an installation, preserve its existing secret and settings instead of generating a replacement:

```bash
if [ ! -f .env ]; then
  (umask 077; printf 'JWT_SECRET=%s\n' "$(openssl rand -hex 32)" > .env)
fi
chmod 600 .env
```

The secret is generated on Debian and does not need to match a separate development installation. Do not commit or share `.env`.

If transferring an existing installation, stop its container and securely copy its settings directory into `/opt/appdata/mellow` before starting this deployment. Back up the original first. A fresh installation initializes settings automatically.

Build this fork and start it:

```bash
sudo docker compose up -d --build
sudo docker compose ps
sudo docker compose logs --tail=100 mellow
curl -I http://127.0.0.1:5065/login
```

Open `http://YOUR_DEBIAN_IP:5065` from your computer. The initial credentials on a fresh installation are `mellow` / `default`; change them in General Settings. Configure the Discord token and service URLs/API keys in the UI. Enable Message Content Intent in the Discord developer portal.

Compose publishes port 5065 on the host's interfaces. Keep access within your trusted network or place the UI behind your existing authenticated HTTPS proxy. Service URLs must be reachable from inside the container: `localhost` refers to the Mellow container, not the Debian host.

## Optional pre-deployment tests

These disposable test containers do not mount production settings:

```bash
sudo docker build -t mellow:3.0.1-test .
sudo docker run --rm --network none \
  --mount "type=bind,source=$(pwd)/tests,target=/usr/src/app/tests,readonly" \
  mellow:3.0.1-test npm test
sudo docker run --rm --network none \
  --mount "type=bind,source=$(pwd)/tests,target=/usr/src/app/tests,readonly" \
  mellow:3.0.1-test node tests/docker-smoke.js
```

## Future updates

From the repository directory, stop the service and back up settings and the secret before updating:

```bash
sudo docker compose stop mellow
backup_dir="$HOME/mellow-backup-$(date +%Y%m%d-%H%M%S)"
install -d -m 700 "$backup_dir"
sudo cp -a /opt/appdata/mellow "$backup_dir/data"
cp -p .env "$backup_dir/.env"
git rev-parse HEAD > "$backup_dir/revision"
git pull --ff-only origin master
sudo docker compose up -d --build
sudo docker compose ps
sudo docker compose logs --tail=100 mellow
```

Keep `.env` unchanged across normal updates. For 3.0.1, existing tokens without expiration require a new login. Deployments previously using port 5060 must update mappings/bookmarks to 5065.

For rollback, stop Mellow, check out the saved revision, restore the backed-up settings and corresponding secret, then rebuild/start with that revision's Compose configuration. Do not restore files while the service is writing them.
