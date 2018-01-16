var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
var express = require('express')
var router = express.Router()
var multiparty = require("multiparty");

router.post('/',function (req, res) {
   var form = new multiparty.Form();

    form.on("part", function(part){
        console.log(part)
        if(part.filename)
        {
            var FormData = require("form-data");
            var request = require("request")
            var form = new FormData();

            form.append("thumbnail", part, {filename: part.filename,contentType: part["content-type"]});

            var r = request.post("http://localhost:7070/store", { "headers": {"transfer-encoding": "chunked"} }, function(err, res, body){ 
                httpResponse.send(res);
            });
            
            r._form = form
        }
    })


    // let mailer = nodemailer.createTransport(smtpTransport({
    //     host: req.body.smtp_server,
    //     port: parseInt(req.body.server_port),
    //     auth: {
    //         user: req.body.username,
    //         pass: req.body.password
    //     }
    // }));
    // mailer.sendMail({
    //     from: req.body.from,
    //     to: req.body.to,
    //     subject: req.body.subject,
    //     html: req.body.html,
    //     attachments: [{
    //                 filename: req.body.filename,
    //                 content: req.body.content
    //             }]
    // }, (error, response) => {
    //     if (error) {
    //         res.json({message:"message not sent successfully",status:0,error:error});
    //     } else {
    //         res.json({ message: "messsage sent successfully", status: 1, email_response: response, subject: req.body.subject, body: req.body.html });
    //     }
    //     mailer.close();
    // });
})

module.exports = router