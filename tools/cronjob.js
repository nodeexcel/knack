var tools = require('./tools.js')
let CronJob = require("cron").CronJob;

module.exports = {
    updateAccessToken() {
        new CronJob("*/01 * * * *", function() {
            console.log("cron testttttt")
            tools.refreshTokens().then(function(newToken) {
                console.log("success", newToken)
            }).catch((err) => console.log("error", err))
        }, null, true);
    }
}