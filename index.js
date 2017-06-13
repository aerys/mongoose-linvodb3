const mongoose = require('mongoose');
const LinvoDB = require('linvodb3');

module.exports = {
    install: function() {
        mongoose.schema = (schema, options) =>
        {
            return Object.assign(schema, {
                _hooks: [],
                _virtuals: {},
                pre: function(action, callback) {
                    if (action === 'find')
                        return this._hooks.push((model) => model.on('find', (result) => callback(result, () => null)));
                    if (action === 'save')
                        return this._hooks.push((model) => model.on('save', (result) => callback.apply(result, [() => null])));
                    throw 'Hook action ' + action + ' is unimplemented.';
                },
                post: function(action, callback) {
                    throw 'Hook action ' + action + ' is unimplemented.';
                },
                virtual: function(propertyName) {
                    {
                        return this._virtuals[propertyName] = {
                            get: function(fn) {
                                this._getter = fn;
                            },
                            set: function(fn) {
                                this._setter = fn;
                            }
                        };
                    }
                }
            });
        };

        mongoose.createConnection = (uri, options) =>
        {
            LinvoDB.dbPath = options.dbPath;

            return {
                model: (name, schema, options) =>
                {
                    // if (!('_hooks' in schema))
                    //     schema = mongoose.schema(name, schema, options);

                    const model = new LinvoDB(name, schema, options || {});

                    for (const hook of schema._hooks)
                        hook(model);

                    model.on('construct', function(doc) {
                        for (const propertyName in schema._virtuals)
                        {
                            if (!!schema._virtuals[propertyName]._getter)
                                doc.__defineGetter__(propertyName, schema._virtuals[propertyName]._getter);
                            if (!!schema._virtuals[propertyName]._setter)
                                doc.__defineSetter__(propertyName, schema._virtuals[propertyName]._setter);
                        }
                    });

                    // FIXME Define generic wrapper for all find methods.

                    const findOne = model.findOne;

                    model.findOne = function(query, callback) {
                        return findOne.apply(this, [query, (error, result) =>
                            {
                                model.emit('find', result);

                                return callback(error, result);
                            }]
                        );
                    }

                    return model;
                }
            };
        };
    }
};
