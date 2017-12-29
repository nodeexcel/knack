var mongoose =require('mongoose');
var Schema=mongoose.Schema;
var conn =mongoose.connect('mongodb://sumit:java123@ds151232.mlab.com:51232/sumit');
var session=mongoose.Schema({
}, {
   collection: 'session',
   strict: false
});
var idInfo=mongoose.Schema({
}, {
   collection: 'ids',
   strict: false
});
var session = conn.model('session', session);
var idInfo = conn.model('idsInfo', idInfo);
module.exports = {
   knack_session: session ,
   storedIds: idInfo
}
