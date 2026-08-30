const { ucwords } = require('../../util.js');
const Sonarr = require('../../api/sonarr.js');
const Radarr = require('../../api/radarr.js');

const render = async (req, res) => {
    const config = req.webserver.WebDatabase.config;
    const sonarr = new Sonarr(config['sonarr']);
    const radarr = new Radarr(config['radarr']);
    let sonarrProfiles;
    let sonarrRootFolders;
    let sonarrLanguageProfiles;
    let radarrProfiles;
    let radarrRootFolders;

    if (config.sonarr.host && config.sonarr.apikey) {
        [sonarrProfiles, sonarrRootFolders, sonarrLanguageProfiles] = await Promise.all([
            sonarr.getProfiles().catch(() => undefined),
            sonarr.getRootFolders().catch(() => undefined),
            sonarr.getLanguageProfiles().catch(() => undefined)
        ]);
    }

    if (config.radarr.host && config.radarr.apikey) {
        [radarrProfiles, radarrRootFolders] = await Promise.all([
            radarr.getProfiles().catch(() => undefined),
            radarr.getRootFolders().catch(() => undefined)
        ]);
    }
    
    res.status(200)
    .render('config', {
        title: 'Mellow Configuration',
        successMsg: req.webserver.successMsg,
        errorMsg: req.webserver.errorMsg,
        currentView: req.webserver.currentView,
        generalSettings: (config.general) ? config.general : '',
        botSettings: (config.bot) ? config.bot : '',
        ombiSettings:  (config.ombi) ? config.ombi : '',
        tautulliSettings:  (config.tautulli) ? config.tautulli : '',
        sonarrSettings:  (config.sonarr) ? config.sonarr : '',
        radarrSettings:  (config.radarr) ? config.radarr : '',
        sonarrOptions: {
            profiles: (sonarrProfiles) ? sonarrProfiles : undefined,
            rootfolders: (sonarrRootFolders) ? sonarrRootFolders : undefined,
            languageprofiles: (sonarrLanguageProfiles) ? sonarrLanguageProfiles : undefined,
        },
        radarrOptions: {
            profiles: (radarrProfiles) ? radarrProfiles : undefined,
            rootfolders: (radarrRootFolders) ? radarrRootFolders : undefined
        }
    });
}

const save = async (req, res) => {
    await req.webserver.WebDatabase.saveConfig(req);
    req.webserver.restartBot();
    req.webserver.currentView = req.originalUrl.replace('/', '');
    req.webserver.successMsg = ucwords(req.webserver.currentView) + ' configuration saved.';
    res.redirect('/config');
}

const reset = async (req, res) => {
    req.webserver.WebDatabase.resetConfigTable(req.originalUrl.split('/')[1]);
    req.webserver.restartBot();
    req.webserver.currentView = req.originalUrl.split('/')[1];
    req.webserver.successMsg = ucwords(req.webserver.currentView) + ' configuration reset.';
    res.redirect('/config');
}

module.exports = {
    render,
    save,
    reset
}
