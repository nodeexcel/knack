// var tools = require('../tools/tools.js')
// var getId = require('../tools/getId.js')
// var config = require('../config.json')
// var request = require('request')
// var express = require('express')
// var router = express.Router()



// router.post('/', function (req, res) {
//   let token ;

//   tools.getRelmId().then( (realmId) => {
//         tools.getToken().then((fetchedToken)=>{
//            token=fetchedToken;
//         if(!token) return res.json({error: 'Not authorized'})
//         if(!realmId) return res.json({
//           error: 'No realm ID.  QBO calls only work if the accounting scope was passed!'
//         })
//         var data =  {
//           "Name": req.body.Name,
//           "Sku": req.body.Sku,
//           "Description" :req.body.Description,
//           "QtyOnHand":req.body.QtyOnHand,
//           "InventoryAdjustmentAccountRef": "Inventory Adjustments / Allowances",
//           "AdjustmentDate": new Date()

//           };
//                         var url = config.api_uri +  realmId + '/item'
//                         console.log('Making API call to: ' + url )
//                         console.log("data",data)
//                         var requestObj = {
//                           url: url,
//                           method:"POST",
//                           json:data,
//                           headers: {
//                             'Authorization': 'Bearer ' + token.accessToken
//                           }
//                         }

//                         // Make API call
//                         request(requestObj, function (err, response) {
//                           // Check if 401 response was returned - refresh tokens if so!
//                           tools.checkForUnauthorized(req, requestObj, err, response).then(function ({err, response}) {
//                             if(err || response.statusCode != 200) {
//                               return res.json({error: err, statusCode: response.statusCode,response:response.body})
//                             }
//                             // API Call was a success!
//                             tools.saveId(req.body.KnackID,response.body.Item.Id)
//                             res.json(response.body)
//                           }, function (err) {
//                             return res.json(err)
//                           })
//                         })
//      })
//   });

// })

// module.exports = router
var tools = require('../tools/tools.js')
var getId = require('../tools/getId.js')
var config = require('../config.json')
var request = require('request')
var express = require('express')
var router = express.Router()



router.post('/', function(req, res) {
    let token;
    tools.getRelmId().then((realmId) => {
        tools.getToken().then((fetchedToken) => {
            token = fetchedToken;
            if (!token) return res.json({ error: 'Not authorized' })
            if (!realmId) return res.json({
                error: 'No realm ID.  QBO calls only work if the accounting scope was passed!'
            })
            // Set up API call (with OAuth2 accessToken)
            tools.fetchItemId(req.body.KnackID).then((itemId) => {
                var query = `select * from Item  where Id = '` + itemId + `'`;
                var url = config.api_uri + realmId + '/query?query=' + query;
                console.log('Making API call to: ' + url)
                var requestObj = {
                    url: url,
                    method: "GET",
                    headers: {
                        'Authorization': 'Bearer ' + token.accessToken,
                        'content-type': 'application/json',
                        'Accept': 'application/json',
                    }
                }

                // Make API call
                request(requestObj, function(err, response) {
                    // Check if 401 response was returned - refresh tokens if so!
                    tools.checkForUnauthorized(req, requestObj, err, response).then(function({ err, response }) {
                        if (err || response.statusCode != 200) {
                            return res.json({ error: err, statusCode: response.statusCode, error: response.body })
                        }
                        // API Call was a success!
                        var data = {
                            "Name": req.body.Name,
                            "Sku": req.body.Sku,
                            "Description": req.body.Description,
                            "QtyOnHand": req.body.QtyOnHand,
                            //"InventoryAdjustmentAccount": "Inventory Adjustments / Allowances",
                            "InvStartDate": "2018-01-05"
                        };

                        let resBody = (JSON.parse(response.body))
                        data.SyncToken = resBody.QueryResponse.Item[0].SyncToken;
                        data.Id = resBody.QueryResponse.Item[0].Id;

                        var url = config.api_uri + realmId + '/item?operation=update'
                        console.log('Making API call to: ' + url)
                        console.log(data)
                        var requestObj = {
                            url: url,
                            method: "POST",
                            json: data,
                            headers: {
                                'Authorization': 'Bearer ' + token.accessToken
                            }
                        }

                        // Make API call
                        request(requestObj, function(err, response) {
                            // Check if 401 response was returned - refresh tokens if so!
                            tools.checkForUnauthorized(req, requestObj, err, response).then(function({ err, response }) {
                                if (err || response.statusCode != 200) {
                                    return res.json({ error: err, statusCode: response.statusCode, error: response.body })
                                }
                                // API Call was a success!
                                res.json(response.body)
                            }, function(err) {
                                return res.json(err)
                            })
                        })
                    })
                })
            })
        })
    })
})

module.exports = router