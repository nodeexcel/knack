var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var conn = mongoose.connect('mongodb://ashutosh_m:java123@ds139138.mlab.com:39138/knack');
var session = mongoose.Schema({}, {
    collection: 'session',
    strict: false
});
var itemIdInfo = mongoose.Schema({}, {
    collection: 'itemIds',
    strict: false
});
var customerIdInfo = mongoose.Schema({}, {
    collection: 'customerIds',
    strict: false
});
var supplierIdInfo = mongoose.Schema({}, {
    collection: 'supplierIds',
    strict: false
});
var session = conn.model('session', session);
var itemIdInfo = conn.model('itemIdInfo', itemIdInfo);
var customerIdInfo = conn.model('customerIdInfo', customerIdInfo);
var supplierIdInfo = conn.model('supplierIdInfo', supplierIdInfo);
module.exports = {
    knack_session: session,
    storedItemIds: itemIdInfo,
    storedCustomerIds: customerIdInfo,
    storedSupplierIds: supplierIdInfo
}