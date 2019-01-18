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

router.post('/mergefile', upload.array("uploadfiles", 12), async (req, res) => {
    /* Multer gives us files info in req.files object */
    if (!req.files.length) {
        res.json({ error_code: 1, err_desc: "No files passed" });
        return;
    }
    // res.render('index', {fileName: null, loader: true})
    /* Check the extension of the incoming files to use appropriate module */
    if (path.extname(req.files[0].originalname) && path.extname(req.files[1].originalname) === 'xlsx') {
        exceltojson = xlsxtojson;
    } else {
        exceltojson = xlstojson;
    }

    try {
        //function to convert excel files to json
        async function sheetsToJson(req) {

            let firstFiles = [];
            let secondFiles = [];
            await req.files.forEach(async (file, index) => {
                await exceltojson({
                    input: file.path,
                    output: null
                }, async function (err, result) {
                    if (err) {
                        return res.json({ error_code: 1, err_desc: err, jsonBody: null });
                    }
                    result = JSON.parse(JSON.stringify(result));
                    if (req.files[0].originalname == 'Spend_Data_D1.xlsx') {
                        if (index === 0) {
                            firstFiles = result
                        } else {
                            secondFiles = result
                        }
                    } else {
                        if (index === 1) {
                            firstFiles = result
                        } else {
                            secondFiles = result
                        }
                    }

                    let allData = [];
                    if (index === 1) {
                        dataHandler(firstFiles, secondFiles, allData, async (finalData) => {
                            await jsonToExcel(finalData)
                            console.log('file has created')
                            res.redirect(`/upload?filepath=${'mergesheetjs.xlsx'}`)
                            // res.render('index', { filename: req.hist })
                            /* Removing uploaded file*/
                            // fs.unlinkSync(req.file.path);
                        })
                    }

                });
            })
        }
        await sheetsToJson(req)

    } catch (error) {
        res.json({ error_code: 1, err_desc: "Corupted excel files" });
    }


    /* Convert json to sheet */
    function jsonToExcel(data) {
        /* make the worksheet */
        let ws = XLSX.utils.json_to_sheet(data);
        /* add to workbook */
        let wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "test");
        /* write workbook (use type 'binary') */
        let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
        /* generate a download */
        function s2ab(s) {
            let buf = new ArrayBuffer(s.length);
            let view = new Uint8Array(buf);
            for (let i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
            return buf;
        }
        fs.writeFileSync("./public/mergesheetjs.xlsx", wbout);
        XLSX.writeFile(wb, "./public/mergesheetjs.xlsx");
    }

    async function dataHandler(firstFiles, secondFiles, allData, cb) {
        if (secondFiles.length) {
            let firstFile = firstFiles.splice(0, 1)[0];
            let secondFile = secondFiles.splice(0, 1)[0];
            console.log(secondFile.NPI, '*****************')
            request.get(`https://npiregistry.cms.hhs.gov/api/?number=${secondFile.NPI}`,
                async function (error, response, body) {
                    if (error) {
                        res.status(400).send(error);
                    }
                    if (response.statusCode == 200) {
                        let jsonBody = JSON.parse(body);
                        let taxonomiesResult = jsonBody.results[0].taxonomies;
                        await Object.keys(taxonomiesResult[0]).forEach(async (taxonomiesKey) => {
                            const matchKey = 'Taxonomies' + taxonomiesKey.charAt(0).toUpperCase() + taxonomiesKey.slice(1)
                            if (matchKey in secondFile) {
                                secondFile[matchKey] = await taxonomiesResult[0][taxonomiesKey];
                            }
                        })
                        let basicResult = jsonBody.results[0].basic;
                        await Object.keys(basicResult).forEach(async (basicKey) => {
                            const matchKey = basicKey.replace(/_/g, ' ').replace(/(?: |\b)(\w)/g, key => { return key.toUpperCase() });
                            if (matchKey in secondFile) {
                                secondFile[matchKey] = await basicResult[basicKey];
                            }
                        })
                        let mailAddress = jsonBody.results[0].addresses[0];
                        await Object.keys(mailAddress).forEach(async (mailAddressKey) => {
                            const matchKey = 'Mail' + mailAddressKey.replace(/(?:_|\b)(\w)/g, key => { return key.toUpperCase() });
                            if (matchKey in secondFile) {
                                secondFile[matchKey] = await mailAddress[mailAddressKey];
                            }
                        })
                        let locationAddress = jsonBody.results[0].addresses[0];
                        await Object.keys(locationAddress).forEach(async (locationAddressKey) => {
                            const matchKey = 'Loc' + locationAddressKey.replace(/(?:_|\b)(\w)/g, key => { return key.toUpperCase() });
                            if (matchKey in secondFile) {
                                secondFile[matchKey] = await locationAddress[locationAddressKey];
                            }
                        })
                        let firstFileKeys = Object.keys(firstFile)
                        let secondFileKeys = Object.keys(secondFile)
                        const idKey = 'Cumulative Recipient Name'
                        if (firstFile[idKey] == secondFile[idKey]) {
                            firstFileKeys.forEach((firstFileKey) => {
                                secondFileKeys.forEach((secondFileKey) => {
                                    if (firstFileKey == secondFileKey) {
                                        secondFile[firstFileKey] = firstFile[firstFileKey]
                                    }
                                    secondFile[firstFileKey] = firstFile[firstFileKey]
                                })
                            })
                        }
                        allData.push(secondFile);
                    }
                    if (secondFiles.length) {
                        await dataHandler(firstFiles, secondFiles, allData, cb);
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