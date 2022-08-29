/* eslint-env node, jasmine */

const { expect } = require('chai');
const nock = require('nock');

require('chai').should(); // expect is assertion styles used my elastic.io
const sinon = require('sinon');

const logger = require('@elastic.io/component-logger')();

const json = require('./data/po.json');
const attachmentToJson = require('../lib/actions/attachmentToJson');

function produceString(log, output) {
  let string = '';
  for (let i = 0; i < output.length; i += 1) {
    log.info(output[i].args[1].body);
    if (i !== 0) {
      string += ',\n';
    }
    string += JSON.stringify(output[i].args[1].body);
  }
  return string;
}

// eslint-disable-next-line func-names
describe('should convert XML attachment 2 JSON', function () {
// eslint-disable-next-line no-invalid-this
  this.timeout(60000);

  const mockSever = 'http://test.env.mock';
  let cfg = {
    pattern: '(.xml)',
  };
  let self;

  before(() => {
    nock(mockSever)
      .get('/')
      .replyWithFile(200, 'spec/data/po.xml');

    nock(mockSever)
      .get('/EmptyFile')
      .reply(200);
  });

  beforeEach(() => {
    self = {
      emit: sinon.spy(),
      logger,
    };

    cfg = {
      pattern: '(.xml)',
    };
  });

  it('FileName undefined ', async () => {
    await attachmentToJson.process.bind(self)({
      attachments: {
        undefined: {
          url: mockSever,
        },
      },
    }, cfg);
    expect(self.emit.getCalls()).to.deep.eql([]);
  });

  it('FileName does not match pattern ', async () => {
    cfg = {
      pattern: '(test.xml)',
    };
    await attachmentToJson.process.bind(self)({
      attachments: {
        'po.xml': {
          url: mockSever,
        },
      },
    }, cfg);
    expect(self.emit.getCalls()).to.deep.eql([]);
  });

  it('fileName is not .xml ', async () => {
    cfg = {
      pattern: '',
    };
    await attachmentToJson.process.bind(self)({
      attachments: {
        'po.txt': {
          url: mockSever,
        },
      },
    }, cfg);
    expect(self.emit.getCalls()).to.deep.eql([]);
  });

  it('XML too large', async () => {
    let error;
    try {
      await attachmentToJson.process.bind(self)({
        attachments: {
          'po.xml': {
            url: mockSever,
            size: '5242881',
          },
        },
      }, cfg);
    } catch (e) {
      error = e;
    }
    expect(error.message).to.include('File limit is: 5242880 byte, file given was: 5242881 byte.');
  });

  it('Response Error', async () => {
    let error;
    const failURL = 'http://steward.marathon.mesos:8091/files/1cfc3a71-d7a7-44e6-a15e-ae18860d537c';

    try {
      await attachmentToJson.process.bind(self)({
        attachments: {
          'po.xml': {
            url: failURL,
          },
        },
      }, cfg);
    } catch (e) {
      error = e;
    }
    // eslint-disable-next-line no-unused-expressions
    expect(error.message).to.exist;
  });

  it('Empty attachment', async () => {
    let error;

    try {
      await attachmentToJson.process.bind(self)({
        attachments: {
          'po.xml': {
            url: `${mockSever}/EmptyFile`,
          },
        },
      }, cfg);
    } catch (e) {
      error = e;
    }
    // eslint-disable-next-line no-unused-expressions
    expect(error.message).to.be.equal('Empty attachment received for file po.xml');
  });

  it('Convert attachment to JSON', async () => {
    await attachmentToJson.process.bind(self)({
      attachments: {
        'po.xml': {
          url: mockSever,
        },
      },
    }, cfg);

    const results = produceString(self.logger, self.emit.getCalls());
    self.logger.info('XML attachment 2 JSON results: %j ', results);
    expect(JSON.parse(results)).to.deep.equal(json);
  });
});
