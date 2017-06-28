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
            test: String,
            tests: [Number]
        });

        model = db.model('Test query', Test);

        model.insert([
            { test: 'test', tests: [ 0, 1 ] },
            { test: 'test', tests: [ 10, 20 ] },
            { test: 'test', tests: [ 100, 300 ] }
        ], (error, result) => {
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
            assert.strictEqual(results.length, 3);
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

    it('$elemMatch operator', function(done) {
        model.find({ tests: { $elemMatch: { $gte: 5, $lt: 15 } } }, (error, results) => {
            assert.ifError(error);

            assert(results);
            assert.strictEqual(results.length, 1);
            assert.deepEqual(results[0].tests, [ 10, 20 ]);

            done();
        });
    });

    it('Cursor remove operator', function(done) {
        model.findOne({}).remove((error, result) => {
            assert.ifError(error);

            assert.strictEqual(result, 1);

            model.count({}, (error, result) => {
                assert.ifError(error);

                assert.strictEqual(result, 2);

                done();
            });
        });
    });
});
