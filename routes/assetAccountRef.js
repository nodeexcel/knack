var tools = require('../tools/tools.js')
var config = require('../config.json')
var request = require('request')
var express = require('express')
var router = express.Router()
 


router.get('/', function (req, res) {
  let token ;

  tools.getRelmId().then( (realmId) => {
        tools.getToken().then((fetchedToken)=>{
           token=fetchedToken;
        if(!token) return res.json({error: 'Not authorized'})
        if(!realmId) return res.json({
          error: 'No realm ID.  QBO calls only work if the accounting scope was passed!'
        })
        // Set up API call (with OAuth2 accessToken)
        var query=`select * from Account  where Classification = 'Asset'`
        var url = config.api_uri +  realmId + '/query?query='+ query;
        console.log('Making API call to: ' + url )
        var requestObj = {
          url: url,
          method:"GET",
          headers: {
            'Authorization': 'Bearer ' + token.accessToken,
            'content-type':  'application/json',
            'Accept' :  'application/json',
          }
        }

        // Make API call
        request(requestObj, function (err, response) {
          // Check if 401 response was returned - refresh tokens if so!
          tools.checkForUnauthorized(req, requestObj, err, response).then(function ({err, response}) {
            if(err || response.statusCode != 200) {
              return res.json({error: err, statusCode: response.statusCode,error:response.body})
            }
            // API Call was a success!
            res.json(JSON.parse(response.body))
          }, function (err) {
            return res.json(err)
          })
        })
     })
  });
  
})

module.exports = router
