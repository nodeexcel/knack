var tools = require('../tools/tools.js')
var express = require('express')
var db=require('../db.js')
var router = express.Router()

/** /api_call **/
router.get('/', function (req, res) {

       tools.refreshTokens().then(function(newToken) {
          
            res.json({status:true}); 
        }).catch((err)=>{
          db.knack_session.remove({}).then(()=>{            
          res.json({status:false})
          })
        })
})

module.exports = router
