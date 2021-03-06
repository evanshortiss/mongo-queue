# mongo-queue

Allows using MongoDB as a persistent queue of sorts.

## Example

```js
'use strict';

const timestring = require('timestring');
const queue = require('mongo-queue');
const api = require('lib/http')('https://api.acme.your-domain.com/updates');
const email = require('lib/email');
const format = require('util').format;

// Example process function that posts data over http
function processItem (record) {
  // The record will have inserted data in the "data" property. Other properties
  // include "status" and "uuid", but these are generated by mongo-queue. In our
  // case here, record.data will contain "user", "velocity", "acceleration",
  // "position"
  return api.post(record.data);
}

// Example process function that emails failures
function processItemFailure (record) {
  return email({
    subject: format('Failed to process task (%s)', record.id),
    body: format('Data from client was:\n %j', record.data);
  });
}

const updatesQueue = queue({
  collectionName: 'task',

  // Processes records every minute using the "cron" module
  processCron: '*/1 * * * *',

  // Processes records every 20 minutes using the "cron" module
  cleanupCron: '0 */20 * * * *',

  // Number of records to process for each tick of the process
  batchSize: 200,

  // Max tries before we invoke the "onFailure" function
  retryLimit: 5,

  // Max age a record can be before getting deleted. Use timestring to convert
  // 1 day to number of milliseconds in a day
  maxRecordAge: timestring('1 day'),

  // Functions used to process items
  onProcess: processItem,
  onFailure: processItemFailure
});


updatesQueue.enqueue({
  user: 'MikeyBurkman',
  velocity: [8, 5],
  acceleration: [2, 12],
  position: [40, 50]
});
```

## Behaviors
The goal of this module is to allow an API to quickly accept data from client
devices, but defer processing for a later point in time so that it can be done
in controlled batches (_batchSize_). It will write (_enqueue_) items to the
given _collectionName_ and they will be loaded for each tick for the given cron
tab _processCron_. Each time _processCron_ "ticks" the _onProcess_ function will
be called for each record in _collectionName_ in series.

## API
This module exports a single function that is used to create queue instances.

### queue(options)
Creates a new queue instance. Options can contain:

* mongoUrl - MongoDB URL to connect to.
* collectionName - Name for a collection, e.g 'jobs'
* batchSize - Size of a batch to read into memory each tick of the queue
* maxRecordAge - Max age of an entry in milliseconds. If this entry age exceeds
this then it will be removed when the cleanup task runs.
* onProcess - Function to invoke for processing a record. Must return a Promise.
* onFailure - Function to invoke when a record fails to process _retryLimit_
times. Must return a Promise.
* retryLimit - Number of times to try process a record before considering it a
failure.
* processCron - Cron tab used to determine when to process batches.
* cleanupCron - Cron tab used to determine when to clean stale data.

### queue.enqueue(obj[, callback])
Add a new Object to the queue for processing. Returns a Promise if a callback
is not supplied. Returns an error if writing to MongoDB fails.

### queue.processNextBatch([callback])
Immediately start processing the next batch of items without waiting for a
"tick" of the job. Calls callback or resolves a returned Promise once complete.
Will have no effect if called when a batch is currently processing.

### queue.cleanup([callback])
Immediately invoke the clean up task to remove records older than
_maxRecordAge_. If this cleanup is already running then this has no effect.
Accepts a callback, or returns a promise to indicate completion.
