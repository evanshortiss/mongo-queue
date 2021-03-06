'use strict';

var Promise = require('bluebird');
var MongoClient = require('mongodb').MongoClient;

module.exports = function(mongoUrl) {

  var dbPromise = MongoClient.connect(mongoUrl);

  return {
    getCollection: getCollection
  };

  // Returns a BLUEBIRD promise for the collection.
  // Note that by starting any chain with this promise, that will assure that
  // all other promises in the chain will also be BLUEBIRD promises
  function getCollection(collectionName) {
    return Promise.resolve(dbPromise)
      .then(function(db) {
        return db.collection(collectionName);
      });
  };

};
