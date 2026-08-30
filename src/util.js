const Promise = require('bluebird');
const url = require('url');

const capitalizeFirstLetter = function (string) {
	return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

const momentFormat = function (date, client) {
	const moment = require('moment');

	return moment(date).format(`MMMM Do YYYY [at] ${client.provider.get('global', 'timeformat', '24') === '24' ? 'HH:mm:ss' : 'hh:mm:ss A'} [UTC]Z`);
}

const get = async function(options) {
    let body;
    try {
        const result = await fetch(options.url, {
            method: 'GET',
            headers: options.headers
        });
        body = await result.text();
        const response = {
            statusCode: result.status,
            headers: Object.fromEntries(result.headers.entries())
        };
        if (response.statusCode === 200) return {response, body};

        // return a status code to help with diagnosing api failures
        throw {error: null, body, 'statusCode': response.statusCode};
    } catch (error) {
        if (error && error.statusCode) throw error;
        throw {error, body};
    }
}

const post = async function(options) {
    let body;
    try {
        const result = await fetch(options.url, {
            method: 'POST',
            headers: options.headers,
            body: options.body
        });
        body = await result.text();
        const response = {
            statusCode: result.status,
            headers: Object.fromEntries(result.headers.entries())
        };
        if (response.statusCode < 300) return {error: null, response, body};
        throw {error: null, body, 'statusCode': response.statusCode};
    } catch (error) {
        if (error && error.statusCode) throw error;
        throw {error, body};
    }
}

const checkURLPrefix = function(url) {
    if (/https?:\/\//.exec(url)) {
        return true;
    } else {
	return false;
    }
}

const getURL = function(host, port, ssl, args) {
    return url.parse(`${(ssl === 'true') ? 'https://' : 'http://'}` +
        `${(host.match(/^http(s)?:\/\//)) ? host.split('//')[1] : host}` +
        `${(port) ? `:${port}` : ''}` +
        `${args}`).href;
}


const ucwords = function(str) {
    return (str + '')
        .replace(/^(.)|\s+(.)/g, function ($1) {
            return $1.toUpperCase();
        })
}

const replacePlaceholders = function(str, placerholders) {
    return str.replace(/%\w+%/g, (all) => {
        return placerholders[all] || all;
    });
}

module.exports = {
    checkURLPrefix,
    getURL,
	capitalizeFirstLetter,
	momentFormat,
	get,
    post,
    ucwords,
    replacePlaceholders
};
