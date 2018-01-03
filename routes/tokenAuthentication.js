var tools = require('../tools/tools.js')
var express = require('express')
var router = express.Router()

/** /api_call **/
router.get('/', function (req, res) {

       tools.refreshTokens().then(function(newToken) {
          
            res.json({status:true}); 
        }).catch((err)=>res.json({status:false}))
})

module.exports = router
