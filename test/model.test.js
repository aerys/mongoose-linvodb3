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

    it('array of nested schemas', function(done) {
        const SubSchema = new Schema({
            x: Number
        });

        const Test = new Schema({
            test: {
                type: [SubSchema]
            },
            extra: String
        });

        const model = db.model('Test' + this.test.title, Test);

        model.insert({ test: [ { x: 0 }, { x: 1 } ]}, (error, result) => {
            assert.ifError(error);

            assert(result);

            done();
        });
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

    it('insert doc via MongoDB API model.collection.insert', function(done) {
        const Test = new Schema({
            test: String
        });
        const model = db.model('Test' + this.test.title, Test);

        model.collection.insert({ test: 'test' }, (error, result) => {
            assert.ifError(error);

            assert(result);
            assert.strictEqual(result.ops.length, 1);
            assert(result.ops[0]);
            assert.strictEqual(result.ops[0].test, 'test');

            done();
        });
    });

    describe('findOneAndUpdate', function() {

        let Fruit, Variety, model;

        before(function(done) {
            Variety = new mongoose.Schema({
                origin: String,
                naming: String
            });

            Fruit = new mongoose.Schema({
                name: String,
                count: Number,
                varieties: [Variety]
            });

            model = db.model('Fruit findOneAndUpdate', Fruit);

            model.insert({ name: 'apple', count: 1 }, (error, results) => {
                assert.ifError(error);

                done();
            });
        });

        it('findOneAndUpdate', function(done) {
            model.findOneAndUpdate({ name: 'apple' }, { $set: { count: 2 } }, (error, result) => {
                assert.ifError(error);

                assert(result);
                assert.strictEqual(result.name, 'apple');
                assert.strictEqual(result.count, 1);

                model.findById(result._id, (error, result) => {
                    assert.ifError(error);

                    assert(result);
                    assert.strictEqual(result.name, 'apple');
                    assert.strictEqual(result.count, 2);

                    done();
                });
            });
        });

        it('findOneAndUpdate with $push, $each and $set operators', function(done) {
            model.findOneAndUpdate({ name: 'apple' }, {
                $set: { count: 3 },
                $push: {
                    varieties: {
                        $each: [ { origin: 'france', naming: 'reinette' } ]
                    }
                }}, (error, result) => {
                    assert.ifError(error);

                    assert(result);
                    assert.strictEqual(result.name, 'apple');
                    assert.strictEqual(result.count, 2);
                    assert.strictEqual(result.varieties.length, 0);

                    model.findById(result._id, (error, result) => {
                        assert.ifError(error);

                        assert(result);
                        assert.strictEqual(result.name, 'apple');
                        assert.strictEqual(result.count, 3);
                        assert.strictEqual(result.varieties.length, 1);
                        assert.strictEqual(result.varieties[0].origin, 'france');
                        assert.strictEqual(result.varieties[0].naming, 'reinette');

                        done();
                    });
                });
        });
    });

    describe('findOneAndRemove', function() {

        let Fruit, model;

        before(function(done) {
            Fruit = new mongoose.Schema({
                name: String,
                count: Number
            });

            model = db.model('Fruit findOneAndRemove', Fruit);

            model.insert([
                { name: 'apple', count: 1 },
                { name: 'banana', count: 2 }
            ], (error, results) => {
                assert.ifError(error);

                done();
            });
        });

        it('findOneAndRemove', function(done) {
            model.findOneAndRemove({ name: 'apple' }, (error, result) => {
                assert.ifError(error);

                assert(result);
                assert.strictEqual(result, 1);

                model.find({}, (error, result) => {
                    assert.ifError(error);

                    assert(result);
                    assert.strictEqual(result.length, 1);
                    assert.strictEqual(result[0].name, 'banana');
                    assert.strictEqual(result[0].count, 2);

                    done();
                });
            });
        });
    });

    describe('insert multiple documents', function() {

        let Fruit, model;

        before(function(done) {
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

                done();
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

        model.collection.insert({ tests: values }, (error, result) => {
            assert.ifError(error);

            assert(result);
            assert(result.ops);
            assert(result.ops[0]._id);

            model.findById(result.ops[0]._id, (error, result) => {
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
            assert(result.ops);
            assert.strictEqual(result.ops[0].toObject().test, 'complex');
            assert.strictEqual(result.ops[0].test, 'simple');

            done();
        });
    });

    describe('query mutliple keys', function() {
        let Test, model;

        before(function(done) {
            Test = new mongoose.Schema({
                name: String,
                kind: String,
                parent: String,
                count: {
                    type: Number,
                    default: 0,
                    index: true
                }
            });

            model = db.model('Test query mutliple keys', Test);

            model.collection.insert([
                { name: 't1', kind: 'k1', parent: 'p1' },
                { name: 't2', kind: 'k2', parent: 'p1', count: 0 },
                { name: 't3', kind: 'k2', parent: 'p1', count: 1 }
            ], (error, results) => {
                assert.ifError(error);

                done();
            });
        });

        it('findOne on multiple keys', function(done) {
            model.findOne({ kind: 'k2', parent: 'p1', count: 1 }).exec((error, result) => {
                assert.ifError(error);

                assert(result);
                assert.strictEqual(result.name, 't3');
                assert.strictEqual(result.kind, 'k2');
                assert.strictEqual(result.parent, 'p1');
                assert.strictEqual(result.count, 1);

                done();
            });
        });
    });
});
