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
        const Test = new Schema({
            test: String
        });

        done();
    });

    it('nested schemas', function(done) {
        const SubSchema = new Schema({
            x: Number
        });

        const Test = new Schema({
            test: SubSchema,
            extra: String
        });

        done();
    });

    it('custom toObject option', function(done) {
        const Test = new Schema({
            test: String,
            removedFromJSObject: String
        }, {
            toObject: {
                virtuals: true,
                transform: function(doc, ret) {
                    delete ret.removedFromJSObject;
                }
            }
        });

        const model = db.model('Test' + this.test.title, Test);

        model.insert({ test: 'test', removedFromJSObject: 'removed from JS Object' }, (error, result) => {
            assert.ifError(error);

            // FIXME

            result.toObject();
            // assert.strictEqual(result.toObject(), { test: 'test' });

            done();
        });
    });
});
