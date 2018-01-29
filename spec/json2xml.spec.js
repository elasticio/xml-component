/* eslint-env node, jasmine */
const jsonToXml = require('../lib/actions/jsonToXml');
const { expect } = require('chai');

describe('JSON 2 XML converter', () => {

    it('should convert XML to json', () => {
        const xml = require('fs').readFileSync('./spec/data/po.xml', 'utf-8').trim();
        const json = require('./data/po.json');

        const message = {
            body: json
        };
        const { xmlString } = (jsonToXml.process(message, {})).body;
        expect(xmlString).to.be.deep.equal(xml);
    });

    it('should convert XML to json', () => {
        const json = {
            archs: {
                arm: true,
                amd64: true,
                386: true
            }
        };

        const message = {
            body: json
        };

        const messageText = 'Can\'t create xml element from prop that starts with digit.'
        + 'See https://www.w3schools.com/xml/xml_elements.asp xml naming rules';

        expect(jsonToXml.process.bind(null, message, {}))
            .to.throw(Error, 'Prop name is invalid for xml tag: 386. ' + messageText);
    });
});
