/**
 * Module dependencies.
 */

Error.stackTraceLimit = 10;

require('../').install();

var mongoose = require('mongoose'),
    Collection = mongoose.Collection,
    assert = require('power-assert'),
    queryCount = 0,
    opened = 0,
    closed = 0;

if (process.env.D === '1') {
  mongoose.set('debug', true);
}

/**
 * Create a connection to the test database.
 * You can set the environmental variable MONGOOSE_TEST_URI to override this.
 *
 * @api private
 */

module.exports = function(options) {
  options || (options = {});
  var uri;

  if (options.uri) {
    uri = options.uri;
    delete options.uri;
  } else {
    uri = module.exports.uri;
  }

  var noErrorListener = !!options.noErrorListener;
  delete options.noErrorListener;

  var conn = mongoose.createConnection(uri, options);

  if (noErrorListener) {
    return conn;
  }

  conn.on('error', function(err) {
    assert.ok(err);
  });

  return conn;
};

/*!
 * testing uri
 */

module.exports.uri = process.env.MONGOOSE_TEST_URI || 'mongoose-linvodb3_test';

/**
 * expose mongoose
 */

module.exports.mongoose = mongoose;
