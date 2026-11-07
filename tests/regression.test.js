const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');

process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.PORT = '0';
const JWT = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Bot = require('../src/bots/discord/DiscordBot');
const msg = { author: { id: 'requester' } };
const collection = (value) => ({ first: () => value });
const client = { config: { selection: 'text' } };
test('help lists each command once even when registered under aliases', () => {
    const builder = require('../src/bots/discord/DiscordMsgBuilder');
    const radarr = { options: { name: 'radarr', description: 'Search movies' } };
    const sonarr = { options: { name: 'sonarr', description: 'Search shows' } };
    const commands = { radarr, r: radarr, sonarr, s: sonarr };
    const help = builder.buildHelpAllMsg({ config: { commandprefix: '!' } }, commands);
    assert.equal(help.split('**radarr**').length - 1, 1);
    assert.equal(help.split('**sonarr**').length - 1, 1);
    assert.match(help, /Search movies/);
    assert.match(help, /Search shows/);
    assert.equal(commands.r, radarr);
    assert.equal(commands.s, sonarr);
    assert.doesNotMatch(help, /Discord Support Server|discord\.gg/);
});
const selection = (result, length = 3, bot = client) => Bot.prototype.awaitSelection.call(bot, msg, result, length);

test('startup rejects missing, short, and formerly hardcoded secrets', () => {
    for (const secret of ['', 'random_string', 'Ntasdb&TAS)6dtb(A%RSDba8zdASTDbpasdoRASVDraDSoizp7dnobtasd']) {
        const result = spawnSync(process.execPath, ['-e', "require('./src/web/config/keys')"], {
            cwd: require('node:path').join(__dirname, '..'), env: { ...process.env, JWT_SECRET: secret }, encoding: 'utf8'
        });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Set JWT_SECRET/);
        assert.ok(!result.stderr.includes(secret) || !secret || secret === 'random_string');
    }
});

test('text selections validate bounds, cancellation, malformed input, and ownership', async () => {
    for (const [value, expected] of [['0', 0], ['2', 2], ['3', -1], ['-1', -1], ['cancel', -1], [' CANCEL ', -1], ['1junk', -1], ['1.5', -1]]) {
        let filter;
        const result = { channel: { awaitMessages: async (options) => {
            filter = options.filter;
            return collection({ content: value, deletable: true, delete: async () => { throw Error('permissions'); } });
        } }, deletable: true, delete: async () => { throw Error('permissions'); } };
        assert.equal(await selection(result), expected);
        assert.equal(filter({ author: { id: 'other' }, content: '1' }), false);
        assert.equal(filter({ author: msg.author, content: '1junk' }), false);
        assert.equal(filter({ author: msg.author, content: '1' }), true);
    }
});

test('empty or timed out text collectors settle without throwing', async () => {
    assert.equal(await selection({ channel: { awaitMessages: async () => collection() } }), -1);
    assert.equal(await selection({ channel: { awaitMessages: async () => { throw Error('timeout'); } } }), -1);
    assert.equal(await selection({}, 0), -1);
});

test('emoji collector accepts only displayed reactions from the requester', async () => {
    const reactions = [];
    const result = { react: async (emoji) => reactions.push(emoji), awaitReactions: async ({ filter }) => {
        assert.equal(filter({ emoji: { name: '9️⃣' } }, msg.author), false);
        assert.equal(filter({ emoji: { name: '1️⃣' } }, { id: 'other' }), false);
        assert.equal(filter({ emoji: { name: '1️⃣' } }, msg.author), true);
        return collection({ emoji: { name: '1️⃣' } });
    } };
    assert.equal(await selection(result, 2, { config: { selection: 'emoji' } }), 1);
    assert.equal(reactions.length, 2);
    result.awaitReactions = async () => collection();
    assert.equal(await selection(result, 2, { config: { selection: 'emoji' } }), -1);
    result.react = async () => { throw Error('permissions'); };
    assert.equal(await selection(result, 2, { config: { selection: 'emoji' } }), -1);
});

test('confirmation settles true only on a collected reaction; failures settle false', async () => {
    const result = { react: async () => {}, awaitReactions: async ({ filter }) => {
        assert.equal(filter({ emoji: { name: '⬇' } }, msg.author), true);
        assert.equal(filter({ emoji: { name: '⬇' } }, { id: 'other' }), false);
        assert.equal(filter({ emoji: { name: 'x' } }, msg.author), false);
        return collection({});
    } };
    assert.equal(await Bot.prototype.awaitRequest.call(client, msg, result), true);
    result.awaitReactions = async () => collection();
    assert.equal(await Bot.prototype.awaitRequest.call(client, msg, result), false);
    result.awaitReactions = async () => { throw Error('timeout'); };
    assert.equal(await Bot.prototype.awaitRequest.call(client, msg, result), false);
    result.react = async () => { throw Error('permissions'); };
    assert.equal(await Bot.prototype.awaitRequest.call(client, msg, result), false);
});

test('media services submit requests only after confirmation', async (t) => {
    t.mock.method(require('../src/api/tvmaze').prototype, 'isAnime', async () => false);
    for (const [service, method, item] of [
        ['sonarr', 'addSeries', { title: 'Example', genres: [] }],
        ['radarr', 'addMovie', { title: 'Example' }],
        ['ombi', 'requestMovie', {}], ['ombi', 'requestSeries', {}]
    ]) {
        const Service = require(`../src/bots/services/${service}`);
        for (const confirmed of [false, true]) {
            let calls = 0;
            const fake = { config: {}, db: { config: { [service]: { profile: '1', rootfolder: '/media' } } },
                reply: async () => {}, awaitRequest: async () => confirmed,
                api: { [service]: new Proxy({}, { get: () => async () => { calls++; } }) } };
            new Service(fake)[method](msg, {}, item);
            await new Promise(setImmediate);
            assert.equal(calls, confirmed ? 1 : 0, `${service}.${method}`);
        }
    }
});

test('Ombi failed searches and cancelled selections settle with an error message', async () => {
    const Ombi = require('../src/bots/services/ombi');
    for (const [method, apiMethod] of [['getTvDbId', 'searchTVShow'], ['getTmDbId', 'searchMovie']]) {
        for (const mode of ['empty', 'cancel', 'failure']) {
            const fake = { config: {}, api: { ombi: { [apiMethod]: async () => {
                if (mode === 'failure') throw Error('offline');
                return mode === 'empty' ? [] : [{ id: 1 }, { id: 2 }];
            } } }, send: async () => ({}), awaitSelection: async () => -1,
            builder: { buildOmbiSeriesResults: () => '', buildOmbiMovieResults: () => '' } };
            assert.equal(typeof await new Ombi(fake)[method](msg, 'example'), 'string');
        }
    }
});

test('HTTP login, expiration, forged tokens, protected routes, and logout', async (t) => {
    const WebServer = require('../src/web/WebServer');
    const config = structuredClone(require('../src/database/settings_format.json'));
    config.general.username = require('../data/settings.json').general.username;
    config.general.password = await bcrypt.hash('test-password', 4);
    for (const service of ['sonarr', 'radarr']) { config[service].host = ''; config[service].apikey = ''; }
    const server = await new WebServer({ config }, {}).init();
    t.after(() => new Promise((resolve) => server.close(resolve)));
    if (!server.listening) await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = (path, options = {}) => fetch(base + path, { redirect: 'manual', ...options });
    assert.equal((await request('/login')).status, 200);
    assert.equal((await request('/css/mellow.css')).status, 200);
    assert.equal((await request('/config')).headers.get('location'), '/login');
    for (const path of ['/general', '/bot', '/sonarr', '/radarr', '/ombi', '/tautulli']) {
        assert.equal((await request(path, { method: 'POST' })).headers.get('location'), '/login');
    }
    for (const rememberme of ['false', 'true']) {
        const response = await request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: config.general.username, password: 'test-password', rememberme }) });
        assert.equal(response.headers.get('location'), '/config');
        const cookie = response.headers.get('set-cookie');
        assert.match(cookie, /HttpOnly/i); assert.match(cookie, /SameSite=Lax/i);
        const token = decodeURIComponent(cookie.split(';')[0].slice('token='.length));
        const payload = JWT.verify(token, process.env.JWT_SECRET);
        const lifetime = rememberme === 'true' ? 2592000 : 1800;
        assert.equal(payload.exp - payload.iat, lifetime);
        assert.match(cookie, new RegExp(`Max-Age=${lifetime}(?:;|$)`));
        assert.equal((await request('/config', { headers: { Cookie: `token=${token}` } })).status, 200);
        assert.throws(() => JWT.verify(token, process.env.JWT_SECRET, { clockTimestamp: payload.exp + 1 }));
    }
    for (const token of [
        JWT.sign({ user: config.general.username }, process.env.JWT_SECRET),
        JWT.sign({ user: config.general.username }, process.env.JWT_SECRET, { expiresIn: -1 }),
        JWT.sign({ user: config.general.username }, 'wrong-secret', { expiresIn: '30m' }),
        JWT.sign({ user: 'wrong-user' }, process.env.JWT_SECRET, { expiresIn: '30m' }),
        JWT.sign({ user: config.general.username }, process.env.JWT_SECRET, { algorithm: 'HS384', expiresIn: '30m' })
    ]) {
        assert.equal((await request('/config', { headers: { Cookie: `token=${token}` } })).headers.get('location'), '/login');
    }
    for (const password of ['wrong', null, {}, ['test-password']]) {
        const response = await request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: config.general.username, password }) });
        assert.equal(response.headers.get('set-cookie'), null);
        assert.match(await response.text(), /Login failed/);
    }
    const logout = await request('/logout');
    assert.equal(logout.headers.get('location'), '/login');
    assert.match(logout.headers.get('set-cookie'), /token=;/);
});
