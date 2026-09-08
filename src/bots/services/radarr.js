const buildRadarrMovie = require('../../api/helpers/radarr.js');

module.exports = class SonarrService {
    constructor (client) {
        this.client = client;
    }

    doesMovieExist(tmdbId) {
        return new Promise((resolve, reject) => {
            this.client.api.radarr.getMovies().then((movies) => {
                const fMovies = movies.filter((e) => e.tmdbId === tmdbId);
                if (fMovies.length > 0)
                    resolve(true);
                else
                    resolve(false);
            }).catch((err) => {
                console.error('Radarr movie availability check failed:', err);
                reject(err);
            });
        });
    }

    movieLookup(msg, searchQuery) {
        return new Promise((resolve, reject) => {
            this.client.api.radarr.movieLookup(searchQuery).then(async (data) => {
                if (data.length > 1) {
                    const aMsg = await this.client.send(msg, this.client.builder.buildRadarrMovieResults(this.client.config.selection, data));
                    const selection = await this.client.awaitSelection(msg, aMsg, data.length);
                    if (selection !== -1) {
                        this.client.api.radarr.movieLookup(`tmdb:${data[selection].tmdbId}`).then((oMovie) => {
                            this.doesMovieExist(oMovie.tmdbId).then((status) => {
                                Object.assign(oMovie, { doesExist: status });
                                resolve(oMovie);
                            }).catch(() => {
                                reject('There was an error in checking for movie availability.');
                            });
                        }).catch((err) => {
                            console.error('Radarr TMDB lookup failed:', err);
                            reject('Something went wrong! Couldn\'t find movie.');
                        });
                    } else {
                        reject('Please enter a valid selection!');
                    }
                } else if (!data.length) {
                    reject('Something went wrong! Couldn\'t find any movie.');
                } else {
                    this.client.api.radarr.movieLookup(`tmdb:${data[0].tmdbId}`).then((oMovie) => {
                        this.doesMovieExist(oMovie.tmdbId).then((status) => {
                            Object.assign(oMovie, { doesExist: status });
                            resolve(oMovie);
                        }).catch(() => {
                            reject('There was an error in checking for movie availability.');
                        })
                    }).catch((err) => {
                        console.error('Radarr TMDB lookup failed:', err);
                        reject('Something went wrong! Couldn\'t find movie.');
                    });
                }
            }).catch((err) => {
                console.error(`Radarr movie lookup failed for ${JSON.stringify(searchQuery)}:`, err);
                reject('Something went wrong! Couldn\'t find any movie.');
            });
        });
    }

    addMovie(msg, msgEmbed, movie) {
        const newMovie = buildRadarrMovie(movie, this.client.db.config['radarr']);
        if (typeof newMovie === "string") {
            return this.client.reply(msg, newMovie);
        }
        if ((!this.client.config.requestmovie
            || msg.member.roles.cache.some(role => role.name.toLowerCase() === this.client.config.requestmovie.toLowerCase()))
            && !movie.doesExist) {
            this.client.reply(msg, 'If you want to add this movie please click on the ⬇ reaction.');
            msgEmbed.react('⬇');

            this.client.awaitRequest(msg, msgEmbed).then(() => {
                this.client.api.radarr.addMovie(newMovie).then(() => {
                    return this.client.reply(msg, `Added ${movie.title} in Radarr.`);
                }).catch((err) => {
                    console.error(`Radarr add failed for TMDB ID ${movie.tmdbId || 'unknown'}:`, err);
                    return this.client.reply(msg, 'Something went wrong! Couldn\'t request movie.');
                });
            }).catch((err) => {
                console.error('Radarr request confirmation failed:', err);
            });
        }
    }

    async run(msg, searchQuery) {
        this.client.deleteCommandMessages(msg);
        this.movieLookup(msg, searchQuery).then(async (movie) => {
            const msgEmbed = await this.client.send(msg, this.client.builder.buildRadarrMovieEmbed(msg, movie));
            return this.addMovie(msg, msgEmbed, movie);
        }).catch((err) => {
            console.error('Radarr command failed:', err);
            const errorMessage = (err instanceof Error) ? err.message : String(err || 'Something went wrong.');
            return this.client.reply(msg, errorMessage);
        });
    }
}
