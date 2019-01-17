const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlstojson = require("xls-to-json");
const xlsxtojson = require("xlsx-to-json");
const fs = require('fs');
const request = require('request');
const XLSX = require('xlsx');
const path = require('path')

/* Providing storage location for uploaded file */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, __basedir + '/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

router.post('/updatefile', upload.single("uploadfile"), async (req, res) => {
    /* Multer gives us file info in req.file object */
    if (!req.file) {
        res.json({ error_code: 1, err_desc: "No file passed" });
        return;
    }
    /* Check the extension of the incoming file to use appropriate module */
    if (path.extname(req.file.originalname) === 'xlsx') {
        exceltojson = xlsxtojson;
    } else {
        exceltojson = xlstojson;
    }

    try {
        /* Convert excel to json */
        exceltojson({
            input: req.file.path,
            output: null
        }, async function (err, result) {
            if (err) {
                return res.json({ error_code: 1, err_desc: err, jsonBody: null });
            }
            result = JSON.parse(JSON.stringify(result));
            await result.forEach((element, index) => {
                let firstKey = Object.keys(element)[0]
                let value = element[firstKey];
                delete element[firstKey];
                result[index][firstKey] = value;
            })
            res.json(result);
            let allData = [];
            await dataHandler(result, allData, async (finalData) => {
                console.log('excel file has created')
                await jsonToExcel(finalData);
            })
        });
        /* Removing uploaded file*/
        fs.unlinkSync(req.file.path);
    } catch (error) {
        res.json({ error_code: 1, err_desc: "Corupted excel file" });
    }


    /* Convert json to sheet */
    function jsonToExcel(data) {
        /* make the worksheet */
        let ws = XLSX.utils.json_to_sheet(data);
        /* add to workbook */
        let wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "People");
        /* write workbook (use type 'binary') */
        let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
        /* generate a download */
        function s2ab(s) {
            let buf = new ArrayBuffer(s.length);
            let view = new Uint8Array(buf);
            for (let i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
            return buf;
        }
        fs.writeFileSync("./public/sheetjs.xlsx", wbout);
        XLSX.writeFile(wb, "./public/sheetjs.xlsx");
    }

    /* Update json with api resoponse */
    function dataHandler(result, allData, cb) {
        if (result.length) {
            let data = result.splice(0, 1)[0];
            console.log(data.NPI)
            request.get(`https://npiregistry.cms.hhs.gov/api/?number=${data.NPI}`,
                async function (error, response, body) {
                    if (error) {
                        res.status(400).send(error);
                    }
                    if (response.statusCode == 200) {
                        let jsonBody = JSON.parse(body);
                        let taxonomiesResult = jsonBody.results[0].taxonomies;
                        await Object.keys(taxonomiesResult[0]).forEach(async (taxonomiesKey) => {
                            const matchKey = 'Taxonomies' + taxonomiesKey.charAt(0).toUpperCase() + taxonomiesKey.slice(1)
                            if (matchKey in data) {
                                data[matchKey] = await taxonomiesResult[0][taxonomiesKey];
                            }
                        })
                        let basicResult = jsonBody.results[0].basic;
                        await Object.keys(basicResult).forEach(async (basicKey) => {
                            const matchKey = basicKey.replace(/_/g, ' ').replace(/(?: |\b)(\w)/g, key => { return key.toUpperCase() });
                            if (matchKey in data) {
                                data[matchKey] = await basicResult[basicKey];
                            }
                        })
                        let mailAddress = jsonBody.results[0].addresses[0];
                        await Object.keys(mailAddress).forEach(async (mailAddressKey) => {
                            const matchKey = 'Mail' + mailAddressKey.replace(/(?:_|\b)(\w)/g, key => { return key.toUpperCase() });
                            if (matchKey in data) {
                                data[matchKey] = await mailAddress[mailAddressKey];
                            }
                        })
                        let locationAddress = jsonBody.results[0].addresses[0];
                        await Object.keys(locationAddress).forEach(async (locationAddressKey) => {
                            const matchKey = 'Loc' + locationAddressKey.replace(/(?:_|\b)(\w)/g, key => { return key.toUpperCase() });
                            if (matchKey in data) {
                                data[matchKey] = await locationAddress[locationAddressKey];
                            }
                        })
                        await allData.push(data);
                    }
                    if (result.length) {
                        await dataHandler(result, allData, cb);
                    } else {
                        cb(allData);
                    }
                });
        } else {
            cb(allData);
        }
    }
})

module.exports = router;