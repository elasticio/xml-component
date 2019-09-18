/* eslint-env node, jasmine */
const { expect } = require('chai');
const fs = require('fs');
const xmlToJson = require('../lib/actions/xmlToJson');

describe('XML 2 JSON parser', () => {
    it('should convert XML to json', async () => {
        const xml = fs.readFileSync('./spec/data/po.xml', 'utf-8');
        // eslint-disable-next-line global-require
        const result = require('./data/po.json');

        const message = {
            body: {
                xmlString: xml,
            },
        };
        const { body } = await xmlToJson.process(message, {});
        expect(body).to.be.deep.equal(result);
    });

    it('should fail due to an invalid json', async () => {
        const xml = fs.readFileSync('./spec/data/invalidXml.xml', 'utf-8');

        const message = {
            body: {
                xmlString: xml,
            },
        };
        const messageText = 'Given XML is not valid or the file can not be read. '
          + 'See xml naming rules https://www.w3schools.com/xml/xml_elements.asp';

        await xmlToJson.process(message, {}).catch((error) => {
            expect(error.message).to.be.equal(messageText);
        });
    });
});
