var tools = require('../tools/tools.js')
var config = require('../config.json')
var request = require('request')
var express = require('express')
var router = express.Router()

/** /api_call **/
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
        var url = config.api_uri + realmId + '/companyinfo/' + realmId
        console.log('Making API call to: ' + url)
        var requestObj = {
          url: url,
          headers: {
            'Authorization': 'Bearer ' + token.accessToken,
            'Accept': 'application/json'
          }
        }

        // Make API call
        request(requestObj, function (err, response) {
          // Check if 401 response was returned - refresh tokens if so!
          tools.checkForUnauthorized(req, requestObj, err, response).then(function ({err, response}) {
            if(err || response.statusCode != 200) {
              return res.json({error: err, statusCode: response.statusCode})
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

/** /api_call/revoke **/
router.get('/revoke', function (req, res) {
  let token ;
  //tools.clearToken()
  tools.getToken().then((fetchedToken)=>{
       token=fetchedToken;
    if(!token) return res.json({error: 'Not authorized'})

    var url = tools.revoke_uri
    request({
      url: url,
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + tools.basicAuth,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'token': token.accessToken
      })
    }, function (err, response, body) {
      if(err || response.statusCode != 200) {
        return res.json({error: err, statusCode: response.statusCode})
      }
      tools.clearToken()
      res.json({response: "Revoke successful"})
    })
  }).catch((err)=>console.log(err))
})

/** /api_call/refresh **/
// Note: typical use case would be to refresh the tokens internally (not an API call)
// We recommend refreshing upon receiving a 401 Unauthorized response from Intuit.
// A working example of this can be seen above: `/api_call`
router.get('/refresh', function (req, res) {
  let token ;
  tools.getToken().then((fetchedToken)=>{
     token=fetchedToken;
    if(!token) return res.json({error: 'Not authorized'})
    tools.refreshTokens().then(function(newToken) {
      // We have new tokens!
      res.json({
        accessToken: newToken.accessToken,
        refreshToken: newToken.refreshToken
      })
    }, function(err) {
      // Did we try to call refresh on an old token?
      console.log(err)
      res.json(err)
    })
  }).catch((err)=>console.log(err))
})

module.exports = router
