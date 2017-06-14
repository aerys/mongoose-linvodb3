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
});
