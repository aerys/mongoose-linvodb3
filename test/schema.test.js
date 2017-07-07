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

    it('post find', function(done) {
        const Test = new Schema({
            test: String
        });

        let postFindHookCalled = 0;

        Test.post('find', function(doc) {
            assert(doc);

            assert.strictEqual(doc.length, 1);
            assert.strictEqual(doc[0].test, 'test');

            ++postFindHookCalled;
        });

        const model = db.model('Test' + this.test.title, Test);

        model.insert({ test: 'test' }, (error, result) => {
            assert.ifError(error);

            model.find({}, (error, result) => {
                assert.ifError(error);

                assert.strictEqual(postFindHookCalled, 1);

                done();
            });
        });
    });
});
