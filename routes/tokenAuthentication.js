var tools = require('../tools/tools.js')
var express = require('express')
var router = express.Router()

/** /api_call **/
router.get('/', function (req, res) {

       tools.refreshTokens().then(function(newToken) {
         
            res.json({error:0,message:"token refreshed"}); 
        }, function(err) {
          // Error refreshing the tokens
          res.json({error:1,error:err}); 
        })
})

module.exports = router
