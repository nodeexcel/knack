var tools = require('./tools.js')
let CronJob = require("cron").CronJob;

module.exports = {
    updateAccessToken() {
        new CronJob("*/01* * * *", function() {
            console.log("cron testttttt")
        }, null, true);
    }
}