/* eslint-env node, jasmine */
const { expect } = require('chai');
const fs = require('fs');
const jsonToXml = require('../lib/actions/jsonToXml');

describe('JSON 2 XML converter', () => {
    it('should convert JSON to XML 1', () => {
        const xml = fs.readFileSync('./spec/data/po.xml', 'utf-8').trim();
        // eslint-disable-next-line global-require
        const json = require('./data/po.json');
        const message = {
            body: json,
        };
        const { xmlString } = (jsonToXml.process(message, {})).body;
        expect(xmlString).to.deep.equal(xml);
    });

    it('should convert JSON to XML 2', () => {
        const json = {
            archs: {
                arm: true,
                amd64: true,
                386: true,
            },
        };

        const message = {
            body: json,
        };

        const messageText = 'Can\'t create XML element from prop that starts with digit.'
        + 'See XML naming rules https://www.w3schools.com/xml/xml_elements.asp';

        expect(jsonToXml.process.bind(null, message, {}))
            .to.throw(Error, `Prop name is invalid for XML tag: 386. ${messageText}`);
    });
});
