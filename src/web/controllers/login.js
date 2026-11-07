const bcrypt = require('bcryptjs');
const JWT = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/keys');

const signToken = (username, rememberme) => {
    return JWT.sign({user: username}, JWT_SECRET, {
        expiresIn: rememberme === 'true' ? '30d' : '30m',
        algorithm: 'HS256'
    });
}

const render = async (req, res) => {
    res.render('login', {
        title: 'Mellow Login',
        successMsg: this.successMsg,
        errorMsg: this.errorMsg
    });
}

const login = async (req, res) => {
    const { username, password, rememberme } = req.body;
    const general = req.webserver.WebDatabase.config['general'];
    if (typeof username === 'string' && typeof password === 'string' &&
        username === general.username && await bcrypt.compare(password, general.password)) {
        const token = signToken(username, rememberme);
        res
        .status(200)
        .cookie('token', token, {
            maxAge: (rememberme === 'true' ? 30 * 24 * 60 : 30) * 60 * 1000,
            httpOnly: true,
            sameSite: 'lax'
        })
        .redirect('/config');
    }
    else {
        res
        .render('login', {
            title: 'Mellow Login',
            errorMsg: 'Login failed! Username or password incorrect.',
            successMsg: ''
        });
    }
}

const logout = async (req, res) => {
    res
    .status(200)
    .clearCookie('token', { httpOnly: true, sameSite: 'lax' })
    .redirect('/login');
}

module.exports = {
    render,
    login,
    logout
}
