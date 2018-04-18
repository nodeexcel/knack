var tools = require('./tools.js')
let CronJob = require("cron").CronJob;

module.exports = {
    updateAccessToken() {
        new CronJob("*/55 * * * *", function() {
            tools.refreshTokens().then(function(newToken) {
                console.log("success cron")
            }).catch((err) => console.log("error cron", err))
        }, null, true);
    }
}