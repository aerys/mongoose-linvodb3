const start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose,
    Schema = mongoose.Schema,
    ValidatorError = mongoose.Error.ValidatorError,
    ValidationError = mongoose.Error.ValidationError,
    ObjectId = Schema.Types.ObjectId,
    DocumentObjectId = mongoose.Types.ObjectId,
    EmbeddedDocument = mongoose.Types.Embedded,
    MongooseError = mongoose.Error;

describe('query', function() {
    let db, model;

    before(function(done) {
        db = start();

        const Test = new Schema({
            test: String
        });

        model = db.model('Test query', Test);

        model.insert({ test: 'test' }, (error, result) => {
            assert.ifError(error);

            done();
        });
    });

    after(function() {
        db.close();
    });

    it('query deferred exec', function(done) {
        model.find({}).exec((error, results) => {
            assert.ifError(error);

            assert(results);
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].test, 'test');

            done();
        });
    });

    it('lean find query', function(done) {
        model.find({}).lean().exec((error, results) => {
            assert.ifError(error);

            done();
        });
    });

    it('select from find query', function(done) {
        model.find({}).select('test').exec((error, results) => {
            assert.ifError(error);

            // FIXME Select is unimplemented.

            done();
        });
    });
});
