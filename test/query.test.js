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

    before(function() {
        db = start();

        const Test = new Schema({
            test: String
        });

        model = db.model('Test query', Test);

        model.insert({ test: 'test' }, (error, result) => {
            assert.ifError(error);
        });
    });

    after(function() {
        db.close();
    });

    it('lean find query', function(done) {
        model.find({}).lean().exec((error, results) => {
            assert.ifError(error);

            done();
        });
    });
});
