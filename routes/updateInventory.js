var tools = require('../tools/tools.js')
var config = require('../config.json')
var request = require('request')
var express = require('express')
var router = express.Router()
 


router.post('/', function (req, res) {
  let token ;

  tools.getRelmId().then( (realmId) => {
        tools.getToken().then((fetchedToken)=>{
           token=fetchedToken;
        if(!token) return res.json({error: 'Not authorized'})
        if(!realmId) return res.json({
          error: 'No realm ID.  QBO calls only work if the accounting scope was passed!'
        })
        // Set up API call (with OAuth2 accessToken)
         var url = config.api_uri +  realmId + '/item/'+req.body.entityId
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
            let data={
                        "Name": "A updated Raww",
                       // "Active": true,
                        // "FullyQualifiedName": "A updated B",
                        // "Taxable": false,
                        // "UnitPrice": 0,
                       // "Type": "Inventory",
                        "IncomeAccountRef": {
                            "value": "79",
                            "name": "Sales of Product Income"
                        },
                        // "PurchaseCost": 0,
                        "ExpenseAccountRef": {
                            "value": "80",
                            "name": "Cost of Goods Sold"
                        },
                        // "AssetAccountRef": {
                        //     "value": "81",
                        //     "name": "Inventory Asset"
                        // },
                       // "TrackQtyOnHand": true,
                        // "QtyOnHand": 10,
                        // "InvStartDate": "2015-01-01",
                       // "domain": "QBO",
                       // "sparse": false,
                        "Id": req.body.entityId,
                        //"SyncToken": "0",
                        // "MetaData": {
                        //     "CreateTime": "2017-12-26T03:54:25-08:00",
                        //     "LastUpdatedTime": "2017-12-26T03:54:25-08:00"
                        // }
                      }
                                  // res.json(JSON.parse(response.body))
                     let resBody=(JSON.parse(response.body))
                       data.SyncToken=resBody.Item.SyncToken;
                      // console.log(resBody)
            // data.SyncToken=(response.body.split('SyncToken>')[1]).substr(0, ((response.body.split('SyncToken>')[1]).length - 2))
              //console.log(data)
            //res.json({response:resBody.Item.SyncToken})
            var url = config.api_uri +  realmId + '/item?operation=update'
            console.log('Making API call to: ' + url )
            var requestObj = {
              url: url,
              method:"POST",
              json:data,
              headers: {
                'Authorization': 'Bearer ' + token.accessToken
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
                res.json(response.body)
              }, function (err) {
                return res.json(err)
              })
            })
          }, function (err) {
            return res.json(err)
          })
        })
        })
  });
  
})

module.exports = router
