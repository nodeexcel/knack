var tools = require('../tools/tools.js')
var getId = require('../tools/getId.js')
var config = require('../config.json')
var request = require('request')
var express = require('express')
var router = express.Router()
var moment = require('moment')
router.post('/', function(req, res) {
    console.log(JSON.stringify(req.body), "bodyyyyyyyyyyyyyyyyyyyyyyyyyyyy")
    let token;
    req.body.taxCode = req.body.taxCode.replace(/'/g, "\\\'")
    tools.getRelmId().then((realmId) => {
        tools.getToken().then((fetchedToken) => {
            token = fetchedToken;
            if (!token) return res.json({ error: 'Not authorized' })
            if (!realmId) return res.json({
                error: 'No realm ID.  QBO calls only work if the accounting scope was passed!'
            })
            var data;

            var line = []


            var invoicNoQuery = `select * from invoice  where DocNumber = '` + req.body.DocNumber + `'`;
            var url = config.api_uri + realmId + '/query?query=' + encodeURI(invoicNoQuery);
            console.log('Making API call to: ' + url)
            var invoicNoQueryrequestObj = {
                url: url,
                method: "GET",
                headers: {
                    'Authorization': 'Bearer ' + token.accessToken,
                    'content-type': 'application/json',
                    'Accept': 'application/json',
                }
            }

            // Make API call
            request(invoicNoQueryrequestObj, function(err, response) {
                // Check if 401 response was returned - refresh tokens if so!
                tools.checkForUnauthorized(req, invoicNoQueryrequestObj, err, response).then(function({ err, response }) {
                    if (err || response.statusCode != 200) {
                        return res.json({ error: err, statusCode: response.statusCode, error: response.body })
                    } else {
                        var pars = (JSON.parse(response.body))
                        if (pars.QueryResponse.Invoice && pars.QueryResponse.Invoice.length != 0) {
                            getId.getCustomerId(req, res, req.body.customer).then((customerref) => {
                                var inventory = req.body.inventory;
                                findInventory(inventory, function(response_item) {
                                    getId.ItemId(req, res, req.body.SKU).then((itemref) => {
                                        // getId.getTermId(req, res, req.body.Terms).then((termref) => {
                                        // Set up API call (with OAuth2 accessToken)
                                        getId.getTermId(req, res, req.body.SalesTermRef).then((terms_data) => {
                                            console.log(terms_data, "termsssssssssssssssssssssssssssssssssssssssssss")
                                            var url = config.api_uri + realmId + '/invoice?minorversion=14'
                                            console.log('Making API call to: ' + url)
                                            let date = req.body.DueDate.split('/')
                                            req.body.DueDate = date[2] + '/' + date[1] + '/' + date[0];
                                            date = req.body.ShipDate.split('/')
                                            req.body.ShipDate = date[2] + '/' + date[1] + '/' + date[0]
                                            data = {
                                                "Line": response_item,
                                                "DueDate": moment(req.body.DueDate).format('YYYY-MM-DD'),
                                                "CustomerRef": {
                                                    "value": customerref.value
                                                },
                                                'DocNumber': req.body.DocNumber,
                                                'ShipAddr': req.body.ShipAddr,
                                                'ShipMethodRef': req.body.ShipMethodRef,
                                                'TotalAmt': req.body.TotalAmt,
                                                'ShipDate': moment(req.body.ShipDate).format('YYYY-MM-DD'),
                                                'TrackingNum': req.body.TrackingNum,
                                                'CustomField': req.body.CustomField,
                                                // "SalesTermRef": {
                                                //     "value": terms_data.value
                                                // },
                                                "CustomerMemo": { value: req.body.CustomerMemo },
                                                "Id": pars.QueryResponse.Invoice[0].Id,
                                                "SyncToken": pars.QueryResponse.Invoice[0].SyncToken,
                                                "MetaData": pars.QueryResponse.Invoice[0].MetaData
                                            }
                                            if (terms_data) {
                                                data['SalesTermRef'] = {
                                                    "value": terms_data.value
                                                }
                                            }
                                            console.log("======================", data, "lllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll")

                                            var requestObj = {
                                                url: url,
                                                method: "POST",
                                                json: data,
                                                headers: {
                                                    'Authorization': 'Bearer ' + token.accessToken
                                                }
                                            }
                                            console.log(data, "data hai")
                                            // Make API call
                                            request(requestObj, function(err, response) {
                                                // Check if 401 response was returned - refresh tokens if so!
                                                tools.checkForUnauthorized(req, requestObj, err, response).then(function({ err, response }) {
                                                    if (err || response.statusCode != 200) {
                                                        return res.json({ error: err, statusCode: response.statusCode, response: response.body })
                                                    }
                                                    // API Call was a success!
                                                    //tools.saveCustomerId(req.body.KnackID,response.body.Customer.Id)
                                                    res.json(response.body)
                                                }, function(err) {
                                                    return res.json(err)
                                                })
                                            })
                                            // }).catch(err => console.log(err))
                                        }).catch(err => console.log(err))
                                    })
                                })

                            }).catch(err => console.log(err))
                        } else {
                            getId.getCustomerId(req, res, req.body.customer).then((customerref) => {
                                var inventory = req.body.inventory;
                                findInventory(inventory, function(response_item) {
                                    getId.ItemId(req, res, req.body.SKU).then((itemref) => {
                                        // getId.getTermId(req, res, req.body.Terms).then((termref) => {
                                        // Set up API call (with OAuth2 accessToken)
                                        getId.getTermId(req, res, req.body.SalesTermRef).then((terms_data) => {
                                            var url = config.api_uri + realmId + '/invoice?minorversion=14'
                                            console.log('Making API call to: ' + url)
                                            let date = req.body.DueDate.split('/')
                                            req.body.DueDate = date[2] + '/' + date[1] + '/' + date[0];
                                            date = req.body.ShipDate.split('/')
                                            req.body.ShipDate = date[2] + '/' + date[1] + '/' + date[0]
                                            data = {
                                                "Line": response_item,
                                                "DueDate": moment(req.body.DueDate).format('YYYY-MM-DD'),
                                                "CustomerRef": {
                                                    "value": customerref.value
                                                },
                                                'DocNumber': req.body.DocNumber,
                                                'ShipAddr': req.body.ShipAddr,
                                                'ShipMethodRef': req.body.ShipMethodRef,
                                                'TotalAmt': req.body.TotalAmt,
                                                'ShipDate': moment(req.body.ShipDate).format('YYYY-MM-DD'),
                                                'TrackingNum': req.body.TrackingNum,
                                                'CustomField': req.body.CustomField,
                                                // "SalesTermRef": {
                                                //     "value": terms_data.value
                                                // },
                                                "CustomerMemo": { value: req.body.CustomerMemo }
                                            }
                                            if (terms_data) {
                                                data['SalesTermRef'] = {
                                                    "value": terms_data.value
                                                }
                                            }

                                            console.log("======================", data, "lllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll")
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
                                                        return res.json({ error: err, statusCode: response.statusCode, response: response.body })
                                                    }
                                                    // API Call was a success!
                                                    //tools.saveCustomerId(req.body.KnackID,response.body.Customer.Id)
                                                    res.json(response.body)
                                                }, function(err) {
                                                    return res.json(err)
                                                })
                                            })
                                            // }).catch(err => console.log(err))
                                        }).catch(err => console.log(err))
                                    })
                                })

                            }).catch(err => console.log(err))
                        }
                    }
                })
            })





            function findInventory(inventory, callback) {
                let sku = inventory.splice(0, 1)[0]
                getId.ItemId(req, res, sku.field_281_raw[0].identifier).then((itemref) => {
                    console.log(itemref, "ppppppppppppppppppppp")

                    var taxCodeQuery = `select * from taxCode  where Name = '` + req.body.taxCode + `'`;
                    var url = config.api_uri + realmId + '/query?query=' + escape(taxCodeQuery);
                    console.log('Making API call to: ' + url)
                    var taxCodeQueryrequestObj = {
                        url: url,
                        method: "GET",
                        headers: {
                            'Authorization': 'Bearer ' + token.accessToken,
                            'content-type': 'application/json',
                            'Accept': 'application/json',
                        }
                    }
                    request(taxCodeQueryrequestObj, function(err, response) {
                        // Check if 401 response was returned - refresh tokens if so!
                        tools.checkForUnauthorized(req, taxCodeQueryrequestObj, err, response).then(function({ err, response }) {
                            if (err || response.statusCode != 200) {
                                return res.json({ error: err, statusCode: response.statusCode, error: response.body })
                            } else {
                                console.log(response.body, "=================================")
                                var pars = (JSON.parse(response.body))
                                // if (pars.QueryResponse.Invoice && pars.QueryResponse.Invoice.length != 0) {
                                // console.log(pars.QueryResponse.TaxCode.Id, "iddddddddddddddddddddddddddddddddddddddddddddddd")
                                line.push({
                                    "Amount": sku.field_287_raw,
                                    "DetailType": "SalesItemLineDetail",
                                    "SalesItemLineDetail": {
                                        "ItemRef": {
                                            "value": itemref.value,
                                            "name": itemref.name
                                        },
                                        "TaxCodeRef": {
                                            "value": pars.QueryResponse.TaxCode ? pars.QueryResponse.TaxCode[0].Id : "5"
                                        },
                                        "Qty": sku.field_286_raw,
                                        "UnitPrice": sku.field_285_raw
                                    },
                                    "Description": sku.field_339
                                })
                                if (inventory.length) {
                                    findInventory(inventory, callback)
                                } else {
                                    if (req.body.shipping) {
                                        line.push(req.body.shipping)
                                        req.body.shipping.SalesItemLineDetail['TaxCodeRef'] = { value: pars.QueryResponse.TaxCode ? pars.QueryResponse.TaxCode[0].Id : "5" }
                                    }
                                    callback(line)
                                }
                            }
                        })
                    })
                })
            }
        })
    });

})

module.exports = router