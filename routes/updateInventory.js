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
            tools.fetchItemId(req.body.KnackID, req.body.Name).then((itemId) => {
                if (itemId.id)
                    var query = `select * from Item  where Id = '` + itemId.id + `'`;
                else
                    var query = `select * from Item  where Name = '` + itemId.name + `'`
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
                            "IncomeAccountRef": {
                                "name": req.body.IncomeAccountRefName
                            },
                            "ExpenseAccountRef": {
                                "name": req.body.ExpenseAccountRefName
                            },
                            "AssetAccountRef": {
                                "name": req.body.AssetAccountRefName
                            },
                            "Type": req.body.Type,
                            "TrackQtyOnHand": req.body.TrackQtyOnHand,
                            "QtyOnHand": req.body.QtyOnHand,
                            "InvStartDate": req.body.InvStartDate,
                            "PurchaseCost": req.body.PurchaseCost,
                            "UnitPrice": req.body.UnitPrice,
                            "PurchaseDesc": req.body.PurchaseDesc
                        };

                        let resBody = (JSON.parse(response.body))
                        console.log(resBody.QueryResponse.Item[0].Id, "pppppppppppppppppppppppppppppppppppppppppppppppp")
                        if (!itemId.id) {
                            tools.saveItemId(req.body.KnackID, resBody.QueryResponse.Item[0].Id)
                        }
                        data.SyncToken = resBody.QueryResponse.Item[0].SyncToken;
                        data.Id = resBody.QueryResponse.Item[0].Id;

                        getId.getIncomeAccountRef(req, res).then((incomeAccountRef) => {
                            data.IncomeAccountRef = incomeAccountRef;
                            getId.getExpenseAccountRef(req, res).then((expenseAccountRef) => {
                                data.ExpenseAccountRef = expenseAccountRef;
                                getId.getAssetAccountRef(req, res).then((assetAccountRef) => {
                                    data.AssetAccountRef = assetAccountRef

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
                                }).catch(err => console.log(err))
                            }).catch(err => console.log(err))
                        }).catch(err => console.log(err))
                    })
                })
            })
        })
    }).catch((err) => { res.status(400).json({ message: "Invalid Information" }) })
})

module.exports = router