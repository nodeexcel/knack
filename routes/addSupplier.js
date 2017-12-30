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
                    "Line1": req.body.AddressStreet,
                    "City": req.body.city,
                    "Country": req.body.country,
                    "CountrySubDivisionCode": req.body.Province,
                    "PostalCode": req.body.postalcode 
                },
                "AcctNum": req.body.accountnumber,
                "CompanyName": req.body.Company,
                "DisplayName": req.body.Company,
                "TermRef":{
                  "name" :req.body.terms
                },
                "PrimaryPhone": {
                    "FreeFormNumber": req.body.phone
                },
                "Mobile": {
                    "FreeFormNumber": req.body.cellnumber
                },
                "PrimaryEmailAddr": {
                    "Address": req.body.email
                }
            };
            getId.getTermId(req,res,req.body.terms).then((termref)=>{ 
              data.TermRef=termref;
              // Set up API call (with OAuth2 accessToken)
              var url = config.api_uri +  realmId + '/vendor'
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
                  tools.saveSupplierId(req.body.KnackId,response.body.Vendor.Id)
                  res.json(response.body)
                }, function (err) {
                  return res.json(err)
                })
              })
            }) 
       })
  });
  
})

module.exports = router
