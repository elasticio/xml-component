'use strict';
const co = require('co');
const rp = require('request-promise');
const exec = require('promised-exec');

// This function will be called by the platform to verify credentials
module.exports = function verifyCredentials(credentials, cb) {
  console.log('Credentials passed for verification %j', credentials);

  co(function*() {
    console.log('Fetching user information');

    const out = yield exec("java -jar node_modules/jsonix/lib/jsonix-schema-compiler-full.jar -d mappings purchaseorder.xsd -b bindings.xjb");

    console.log('Fetched %s', out);

    console.log('Verification completed');

    cb(null, {verified: true});
  }).catch(err => {
    console.log('Error occurred', err.stack || err);
    cb(err , {verified: false});
  });
};
