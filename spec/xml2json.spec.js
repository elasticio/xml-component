/* eslint-env node, jasmine */
'use strict';
const xmlToJson = require('../lib/actions/xmlToJson');
const { expect } = require('chai');

describe('XML 2 JSON parser', () => {

    it('should convert XML to json', async () => {
        const xml = require('fs').readFileSync('./spec/data/po.xml', 'utf-8');
        const result = require('./data/po.json');

        const message = {
            body: {
                xmlString: xml
            }
        };
        const { body } = await xmlToJson.process(message, {});
        expect(body).to.be.deep.equal(result);
    });

});
