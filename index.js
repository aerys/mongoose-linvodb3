const fs = require('fs');
const bson = require('bson');
const mongoose = require('mongoose');
const LinvoDB = require('linvodb3');
const _ = require('lodash');

// See http://mongoosejs.com/docs/guide.html#toObject.
const SCHEMA_OPERATORS = [
    'toObject',
    'toJSON'
];

// Schemas features unsupported by LinvoDB.
const SCHEMA_UNSUPPORTED_FEATURES = [
    'required',
    'enum'
];

module.exports = {
    install: function() {

        function Schema(schema, options) {

            for (const field in schema)
                SCHEMA_UNSUPPORTED_FEATURES.forEach(feature => delete schema[field][feature]);

            for (const field in schema) {
                let fieldType = schema[field].type;
                let fieldTypeIsArray = false;

                if (!fieldType)
                    continue;

                if (_.isArray(fieldType)) {
                    fieldType = fieldType[0];
                    fieldTypeIsArray = true;
                }

                if (!(fieldType instanceof Schema))
                    continue;

                schema[field].type = fieldTypeIsArray ? [fieldType.schema] : fieldType.schema;
            }

            if (!!options) {
                SCHEMA_OPERATORS.forEach(operator => {
                    if (!options[operator])
                        return;

                    const transform = options[operator].transform;

                    if (!transform)
                        return;

                    options[operator] = transform;
                });
            }

            Object.assign(this, {
                schema: schema,
                _operators: options || {}, // See http://mongoosejs.com/docs/guide.html#toObject.
                _hooks: [], // See http://mongoosejs.com/docs/middleware.html.
                _virtuals: {}, // See http://mongoosejs.com/docs/2.7.x/docs/virtuals.html.
                pre: function(action, callback) {
                    if (action === 'save')
                        return this._hooks.push((model) => model.on('save', (result) => callback.apply(result, [() => null])));
                    if (action === 'remove')
                        return this._hooks.push((model) => model.on('remove', (result) => callback.apply(result, [() => null])));
                    throw 'Hook action ' + action + ' is unimplemented.';
                },
                post: function(action, callback) {
                    if (action === 'find')
                        return this._hooks.push((model) => model.on('find', (result) => callback(result, () => null)));
                    if (action === 'save')
                        return this._hooks.push((model) => model.on('updated', (result) => callback.apply(result, [() => null])));
                    throw 'Hook action ' + action + ' is unimplemented.';
                },
                virtual: function(propertyName) {
                    {
                        const schema = this;

                        return this._virtuals[propertyName] = {
                            get: function(fn) {
                                this._getter = fn;
                                return schema._virtuals[propertyName];
                            },
                            set: function(fn) {
                                this._setter = fn;
                                return schema._virtuals[propertyName];
                            }
                        };
                    }
                },
                set: function(param, value) {
                    // FIXME Setter for options.

                    console.log('schema param', param, 'set to', value);
                }
            });
        };

        // Override mongoose.Schema constructor.
        mongoose.Schema = Schema;

        mongoose.Schema.Types = Object.assign(mongoose.Schema.Types || {}, {
            ObjectId: bson.ObjectID
        });

        mongoose.createConnection = (uri, options) => {

            if (!/^win/.test(process.platform)) { // !Windows
                // Using pure-js medeadown store backend on Android by default.
                // Comment the following line to use native LevelDB backend.
                // options.storeBackend = options.storeBackend || 'medeadown';
            }

            options.dbPath = options.dbPath || 'default_db_path';

            if (options.storeBackend === 'medeadown') {
                // FIXME medeadown does not handle directory creation.

                if (!fs.existsSync(options.dbPath))
                    fs.mkdirSync(options.dbPath);
            }

            if (!!options) {

                if (!!options.dbPath)
                    LinvoDB.dbPath = options.dbPath;

                if (!!options.storeBackend)
                    LinvoDB.defaults.store = { db: require(options.storeBackend) };
            }

            return {
                close: () => {
                    // FIXME
                },
                on: (event, callback) => {
                    console.log('on', event, 'event registered');

                    // FIXME Register event handlers ('error', ...).
                },
                once: (event, callback) => {
                    console.log('once', event, 'event registered');

                    // FIXME Register event handlers ('open', ...).
                },
                model: (name, schema, options) => {
                    // if (!('_hooks' in schema))
                    //     schema = mongoose.schema(name, schema, options);

                    const model = new LinvoDB(name, schema.schema, options || {});

                    // See http://mongoosejs.com/docs/middleware.html.
                    for (const hook of schema._hooks)
                        hook(model);

                    model.on('construct', function(doc) {

                        SCHEMA_OPERATORS.forEach(operator => {
                            const schemaOperator = schema._operators[operator];

                            if (!schemaOperator)
                                return;

                            doc[operator] = function() {
                                const transformedDoc = _.cloneDeep(this);

                                schemaOperator(this, transformedDoc);

                                return transformedDoc;
                            };
                        });

                        for (const propertyName in schema._virtuals) {
                            if (!!schema._virtuals[propertyName]._getter)
                                doc.__defineGetter__(propertyName, schema._virtuals[propertyName]._getter);
                            if (!!schema._virtuals[propertyName]._setter)
                                doc.__defineSetter__(propertyName, schema._virtuals[propertyName]._setter);
                        }
                    });

                    // LinvoDB does not natively support pre and post 'find'
                    // events, which are handled here.
                    const findWrapper = function(funcName) {
                        const fn = model[funcName];

                        model[funcName] = function(query, callback) {
                            return fn.apply(this, [query, (error, result) => {
                                    model.emit('find', result);

                                    if (!!callback)
                                        callback(error, result);
                                }
                            ]);
                        };
                    };

                    findWrapper('find');
                    findWrapper('findById');
                    findWrapper('findOne');

                    return model;
                }
            };
        };

        // LinvoDB does not natively support findOneAndUpdate.
        LinvoDB.prototype.findOneAndUpdate = function(query, doc, options, callback)
        {
            var self = this;
            this.findOne(query, function (err, originalDocument) {
                if (err)
                    return callback(err);

                self.update(query, doc, options, function(err, res)
                {
                    return callback(err, originalDocument);
                });
            });
        };

        // See http://mongoosejs.com/docs/api.html#query_Query-lean.
        LinvoDB.prototype.lean = function() {
            // FIXME
            return this;
        };

        LinvoDB.Cursor.prototype.lean = function() {
            // FIXME
            return this;
        };

        LinvoDB.Cursor.prototype.select = function() {
            // FIXME Implement selection (projections).
            return this;
        };
    }
};
