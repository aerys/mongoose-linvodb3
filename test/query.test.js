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
            tests: [Number],
            props: Object
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
                return model.collection.insert([
                    { test: 'test1', tests: [ 0, 1 ], size: 1, props: [ { key: 'prop1', value: 'val1' }, { key: 'prop2', value: 'val2' } ] },
                    { test: 'test2', tests: [ 10, 20 ], size: 10 },
                    { test: 'test3', tests: [ 100, 300 ], size: 100 }
                ], (error, result) => callback(error));
            }, (callback) => {
                return complexModel.collection.insert([
                    { test: 'test1', tests: [ { values: [ 0, 1 ] }, { values: [ 2, 3 ] } ] },
                    { test: 'test2', tests: [ { values: [ 10, 20 ] } ] },
                    { test: 'test3', tests: [ { values: [ 100, 300 ] } ] }
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
            assert.strictEqual(results[0].test, 'test1');

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
        model.find({}).select({ 'test': 1 }).lean().exec((error, results) => {
            assert.ifError(error);

            assert(results);
            assert.strictEqual(results.length, 3);
            assert.deepEqual(JSON.stringify(results[0]), JSON.stringify({ test: 'test1' }));
            assert.deepEqual(JSON.stringify(results[1]), JSON.stringify({ test: 'test2' }));
            assert.deepEqual(JSON.stringify(results[2]), JSON.stringify({ test: 'test3' }));

            done();
        });
    });

    it('select with elemMatch from find query', function(done) {
        model.find({}).select({ 'props': { $elemMatch: { key: 'prop2' } }}).lean().exec((error, results) => {
            assert.ifError(error);

            assert(results);
            assert.strictEqual(results.length, 3);
            assert.deepEqual(JSON.stringify(results[0]), JSON.stringify({ props: [ { key: 'prop2', value: 'val2' } ]}));
            assert.deepEqual(JSON.stringify(results[1]), JSON.stringify({ props: {} }));
            assert.deepEqual(JSON.stringify(results[2]), JSON.stringify({ props: {} }));

            done();
        });
    });

    it('$elemMatch operator simple case', function(done) {
        model.find({ tests: { $elemMatch: { $gte: 5, $lt: 15 } } }, (error, results) => {
            assert.ifError(error);

            assert(results);
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].test, 'test2');
            assert.deepEqual(results[0].tests, [ 10, 20 ]);

            done();
        });
    });

    it('$elemMatch operator complex case', function(done) {
        complexModel.find({ tests: { $elemMatch: { values: { $in: [ 10, 100 ] } } } }, (error, results) => {
            assert.ifError(error);

            assert(results);
            assert.strictEqual(results.length, 2);
            assert.strictEqual(results[0].test, 'test2');
            assert.strictEqual(results[1].test, 'test3');

            done();
        });
    });

    it('multiple keys with a $in operator', function(done) {
        model.find({ test: 'test1', size: { $in: [ 1, 100 ] } }).lean().exec((error, results) => {
            assert.ifError(error);

            assert(results);
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].test, 'test1');
            assert.strictEqual(results[0].size, 1);

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
