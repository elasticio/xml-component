/* eslint-env node, jasmine */
'use strict';
const xmlToJson = require('../lib/actions/xmlToJson').process;
const jsonToXml = require('../lib/actions/jsonToXml').process;
const { expect } = require('chai');

describe.only('XML 2 JSON parser', () => {

    it('should do a roundtrip JSON - XML - JSON', async () => {
        const json1 = require('./data/body.json');

        console.log('About to convert to xml');
        const { xmlString } = (await jsonToXml({
            body: json1
        }, {})).body;

        console.log('About to convert to JSON');
        const json2 = (await xmlToJson({
            body: {
                xmlString
            }
        }, {})).body;

        expect(json1).to.be.deep.equal(json2);
    });

});
