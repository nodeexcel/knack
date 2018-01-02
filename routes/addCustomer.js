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
                "Notes": req.body.Notes,
                //"TaxRegistrationNumber":req.body.TaxRegNo,
                "PaymentMethodRef":{
                  "name":req.body.PaymentMethod
                } ,
                "SalesTermRef":{
                  "name" :req.body.Terms
                },
                "PreferredDeliveryMethod": "None",
                "CompanyName": req.body.CompanyName,
                // "CurrencyRef": {
                //       "value": "CAD",
                //       "name": "Canadian Dollar"
                // },
                "DisplayName": req.body.CompanyName,
                "PrimaryPhone": {
                    "FreeFormNumber": req.body.Contacts
                },
                "PrimaryEmailAddr": {
                    "Address": req.body.BillingEmail
                }
            };
         getId.getPaymentMethodId(req,res,req.body.PaymentMethod).then((paymentMethodref)=>{
            data.PaymentMethodRef=paymentMethodref;
              getId.getTermId(req,res,req.body.Terms).then((termref)=>{ 
                data.SalesTermRef=termref;
                // Set up API call (with OAuth2 accessToken)
                var url = config.api_uri +  realmId + '/customer'
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
                      return res.json({error: err, statusCode: response.statusCode,response:response.body})
                    }
                    // API Call was a success!
                    tools.saveCustomerId(req.body.KnackID,response.body.Customer.Id)
                    res.json(response.body)
                  }, function (err) {
                    return res.json(err)
                  })
                })
              }).catch(err=>console.log(err))
          }).catch(err=>console.log(err))  
       })
  });
  
})

module.exports = router
