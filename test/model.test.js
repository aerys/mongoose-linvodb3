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

describe('Model', function() {
    let db;

    before(function() {
        db = start();
    });

    after(function() {
        db.close();
    });

    it('create simple Model', function(done) {
        const schema = new Schema({
            test: String
        });
        const model = mongoose.model('Test', schema);

        done();
    });
});