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
          "Name": req.body.Name,
          "Sku": req.body.Sku,
          "Description" :req.body.Description,
          "IncomeAccountRef": {
            "name": req.body.IncomeAccountRefName  
          },
          "ExpenseAccountRef": {
            "name": req.body.ExpenseAccountRefName   
          },
          "AssetAccountRef": {
            "name": req.body.AssetAccountRefName
          },
          "Type":  req.body.Type,
          "TrackQtyOnHand": req.body.TrackQtyOnHand,
          "QtyOnHand":req.body.QtyOnHand,
          "InvStartDate":req.body.InvStartDate,
          "PurchaseCost":req.body.PurchaseCost,
          "UnitPrice": req.body.UnitPrice,
          "PurchaseDesc": req.body.PurchaseDesc

          };
          getId.getIncomeAccountRef(req,res).then((incomeAccountRef)=>{
            data.IncomeAccountRef=incomeAccountRef;
              getId.getExpenseAccountRef(req,res).then((expenseAccountRef)=>{ 
               data.ExpenseAccountRef=expenseAccountRef;
                  getId.getAssetAccountRef(req,res).then((assetAccountRef)=>{ 
                    data.AssetAccountRef=assetAccountRef
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
                            tools.saveId(req.body.KnackId,response.body.Item.Id)
                            res.json(response.body)
                          }, function (err) {
                            return res.json(err)
                          })
                        })
                  }).catch(err=>console.log(err))
              }).catch(err=>console.log(err))
          }).catch(err=>console.log(err))
     })
  });
  
})

module.exports = router
