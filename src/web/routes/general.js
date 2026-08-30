const config = require('../controllers/config.js');
const general = require('../controllers/general.js');
const router = require('express-promise-router')();
const passport = require('passport');
const passStrats = require('../config/passport.js');
const passJwt = passport.authenticate('userJwt', { session: false, failureRedirect: '/login' });

router.route('/').post(passJwt, config.save);
router.route('/status').get(general.status);

module.exports = router;
