const fs = require('fs');
const path = require('path');
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
    'enum',
    // LinvoDB already defines get/set accessors which
    // perform strict type validation from schema definition.
    'get',
    'set'
];

module.exports = {
    install: function() {

        function Schema(schema, options) {

            for (const field in schema)
                SCHEMA_UNSUPPORTED_FEATURES.forEach(feature => delete schema[field][feature]);

            // Look for sub-schemas that were already processed
            // to make those compatible to LinvoDB by forwarding
            // their actual definition, stored under
            // `schema[subSchemaField].schema`.
            for (const field in schema) {
                const useComplexNotation = 'type' in schema;

                let fieldType = useComplexNotation ? schema[field].type : schema[field];

                // ObjectId will be considered as String like _id fields
                if (fieldType === mongoose.Schema.Types.ObjectId)
                {
                    schema[field] = String;
                    continue;
                }

                if (!fieldType || !_.isArray(fieldType) || typeof fieldType !== 'object')
                    continue;

                let fieldTypeIsArray = false;

                if (_.isArray(fieldType)) {
                    // Preserve array of sub-schema types.
                    fieldType = fieldType[0];
                    fieldTypeIsArray = true;
                }

                if (!(fieldType instanceof Schema))
                    continue;

                let normalizedFieldType = fieldTypeIsArray ? [fieldType.schema] : fieldType.schema;

                if (useComplexNotation) {
                    schema[field].type = normalizedFieldType;
                }
                else {
                    schema[field] = {
                        type: normalizedFieldType
                    };
                }
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
                }
            });
        };

        // Override mongoose.Schema constructor.
        mongoose.Schema = Schema;

        mongoose.Schema.Types = Object.assign(mongoose.Schema.Types || {}, {
            ObjectId: bson.ObjectID
        });

        mongoose.createConnection = (uri, options) => {

            const defaultOptions = {
                filename: 'cache'
            };

            // Default options.
            options = options || defaultOptions;

            if (!/^win/.test(process.platform)) { // !Windows
                // Using pure-js medeadown store backend on Android by default.
                // Comment the following line to use native LevelDB backend.
                // options.storeBackend = options.storeBackend || 'medeadown';
            }

            const filename = options.filename;
            LinvoDB.dbPath = filename || defaultOptions.filename;

            const dbDirName = path.dirname(LinvoDB.dbPath);
            if (!fs.existsSync(dbDirName))
                fs.mkdirSync(dbDirName);

            if (!!options.encode && !!options.decode) {
                const codec = {
                    encode: options.encode,
                    decode: options.decode,
                    buffer: false,
                    type: 'Custom codec'
                };

                LinvoDB.defaults.store = Object.assign(LinvoDB.defaults.store || {}, {
                    valueEncoding: codec
                });
            }

            if (!!options.storeBackend) {
                LinvoDB.defaults.store = Object.assign(LinvoDB.defaults.store || {}, {
                    db: require(options.storeBackend)
                });
            }

            return {
                close: () => {
                    // FIXME Close all open models.
                },
                on: (event, callback) => {
                    // FIXME Register event handlers ('error', ...).
                },
                once: (event, callback) => {
                    // FIXME Register event handlers ('open', ...).
                },
                model: (name, schema) => {
                    // if (!('_hooks' in schema))
                    //     schema = mongoose.schema(name, schema, options);

                    const modelFilename = filename || defaultOptions.filename + '/' + name + '.db';
                    const key = modelFilename;

                    const options = {
                        filename: modelFilename
                    };

                    const model = new LinvoDB(name, schema.schema, options);

                    // See http://mongoosejs.com/docs/middleware.html.
                    for (const hook of schema._hooks)
                        hook(model);

                    model.on('construct', function(doc) {

                        SCHEMA_OPERATORS.forEach(operator => {
                            const schemaOperator = schema._operators[operator];

                            if (!schemaOperator) {
                                doc[operator] = function() {
                                    // Default operator.
                                    // Nothing intended.
                                    return this;
                                }
                                return;
                            }

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
                            if (!!callback && typeof callback === 'function') {
                                // Callback is passed to find thus invoking Cursor.exec immediately.
                                return fn.apply(this, [query, (error, result) => {
                                        model.emit('find', result);

                                        if (!!callback)
                                            callback(error, result);
                                    }
                                ]);
                            } else {
                                // Callback is not directly passed to find.
                                // A Cursor is returned to be executed in a deferred way.
                                // Overriding Cursor.execFn is required to propagate 'find' event.
                                const cursor = fn.apply(this, [query]);
                                const cursorExecFn = cursor.execFn;

                                cursor.execFn = function(error, doc, callback) {
                                    return cursorExecFn(error, doc, (error, result) => {
                                        model.emit('find', result);

                                        if (!!callback)
                                            callback(error, result);
                                    });
                                };

                                // Cursor.remove is unimplemented by LinvoDB.
                                // See http://mongoosejs.com/docs/api.html#query_Query-remove.
                                if (!cursor.remove) {
                                    cursor.remove = (filter, callback) => {
                                        if (filter && typeof filter === 'function') {
                                            callback = filter;
                                            filter = {};
                                        }

                                        return model.remove(filter, {}, callback);
                                    };
                                }

                                return cursor;
                            }
                        };
                    };

                    findWrapper('find');
                    findWrapper('findById');
                    findWrapper('findOne');

                    // Override Model.insert to return result
                    // with MongoDB-like structure.
                    const insertFn = model.insert;
                    model.insert = function(doc, callback) {
                        return insertFn.apply(this, [doc, (error, result) => {
                            return callback(error, {
                                ops: [result]
                            });
                        }]);
                    };

                    // Make MongoDB-like api available through mongoose
                    // model.collection (ie, 'myModel.collection.insert(...)').
                    // 'insert' is not available from mongoose API.
                    if (!model.collection)
                        model.collection = model;

                    model.collection.initializeUnorderedBulkOp = function() {
                        // Nothing intended.
                    };

                    return model;
                }
            };
        };

        // LinvoDB does not natively support findOneAndUpdate.
        LinvoDB.prototype.findOneAndUpdate = function(query, doc, options, callback) {
            if (!!options && typeof options === 'function') {
                callback = options;
                options = undefined;
            }

            var self = this;
            this.findOne(query, function (err, originalDocument) {
                if (err)
                    return callback(err);

                self.update(query, doc, options || {}, function(err, res) {
                    return callback(err, originalDocument);
                });
            });
        };

        // LinvoDB does not natively support findOneAndRemove.
        LinvoDB.prototype.findOneAndRemove = function(query, options, callback) {
            if (!!options && typeof options === 'function') {
                callback = options;
                options = undefined;
            }

            var self = this;
            this.findOne(query, function (err, originalDocument) {
                if (err)
                    return callback(err);

                originalDocument.remove(function(err, res) {
                    return callback(err, res);
                });
            });
        };

        // http://mongoosejs.com/docs/api.html#model_Model.ensureIndexes
        LinvoDB.prototype.ensureIndexes = function(callback) {
            this.buildIndexes(!!callback && typeof callback === 'function' ? callback : () => {});
            return this;
        };

        LinvoDB.prototype.close = function() {
            // Stop the bagpipes.
            // This disable any action that will be applied.
            this._pipe.pause();
            this._retrQueue.pause();

            this._pipe.queue = [];
            this._retrQueue.queue = [];

            this._pipe.active = 0;
            this._retrQueue.active = 0;

            // See https://github.com/Level/levelup#close.
            this.store.close();
        };

        // See http://mongoosejs.com/docs/api.html#query_Query-lean.
        LinvoDB.prototype.lean = function() {
            // Nothing intended.
            // Results are already lean.
            return this;
        };

        LinvoDB.Cursor.prototype.lean = function() {
            // Nothing intended.
            // Results are already lean.
            return this;
        };

        LinvoDB.Cursor.prototype.select = function() {
            // FIXME Implement selection (projections).
            return this;
        };

        LinvoDB.prototype.createNewId = function() {
            return new bson.ObjectID().toString();
        };
    }
};
