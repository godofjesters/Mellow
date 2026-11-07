// Run only in a disposable Docker container: exercises the packaged PM2 command.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const settingsPath = '/usr/src/app/data/settings.json';
const original = fs.readFileSync(settingsPath);
const config = structuredClone(require('../src/database/settings_format.json'));
config.general.username = 'smoke-user';
config.general.password = 'smoke-password';
config.bot.token = '';
config.bot.commandprefix = '!persisted-';
let child;
let logs = '';
const stop = async () => {
    if (!child || child.exitCode !== null) return;
    const closed = new Promise((resolve) => child.once('close', resolve));
    child.kill('SIGINT');
    await closed;
};
const start = async () => {
    let lastFailure;
    child = spawn('pm2-runtime', ['src/index.js'], {
        env: { ...process.env, JWT_SECRET: secret }, stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', (chunk) => { logs += chunk; });
    child.stderr.on('data', (chunk) => { logs += chunk; });
    for (let attempt = 0; attempt < 100; attempt++) {
        try {
            const response = await fetch('http://127.0.0.1:5065/login');
            if (response.status === 200) return;
            lastFailure = `HTTP ${response.status}: ${await response.text()}`;
        } catch (error) { lastFailure = String(error.cause || error); }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw Error(`Packaged server did not become ready (${lastFailure}):\n${logs}`);
};
const secret = randomBytes(32).toString('hex');
(async () => {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(config));
        await start();
        const migrated = JSON.parse(fs.readFileSync(settingsPath));
        assert.ok(await bcrypt.compare('smoke-password', migrated.general.password));
        assert.equal(migrated.bot.commandprefix, '!persisted-');
        const response = await fetch('http://127.0.0.1:5065/login', {
            method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'smoke-user', password: 'smoke-password', rememberme: 'true' })
        });
        assert.equal(response.headers.get('location'), '/config');
        assert.match(response.headers.get('set-cookie'), /Max-Age=2592000/);
        await stop();
        await start();
        assert.deepEqual(JSON.parse(fs.readFileSync(settingsPath)), migrated);
        assert.match(logs, /Mellow v3\.0\.1/);
        console.log('PASS: PM2 startup, password migration, HTTP login, restart, and persisted settings');
    } finally {
        await stop();
        fs.writeFileSync(settingsPath, original);
    }
})().catch((error) => { console.error(error); process.exitCode = 1; });
