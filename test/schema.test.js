const start = require('./common'),
    mongoose = start.mongoose,
    assert = require('power-assert'),
    Schema = mongoose.Schema,
    Document = mongoose.Document,
    VirtualType = mongoose.VirtualType,
    SchemaTypes = Schema.Types,
    ObjectId = SchemaTypes.ObjectId,
    DocumentObjectId = mongoose.Types.ObjectId,
    ReadPref = mongoose.mongo.ReadPreference;

function TestDocument() {
  Document.apply(this, arguments);
}

TestDocument.prototype.__proto__ = Document.prototype;

describe('schema', function() {
    let db;

    before(function() {
        db = start();
    });

    after(function() {
        db.close();
    });

    it('create simple schema', function(done) {
        const schema = new Schema({
            test: String
        });

        done();
    });
});
