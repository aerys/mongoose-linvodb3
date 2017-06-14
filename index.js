const bson = require('bson');
const mongoose = require('mongoose');
const LinvoDB = require('linvodb3');

module.exports = {
    install: function() {

        function SchemaConstructor(schema, options) {
            // Remove 'required' flag from schema, not supported
            // by LinvoDB.
            for (const field in schema)
                delete schema[field].required;

            Object.assign(this, options || {}, {
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
                        return this._hooks.push((model) => model.on('find', (result) => callback.apply(result, [() => null])));
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
            LinvoDB.dbPath = options.dbPath;

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

        // See http://mongoosejs.com/docs/api.html#query_Query-lean.
        LinvoDB.prototype.lean = function() {
            // FIXME
            return this;
        };

        LinvoDB.Cursor.prototype.lean = function() {
            // FIXME
            return this;
        };
    }
};
