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

    it('defining extra functions from options', function(done) {
        let testFunctionInvokationCount = 0;

        const Test = new Schema({
            test: String
        }, {
            testFunction: () => ++testFunctionInvokationCount
        });

        const model = db.model('Test' + this.test.title, Test);

        model.save({ test: 'test'}, (error, result) => {
            assert.ifError(error);

            result.testFunction();

            assert.strictEqual(testFunctionInvokationCount, 1);
        });
    });
});
