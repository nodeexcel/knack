var mongoose =require('mongoose');
var Schema=mongoose.Schema;
var conn =mongoose.connect('mongodb://localhost/knack_db');
var session=mongoose.Schema({
	// accessToken: { type: String, required: true },
 //    refreshToken:  { type: String, required: true },
 //    tokenType:  { type: String, required: true },
 //    data:  { type: String, required: true }
}, {
   collection: 'session',
   strict: false
});
var session = conn.model('session', session);
module.exports = {
   knack_session: session  
}