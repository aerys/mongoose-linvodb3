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

    it('schema with Date type', function(done) {
        const Test = new Schema({
            visited: Date
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

    it('use ObjectId type', function(done) {
        const Test = new Schema({
            testField: mongoose.Schema.Types.ObjectId
        });

        const model = db.model('Test' + this.test.title, Test);

        let objectId = new ObjectId();
        model.insert({ testField: objectId }, (error, result) => {
            assert.ifError(error);

            model.find({}, (error, result) => {
                assert.ifError(error);

                assert.notEqual(result, null);
                assert.strictEqual(result.length, 1);
                assert.strictEqual(result[0].testField, objectId.toString());
                assert.strictEqual(result[0].testField.toString(), objectId.toString());

                done();
            });
        });
    });
});
