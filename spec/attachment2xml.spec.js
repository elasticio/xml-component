/* eslint-env node, jasmine */
'use strict';

const attachmentToJson = require('../lib/actions/attachmentToJson');
const json = require('./data/po.json');
const { expect } = require('chai');
const nock = require('nock');

require('chai').should(); // expect is assertion styles used my elastic.io
const sinon = require('sinon');

function produceString(output) {
    let string = '';
    for (let i = 0; i < output.length; ++i) {
        console.log(output[i].args[1].body);
        if (i !== 0) {
            string += ',\n';
        }
        string += JSON.stringify(output[i].args[1].body);
    }
    return string;
}

describe('should convert XML attachment 2 JSON', () => {
    const mockSever = 'http://test.env.mock';
    let cfg = {
        pattern: '(.xml)'
    };
    let emit;

    before(function testInit() {
        nock(mockSever)
      .get('/')
      .replyWithFile(200, 'spec/data/po.xml');
    });

    beforeEach(function testInit() {
        emit = sinon.spy();
        cfg = {
            pattern: '(.xml)'
        };
    });


    it('FileName undefined ', async () => {
        await attachmentToJson.process.bind({
            emit
        })({
            attachments: {
                undefined: {
                    url: mockSever
                }
            }
        }, cfg);
        expect(emit.getCalls()).to.deep.eql([]);
    });


    it('FileName dose not match pattern ', async () => {
        cfg = {
            pattern: '(test.xml)'
        };
        await attachmentToJson.process.bind({
            emit
        })({
            attachments: {
                'po.xml': {
                    url: mockSever
                }
            }
        }, cfg);
        expect(emit.getCalls()).to.deep.eql([]);

    });


    it('FileName is not a xml ', async () => {
        cfg = {
            pattern: ''
        };
        await attachmentToJson.process.bind({
            emit
        })({
            attachments: {
                'po.txt': {
                    url: mockSever
                }
            }
        }, cfg);
        expect(emit.getCalls()).to.deep.eql([]);

    });

    it('XML to large', async () => {
        let error;
        try {
            await attachmentToJson.process.bind({
                emit
            })({
                attachments: {
                    'po.xml': {
                        url: mockSever,
                        size: '5242881'
                    }
                }
            }, cfg);
        } catch (e) {
            error = e;
        }
        expect(error.message).to.be.include('File limit is: 5242880, file given was: 5242881.');

    });

    it('Response Error', async () => {
        let error;
        let failURL = 'http://steward.marathon.mesos:8091/files/1cfc3a71-d7a7-44e6-a15e-ae18860d537c';

        try {
            await attachmentToJson.process.bind({
                emit
            })({
                attachments: {
                    'po.xml': {
                        url: failURL
                    }
                }
            }, cfg);
        } catch (e) {
            error = e;
        }
        expect(error.message).to.be.exist;

    });


    it('Convert attachment to json', async () => {

        await attachmentToJson.process.bind({
            emit
        })({
            attachments: {
                'po.xml': {
                    url: mockSever
                }
            }
        }, cfg);

        const results = produceString(emit.getCalls());
        console.log('XML attachment 2 JSON results: %j ', results);
        expect(JSON.parse(results)).to.be.deep.equal(json);
    });
});
