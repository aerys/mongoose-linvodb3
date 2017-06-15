const start = require('./common'),
    assert = require('power-assert'),
    _ = require('lodash'),
    mongoose = start.mongoose,
    Schema = mongoose.Schema,
    ValidatorError = mongoose.Error.ValidatorError,
    ValidationError = mongoose.Error.ValidationError,
    ObjectId = Schema.Types.ObjectId,
    DocumentObjectId = mongoose.Types.ObjectId,
    EmbeddedDocument = mongoose.Types.Embedded,
    MongooseError = mongoose.Error;

describe('Model', function() {
    let db;

    before(function() {
        db = start();
    });

    after(function() {
        db.close();
    });

    it('create simple Model', function(done) {
        const Test = new Schema({
            test: String
        });
        const model = db.model('Test' + this.test.title, Test);

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

        const model = db.model('Test' + this.test.title, Test);

        done();
    });

    it('schema with required field defaulting to null value', function(done) {
        const Test = new mongoose.Schema({
            test: {
                type: String,
                required: true,
                default: null
            }
        });

        const model = db.model('Test' + this.test.title, Test);

        done();
    });

    describe('findOneAndUpdate', function() {

        let Fruit, model;

        before(function() {
            Fruit = new mongoose.Schema({
                name: String,
                count: Number
            });

            model = db.model('Fruit findOneAndUpdate', Fruit);

            model.insert({ name: 'apple', count: 1 }, (error, results) => {
                assert.ifError(error);
            });
        });

        it('findOneAndUpdate', function(done) {
            model.findOneAndUpdate({ name: 'apple' }, { count: 2 }, {}, (error, result) => {
                assert.ifError(error);

                assert(result);
                assert.strictEqual(result.count, 1);

                model.findById({ _id: result._id }, (error, result) => {
                    assert.ifError(error);

                    assert(result);
                    assert.strictEqual(result.count, 2);
                });

                done();
            });
        });
    });

    describe('insert multiple documents', function() {

        let Fruit, model;

        before(function() {
            Fruit = new mongoose.Schema({
                name: String
            });

            model = db.model('Fruit insert multiple documents', Fruit);

            model.insert([
                { name: 'apple' },
                { name: 'banana' },
                { name: 'kiwi' }
            ], (error, results) => {
                assert.ifError(error);
            });
        });

        it('find documents', function(done) {
            model.find({}).exec((error, results) => {
                assert.ifError(error);

                assert.deepEqual(results.map(result => result.name).sort(), ['apple', 'banana', 'kiwi']);

                done();
            });
        });
    });

    it('schema with array of String field type', function(done) {
        const Test = new Schema({
            tests: {
                type: [String]
            }
        });
        const model = db.model('Test' + this.test.title, Test);

        const values = [ 'ga', 'bu', 'zo', 'meu' ];

        model.insert({ tests: values }, (error, result) => {
            assert.ifError(error);

            assert(result);
            assert(result._id);

            model.findById(result._id, (error, result) => {
                assert.ifError(error);

                assert(result);
                assert.deepEqual(result.tests, values);

                done();
            });
        });
    });

    it('schema custom toObject operator', function(done) {
        const Test = new Schema({
            test: String
        }, {
            toObject: {
                transform: function(doc, ret) {
                    ret.test = 'complex';
                }
            }
        });
        const model = db.model('Test' + this.test.title, Test);

        model.insert({ test: 'simple' }, (error, result) => {
            assert.ifError(error);

            assert(result);
            assert.strictEqual(result.toObject().test, 'complex');
            assert.strictEqual(result.test, 'simple');

            done();
        });
    });
});
