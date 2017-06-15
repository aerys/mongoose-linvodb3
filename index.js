const fs = require('fs');
const bson = require('bson');
const mongoose = require('mongoose');
const LinvoDB = require('linvodb3');

module.exports = {
    install: function() {

        function SchemaConstructor(schema, options) {
            // Schemas features unsupported by LinvoDB.
            const unsupportedFeatures = [
                'required',
                'enum'
            ];

            for (const field in schema)
                unsupportedFeatures.forEach(feature => delete schema[field][feature]);

            Object.assign(this, {
                schema: schema,
                _hooks: [],
                _virtuals: {},
                pre: function(action, callback) {
                    if (action === 'find')
                        return this._hooks.push((model) => model.on('find', (result) => callback(result, () => null)));
                    if (action === 'insert')
                        return this._hooks.push((model) => model.on('insert', (result) => callback.apply(result, [() => null])));
                    if (action === 'save')
                        return this._hooks.push((model) => model.on('save', (result) => callback.apply(result, [() => null])));
                    if (action === 'remove')
                        return this._hooks.push((model) => model.on('remove', (result) => callback.apply(result, [() => null])));
                    throw 'Hook action ' + action + ' is unimplemented.';
                },
                post: function(action, callback) {
                    if (action === 'find')
                        return this._hooks.push((model) => model.on('find', (result) => callback(result, () => null)));
                    if (action === 'insert')
                        return this._hooks.push((model) => model.on('inserted', (result) => callback.apply(result, [() => null])));
                    if (action === 'save')
                        return this._hooks.push((model) => model.on('updated', (result) => callback.apply(result, [() => null])));
                    if (action === 'remove')
                        return this._hooks.push((model) => model.on('removed', (result) => callback.apply(result, [() => null])));
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
        mongoose.Schema = SchemaConstructor;

        mongoose.Schema.Types = Object.assign(mongoose.Schema.Types || {}, {
            ObjectId: bson.ObjectID
        });

        mongoose.createConnection = (uri, options) => {

            options.storeBackend = options.storeBackend || 'medeadown';
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
                    console.log(event, 'event registered');

                    // FIXME Register event handlers ('error', ...).
                },
                model: (name, schema, options) => {
                    // if (!('_hooks' in schema))
                    //     schema = mongoose.schema(name, schema, options);

                    const model = new LinvoDB(name, schema.schema, options || {});

                    for (const hook of schema._hooks)
                        hook(model);

                    model.on('construct', function(doc) {
                        doc.toObject = function() {
                            // FIXME See http://mongoosejs.com/docs/guide.html#toObject.
                            return this;
                        };

                        doc.toJSON = function() {
                            // FIXME See http://mongoosejs.com/docs/guide.html#toJSON.
                            return this;
                        };

                        for (const propertyName in schema._virtuals) {
                            if (!!schema._virtuals[propertyName]._getter)
                                doc.__defineGetter__(propertyName, schema._virtuals[propertyName]._getter);
                            if (!!schema._virtuals[propertyName]._setter)
                                doc.__defineSetter__(propertyName, schema._virtuals[propertyName]._setter);
                        }
                    });

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
