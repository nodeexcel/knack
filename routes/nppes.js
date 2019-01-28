const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlstojson = require("xls-to-json");
const xlsxtojson = require("xlsx-to-json");
const fs = require('fs');
const request = require('request');
const XLSX = require('xlsx');
const path = require('path');
var excel = require('exceljs');

/* Providing storage location for uploaded file */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, __basedir + '/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + file.originalname + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

router.post('/updatefiles', upload.array("uploadfiles", 12), async (req, res) => {

    if (!req.files.length) {
        res.redirect(`/upload?error=No file passed`)
        return;
    }
    /* Check the extension of the incoming files to use appropriate module */
    if (req.files.length == 2) {
        if ((path.extname(req.files[0].originalname) == '.xlsx') && (path.extname(req.files[1].originalname) == '.xlsx')) {
            exceltojson = xlsxtojson;
        } else if ((path.extname(req.files[0].originalname) == '.xls') && (path.extname(req.files[1].originalname) == '.xls')) {
            exceltojson = xlstojson;
        } else {
            res.redirect(`/upload?error=Wrong file type passed`)
            return
        }
    } else {
        if (path.extname(req.files[0].originalname) == '.xlsx') {
            exceltojson = xlsxtojson;
        } else if (path.extname(req.files[0].originalname) == '.xls') {
            exceltojson = xlstojson;
        } else {
            res.redirect(`/upload?error=Wrong file type passed`)
            return
        }
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
                        return res.redirect(`/upload?error=${err}`)
                    }
                    result = JSON.parse(JSON.stringify(result));
                    await result.forEach((element, index) => {
                        let firstKey = Object.keys(element)[0]
                        let value = element[firstKey];
                        delete element[firstKey];
                        result[index][firstKey] = value;
                    })
                    if (result[0].Recipient) {
                        secondFiles = result;
                    } else if (result[0].NPI) {
                        secondFiles = result;
                    } else {
                        firstFiles = result;
                    }
                    let allData = [];
                    if (req.files.length == 2) {
                        if (index === 1) {
                            if (!secondFiles[0]) {
                                res.redirect(`/upload?error=file is not right`)
                                return
                            } else {
                                dataHandler(firstFiles, secondFiles, req, allData, async (finalData) => {
                                    // console.log(finalData, '111111111111111111111')
                                    await jsonToExcel(finalData, req)
                                    res.redirect(`/upload?filepath=${'mergesheetjs.xlsx'}`)
                                    /* Removing files from uploads folder */
                                    fs.readdir('./uploads', (err, files) => {
                                        if (err) throw err;
                                        for (const file of files) {
                                            fs.unlink(path.join('./uploads', file), err => {
                                                if (err) throw err;
                                            });
                                        }
                                    });
                                })
                            }

                        }
                    } else {
                        if (!secondFiles[0]) {
                            res.redirect(`/upload?error=file is not right`)
                            return
                        } else {
                            dataHandler(firstFiles, secondFiles, req, allData, async (finalData) => {
                                // console.log(finalData, '00000000000000000000000000000000000')
                                await jsonToExcel(finalData, req)
                                res.redirect(`/upload?filepath=${'updatesheetjs.xlsx'}`)
                                /* Removing files from uploads folder */
                                fs.readdir('./uploads', (err, files) => {
                                    if (err) throw err;
                                    for (const file of files) {
                                        fs.unlink(path.join('./uploads', file), err => {
                                            if (err) throw err;
                                        });
                                    }
                                });
                            })
                        }

                    }
                });
            })
        }
        await sheetsToJson(req)

    } catch (error) {
        res.redirect(`/upload?error=file is curroupted`)
        return
    }


    /* Convert json to sheet */
    function jsonToExcel(data, req) {
        let ws = XLSX.utils.json_to_sheet(data);
        let wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "test");
        let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
        function s2ab(s) {
            let buf = new ArrayBuffer(s.length);
            let view = new Uint8Array(buf);
            for (let i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
            return buf;
        }
        if (req.files.length == 2) {
            XLSX.writeFile(wb, "./public/mergesheetjs.xlsx");
        } else {
            XLSX.writeFile(wb, "./public/updatesheetjs.xlsx");
        }
    }

    async function dataHandler(firstFiles, secondFiles, req, allData, cb) {
        if (secondFiles.length) {
            let firstFile = firstFiles.splice(0, 1)[0];
            let secondFile = secondFiles.splice(0, 1)[0];
            if (!secondFile.NPI) {
                //for Spend many Recipients file
                if (!secondFile.Recipient) {
                    return res.redirect(`/upload?error=file is not right`);
                }
                let recipents, products;
                if (secondFile['Recipient'].indexOf('&#10;') > -1) {
                    recipents = secondFile['Recipient'].split("&#10;");
                    products = secondFile['Product'].split("&#10;").join(',').replace(/\,/g, ", ");
                } else {
                    recipents = secondFile['Recipient'].split("\r\n");
                    products = secondFile['Product'].split("\r\n").join(',').replace(/\,/g, ", ");
                }
                let newFileArr = [];
                if (recipents.length > 1) {
                    recipents.map((recipent) => {
                        let newFile = {};
                        Object.keys(secondFile).map((key) => {
                            if (key == "Recipient") {
                                newFile[key] = recipent;
                            } else if (key == 'Product') {
                                newFile[key] = products;
                            } else {
                                newFile[key] = secondFile[key];
                            }
                        })
                        newFileArr.push(newFile);
                    })
                }
                allData.push(...newFileArr);
                if (secondFiles.length) {
                    await dataHandler(firstFiles, secondFiles, req, allData, cb);
                } else {
                    cb(allData);
                }
            } else {
                // console.log(secondFile.NPI, '*****************')
                request.get(`https://npiregistry.cms.hhs.gov/api/?number=${secondFile.NPI}`,
                    async function (error, response, body) {
                        if (error) {
                            res.redirect(`/upload?error=${JSON.stringify(error)}`)
                            return
                        }
                        if (response.statusCode == 200) {
                            let jsonBody = JSON.parse(body);
                            let taxonomiesResults = jsonBody.results[0].taxonomies;
                            await taxonomiesResults.map(async (taxonomiesResult, index) => {
                                await Object.keys(taxonomiesResult).map(async (taxonomiesKey) => {
                                    secondFile['Taxonomies' + index + taxonomiesKey.charAt(0).toUpperCase() + taxonomiesKey.slice(1)] = await taxonomiesResult[taxonomiesKey];
                                })
                            })
                            delete secondFile['TaxonomiesCode']
                            delete secondFile['TaxonomiesPrimary']

                            let basicResult = jsonBody.results[0].basic;
                            await Object.keys(basicResult).map(async (basicKey) => {
                                const matchKey = basicKey.replace(/_/g, ' ').replace(/(?: |\b)(\w)/g, key => { return key.toUpperCase() });
                                if (matchKey in secondFile) {
                                    secondFile[matchKey] = await basicResult[basicKey];
                                }
                            })
                            let mailAddress = jsonBody.results[0].addresses[0];
                            await Object.keys(mailAddress).map(async (mailAddressKey) => {
                                const matchKey = 'Mail' + mailAddressKey.replace(/(?:_|\b)(\w)/g, key => { return key.toUpperCase() });
                                if (matchKey in secondFile) {
                                    secondFile[matchKey] = await mailAddress[mailAddressKey];
                                }
                            })
                            secondFile['COVERED_RECIPIENT_PHYSICIAN_PRIMARY_TYPE'] = jsonBody.results[0].enumeration_type;
                            let locationAddress = jsonBody.results[0].addresses[0];
                            await Object.keys(locationAddress).map(async (locationAddressKey) => {
                                const matchKey = 'Loc' + locationAddressKey.replace(/(?:_|\b)(\w)/g, key => { return key.toUpperCase() });
                                if (matchKey in secondFile) {
                                    secondFile[matchKey] = await locationAddress[locationAddressKey];
                                }
                            })
                            if (req.files.length == 2) {
                                //merge file
                                let firstFileKeys = Object.keys(firstFile)
                                let secondFileKeys = Object.keys(secondFile)
                                const idKey = 'Cumulative Recipient Name'
                                if (firstFile[idKey] == secondFile[idKey]) {
                                    firstFileKeys.map((firstFileKey) => {
                                        secondFileKeys.map((secondFileKey) => {
                                            if (firstFileKey == secondFileKey) {
                                                secondFile[firstFileKey] = firstFile[firstFileKey]
                                            }
                                            secondFile[firstFileKey] = firstFile[firstFileKey]
                                        })
                                    })
                                }
                            }
                            let newFile = {}
                            let keys = Object.keys(secondFile)
                            let taxonomyArr = [];
                            let restArr = [];
                            keys.map((key) => key.substr(0, 7) == 'Taxonom' ? taxonomyArr.push(key) : restArr.push(key))
                            let index = keys.indexOf(taxonomyArr[0]);
                            restArr.splice(index, 0, ...taxonomyArr);
                            restArr.map((key) => newFile[key] = secondFile[key]);
                            allData.push(newFile);
                        }
                        if (secondFiles.length) {
                            await dataHandler(firstFiles, secondFiles, req, allData, cb);
                        } else {
                            cb(allData);
                        }
                    });
            }
        } else {
            cb(allData);
        }
    }
})

module.exports = router;