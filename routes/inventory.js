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
        var data =  {
          "Name":/* "A" ,//*/ req.body.Name,
          "Sku":/*"112", //*/ req.body.Sku,
          "Description" : /*"", //*/ req.body.Description,
          "IncomeAccountRef": {
            "value": "79",  //dynamic  // req.body.incomeAccountRef.value,
            "name": "Sales of Product Income"  // req.body.incomeAccountRef.name,
          },
          "ExpenseAccountRef": {
            "value": "80", //dynamic   // req.body.expenseAccountRef.value,
            "name": "Cost of Goods Sold"   // req.body.expenseAccountRef.name,
          },
          "AssetAccountRef": {
            "value": "81", //dynamic  // req.body.assetAccountRef.value,  
            "name": "Inventory Asset"  // req.body.assetAccountRef.name,
          },
          "Type": "Inventory", //dynamic  // req.body.type,
          "TrackQtyOnHand": true,   // req.body.trackQtyOnHand,
          "QtyOnHand":/* 10,   // */(req.body.QtyOnHand),
          "InvStartDate":/* "2015-01-01",   //*/ req.body.InvStartDate,
          "PurchaseCost": /*10,   //*/ req.body.PurchaseCost,
          "UnitPrice": /*12, //*/req.body.UnitPrice,
          "PurchaseDesc": /*"", //*/ req.body.PurchaseDesc
          // "PurchaseTaxCodeRef" : {
          //   "value": "", //dynamic   // req.body.purchaseTaxCodeRef.value,
          //   "name": ""   // req.body.purchaseTaxCodeRef.name,
          // }
          };
        // Set up API call (with OAuth2 accessToken)
        var url = config.api_uri +  realmId + '/item'
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
            res.json(response.body)
          }, function (err) {
            return res.json(err)
          })
        })
     })
  });
  
})

module.exports = router
