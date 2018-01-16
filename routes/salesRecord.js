var tools = require('../tools/tools.js')
var getId = require('../tools/getId.js')
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
        var data =  {
                "BillAddr": {
                    "Line1": req.body.BillingStreet,
                    "City": req.body.BillingCity,
                    "Country": req.body.BillingCountry,
                    "CountrySubDivisionCode": req.body.BillingProvince,
                    "PostalCode": req.body.BillingPostalCode
                },
                "Line": [{
                    "Id": "1",
                    "LineNum": 1,
                    "Description": req.body.Description,
                    "Amount":req.body.Amounts,
                    "DetailType": "SalesItemLineDetail",
                    "SalesItemLineDetail": {
                        // "ItemRef": {
                        //     "value": "5",
                        //     "name": "Rock Fountain"
                        // },
                        //"UnitPrice": req.body.Price,
                        //"Qty":req.body.Quantity,
                        "TaxCodeRef": {
                            "name": req.body.taxCode
                        }
                    }
                }]
                //"BillEmail":req.body.BillEmail,
               //  "ShipAddr": {
               //      "Line1": req.body.ShippingStreet,
               //      "City": req.body.ShippingCity,
               //      "Country": req.body.ShippingCountry,
               //      "CountrySubDivisionCode": req.body.ShippingProvince,
               //      "PostalCode": req.body.ShippingPostalCode
               //  },
               //  // "CustomerRef": {
               //  //     "name": req.body.customer
               //  // },
               // // "DueDate": req.body.dueDate,
               // // "TxnDate": req.body.invoiceDate,
                // "SalesTermRef":{
                //   "name" :req.body.Terms
                // },
               //  "ShipMethodRef":{
               //    "id":req.body.shipVia
               //  },
                // "ShipDate":{
                //   "date":req.body.shippindDate
                // },
                // "TrackingNum":req.body.trackingNum,
                // "PrivateNote":req.body.invoiceNotes,
                // "GlobalTaxCalculation":req.body.taxCode
                // "CustomField": [{
                //     "DefinitionId": "1",
                //     "Name": "Sales Rep",
                //     "Type": "StringType",
                //     "StringValue":req.body.salesRep
                // },{
                //     "DefinitionId": "2",
                //     "Name": "Purchaser",
                //     "Type": "StringType",
                //     "StringValue":req.body.companyName
                // },{
                //     "DefinitionId": "3",
                //     "Name": "P.O. No./Tag",
                //     "Type": "StringType",
                //     "StringValue":req.body.orderNumber
                // }]
               // "CompanyName": req.body.CompanyName
            };
          // getId.getCustomerId(req,res,req.body.customer).then((customerref)=>{
          //   data.CustomerRef=customerref;
              getId.ItemId(req,res,req.body.SKU).then((itemref)=>{
                data.Line[0].SalesItemLineDetail.ItemRef=itemref;
                  getId.getTermId(req,res,req.body.Terms).then((termref)=>{ 
                    data.SalesTermRef=termref;
                      // Set up API call (with OAuth2 accessToken)
                      var url = config.api_uri +  realmId + '/invoice?minorversion=14'
                      console.log('Making API call to: ' + url )
                      console.log(data)
                      console.log(data.Line[0].SalesItemLineDetail)
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
                            return res.json({error: err, statusCode: response.statusCode,response:response.body})
                          }
                          // API Call was a success!
                          //tools.saveCustomerId(req.body.KnackID,response.body.Customer.Id)
                          res.json(response.body)
                        }, function (err) {
                          return res.json(err)
                        })
                      })
                 }).catch(err=>console.log(err))    
              //}).catch(err=>console.log(err))
          }).catch(err=>console.log(err))  
       })
  });
  
})

module.exports = router
