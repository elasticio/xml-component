/* eslint-env node, jasmine */
const jsonToXml = require('../lib/actions/jsonToXml');
const { expect } = require('chai');

describe('JSON 2 XML converter', () => {
    const xml = require('fs').readFileSync('./spec/data/po.xml', 'utf-8').trim();
    const json = require('./data/po.json');

    it('should convert XML to json', async () => {
        const xml = require('fs').readFileSync('./spec/data/po.xml', 'utf-8').trim();
        const json = require('./data/po.json');

        const message = {
            body: json
        };
        const { xmlString } = (await jsonToXml.process(message, {})).body;
        expect(xmlString).to.be.deep.equal(xml);
    });
});
