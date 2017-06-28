const start = require('./common'),
    async = require('async'),
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
    let db, model, complexModel;

    before(function(done) {
        db = start();

        const Test = new Schema({
            test: String,
            tests: [Number]
        });

        const ComplexTest = new Schema({
            test: String,
            tests: [{
                values: [Number]
            }]
        });

        model = db.model('Test query', Test);
        complexModel = db.model('ComplexTest query', ComplexTest);

        async.waterfall([
            (callback) => {
                return model.insert([
                    { test: 'test', tests: [ 0, 1 ] },
                    { test: 'test', tests: [ 10, 20 ] },
                    { test: 'test', tests: [ 100, 300 ] }
                ], (error, result) => callback(error));
            }, (callback) => {
                return complexModel.insert([
                    { test: 'test', tests: [ { values: [ 0, 1 ] }, { values: [ 2, 3 ] } ] },
                    { test: 'test', tests: [ { values: [ 10, 20 ] } ] },
                    { test: 'test', tests: [ { values: [ 100, 300 ] } ] }
                ], (error, result) => callback(error));
            }
        ], (error, callback) => {
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

    it('$elemMatch operator simple case', function(done) {
        model.find({ tests: { $elemMatch: { $gte: 5, $lt: 15 } } }, (error, results) => {
            assert.ifError(error);

            assert(results);
            assert.strictEqual(results.length, 1);
            assert.deepEqual(results[0].tests, [ 10, 20 ]);

            done();
        });
    });

    it('$elemMatch operator complex case', function(done) {
        model.find({ tests: { $elemMatch: { values: { $in: [ 10, 100 ] } } } }, (error, results) => {
            assert.ifError(error);

            assert(results);
            assert.strictEqual(results.length, 2);

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
