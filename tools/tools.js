var Tokens = require('csrf')
var csrf = new Tokens()
var ClientOAuth2 = require('client-oauth2')
var request = require('request')
var config = require('../config.json')
var db=require('../db.js')

var Tools = function () {
  var tools = this;

  var authConfig = {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri
  }

  this.basicAuth = require('btoa')(authConfig.clientId + ':' + authConfig.clientSecret)

  // Use a local copy for startup.  This will be updated in refreshEndpoints() to call:
  // https://developer.api.intuit.com/.well-known/openid_configuration/
  this.openid_configuration = require('./openid_configuration.json')

  // Should be called at app start & scheduled to run once a day
  // Get the latest OAuth/OpenID endpoints from Intuit
  this.refreshEndpoints = function() {
    request({
      // Change this to Sandbox or non-sandbox in `config.json`
      // Non-sandbox: https://developer.api.intuit.com/.well-known/openid_configuration/
      // Sandbox: https://developer.api.intuit.com/.well-known/openid_sandbox_configuration/
      url: config.configurationEndpoint,
      headers: {
        'Accept': 'application/json'
      }

    }, function(err, response) {
      if(err) {
        console.log(err)
        return err
      }

      // Update endpoints
      var json = JSON.parse(response.body)
      tools.openid_configuration = json
      tools.openid_uri = json.userinfo_endpoint
      tools.revoke_uri = json.revocation_endpoint

      // Re-create OAuth2 Client
      authConfig.authorizationUri = json.authorization_endpoint
      authConfig.accessTokenUri = json.token_endpoint
      tools.intuitAuth = new ClientOAuth2(authConfig)
    })
  }

  // Should be used to check for 401 response when making an API call.  If a 401
  // response is received, refresh tokens should be used to get a new access token,
  // and the API call should be tried again.
  this.checkForUnauthorized = function(req, requestObj, err, response) {
    return new Promise(function (resolve, reject) {
      if(response.statusCode == 401) {
        console.log('Received a 401 response!  Trying to refresh tokens.')

        // Refresh the tokens
        tools.refreshTokens().then(function(newToken) {
          // Try API call again, with new accessToken
          requestObj.headers.Authorization = 'Bearer ' + newToken.accessToken
          console.log('Trying again, making API call to: ' + requestObj.url)
          request(requestObj, function (err, response) {
            // Logic (including error checking) should be continued with new
            // err/response objects.
            resolve({err, response})
          })
        }, function(err) {
          console.log('new token failed to generate');
          // Error refreshing the tokens
          reject(err)
        })
      } else {
        // No 401, continue!
        resolve({err, response})
      }
    })
  }

  // Refresh Token should be called if access token expires, or if Intuit
  // returns a 401 Unauthorized.
  this.refreshTokens = function() {
    return new Promise(function (resolve, reject) {
     tools.getToken().then((token)=> {
      // Call refresh API
     token.refresh().then(function(newToken) {
        // Store the new tokens
         tools.saveToken(newToken).then( () => {
          resolve(newToken);
        })  
      }).catch((err)=>reject(err))
    }).catch((err)=>reject(err))
   })
  }

  this.setScopes = function(flowName) {
    authConfig.scopes = config.scopes[flowName]
    tools.intuitAuth = new ClientOAuth2(authConfig)
  }

  this.containsOpenId = function() {
    if(!authConfig.scopes) return false;
    return authConfig.scopes.includes('openid')
  }

  // Setup OAuth2 Client with values from config.json
  this.intuitAuth = new ClientOAuth2(authConfig)

  // Get anti-forgery token to use for state
  this.generateAntiForgery = function(session) {
    session.secret = csrf.secretSync()
    return csrf.create(session.secret)
  }

  this.verifyAntiForgery = function(session, token) {
    return csrf.verify(session.secret, token)
  }

  this.clearToken = function() {
    db.knack_session.remove({}).exec((err,data)=> {
        if(err){
           console.log(err)
        }else{
          console.log("success")
        }
    })
    // session.accessToken = null
    // session.refreshToken = null
    // session.tokenType = null
    // session.data = null
  }

  // Save token into session storage
  // In a real use-case, this is where tokens would have to be persisted (to a
  // a SQL DB, for example).  Both access tokens and refresh tokens need to be
  // persisted.  This should typically be stored against a user / realm ID, as well.
  this.saveToken = function(token , realmId) {
    return db.knack_session.find({}).exec((err,data)=> {
      if(data.length){
        db.knack_session.update({_id:data[0]._id},
          { $set:
           { 
           "accessToken": token.accessToken,
           "refreshToken": token.refreshToken,
           "tokenType": token.tokenType,
           "data": token.data,
           "realmId" : realmId
          }
        })
        console.log('updating token');
      }else{
       let session_info = new db.knack_session({
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            tokenType: token.tokenType,
            data: token.data,
            realmId : realmId
           })
           session_info.save((err, data)=> {
               if (err) {
                  console.log(err)
               } else
                  console.log("session saved")
              })
      }  
    })
    
    // session.accessToken = token.accessToken
    // session.refreshToken = token.refreshToken
    // session.tokenType = token.tokenType
    // session.data = token.data
  }
  this.getRelmId = function() {
    return new Promise( (resolve, reject)=> {
      db.knack_session.findOne({}).exec((err,data)=>{
        if(err){
          reject(err)
        }else{
          if(data){
            data = JSON.parse(JSON.stringify(data));
            resolve(data.realmId)
          }else{
           reject("data not found");
          }
        }
      })
    })
  }
  // Get the token object from session storage
  this.getToken = function() {
    return new Promise( (resolve, reject)=> {
      db.knack_session.findOne({}).exec((err,data)=>{
        if(err){
          reject(err)
        }else{
          if(data){
            data = JSON.parse(JSON.stringify(data));
            resolve(tools.intuitAuth.createToken(
              data.accessToken, data.refreshToken,
              data.tokenType, data.data
            ))
             console.log('get token resolved')
          }else{
           reject("data not found");
          }
        }
      })
    })
    // if(!session.accessToken) return null

    // return tools.intuitAuth.createToken(
    //   session.accessToken, session.refreshToken,
    //   session.tokenType, session.data
    // )
  }
  this.saveItemId = function(KnackId,ItemId) {
    let idsInfo = new db.storedItemIds({
            quickbookId:ItemId,
            knackId: KnackId
           })
           idsInfo.save((err, data)=> {
               if (err) {
                  console.log(err)
               } else{
                  console.log("Ids saved")
               }
              })
  }
  this.saveCustomerId = function(KnackId,CustomerId) {
    let idsInfo = new db.storedCustomerIds({
            quickbookId:CustomerId,
            knackId: KnackId
           })
           idsInfo.save((err, data)=> {
               if (err) {
                  console.log(err)
               } else{
                  console.log("Ids saved")
               }
              })
  }
  this.saveSupplierId = function(KnackId,SupplierId) {
    let idsInfo = new db.storedSupplierIds({
            quickbookId:SupplierId,
            knackId: KnackId
           })
           idsInfo.save((err, data)=> {
               if (err) {
                  console.log(err)
               } else{
                  console.log("Ids saved",req.body.KnackId)
               }
              })
  }
  this.fetchItemId = function(KnackId) {
     return new Promise( (resolve, reject)=> {
      db.storedItemIds.findOne({knackId:KnackId}).exec((err,data)=>{
        if(err){
          reject(err)
        }else{
          if(data){
            data = JSON.parse(JSON.stringify(data));
            resolve(data.quickbookId); 
          }else{
           reject("data not found");
          }
        }
      })
    })
  }
  this.fetchCustomerId = function(KnackId) {
     return new Promise( (resolve, reject)=> {
      db.storedCustomerIds.findOne({knackId:KnackId}).exec((err,data)=>{
        if(err){
          reject(err)
        }else{
          if(data){
            data = JSON.parse(JSON.stringify(data));
            resolve(data.quickbookId); 
          }else{
           reject("data not found");
          }
        }
      })
    })
  }
  this.fetchSupplierId = function(KnackId) {
     return new Promise( (resolve, reject)=> {
      db.storedSupplierIds.findOne({knackId:KnackId}).exec((err,data)=>{
        if(err){
          reject(err)
        }else{
          if(data){
            data = JSON.parse(JSON.stringify(data));
            resolve(data.quickbookId); 
          }else{
           reject("data not found");
          }
        }
      })
    })
  }

  this.refreshEndpoints()
}

module.exports = new Tools();
