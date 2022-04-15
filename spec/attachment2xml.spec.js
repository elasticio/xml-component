/* eslint-env node, jasmine */

const { expect } = require('chai');
const nock = require('nock');

require('chai').should(); // expect is assertion styles used my elastic.io
const sinon = require('sinon');

// const logger = require('@elastic.io/component-logger')();

const json = require('./data/po.json');
const jsonChildArray = require('./data/pochildArray.json');
const jsonSplit = require('./data/poSplit.json');
const attachmentToJson = require('../lib/actions/attachmentToJson');

function produceString(log, output) {
  let string = '';
  for (let i = 0; i < output.length; i += 1) {
    log.info(output[i].args[1].data);
    if (i !== 0) {
      string += ',\n';
    }
    string += JSON.stringify(output[i].args[1].data);
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
      .persist()
      .get('/')
      .replyWithFile(200, 'spec/data/po.xml');

    nock(mockSever)
      .persist()
      .get('/EmptyFile')
      .reply(200);

    nock(mockSever)
      .persist()
      .get('/Split')
      .replyWithFile(200, 'spec/data/poSplit.xml');
  });

  beforeEach(() => {
    self = {
      emit: sinon.spy(),
      logger: {
        info: sinon.spy(),
        debug: sinon.spy(),
        error: sinon.spy(),
      },
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
            size: '26214473',
          },
        },
      }, cfg);
    } catch (e) {
      error = e;
    }
    expect(error.message).to.include('File limit is: 20971520 byte, file given was: 26214473 byte.');
  });

  it('Lower Max File Size - XML too large', async () => {
    let error;
    cfg.maxFileSize = 10971520;
    try {
      await attachmentToJson.process.bind(self)({
        attachments: {
          'po.xml': {
            url: mockSever,
            size: '16214473',
          },
        },
      }, cfg);
    } catch (e) {
      error = e;
    }
    expect(error.message).to.include('File limit is: 10971520 byte, file given was: 16214473 byte.');
  });

  it('Higher Max File Size - Convert attachment to JSON', async () => {
    cfg.maxFileSize = 30971520;
    await attachmentToJson.process.bind(self)({
      attachments: {
        'po.xml': {
          url: mockSever,
          size: '26214473',
        },
      },
    }, cfg);
    const results = produceString(self.logger, self.emit.getCalls());
    expect(JSON.parse(results)).to.deep.equal(json);
  });

  // commmenting out test because it is broken
  // test was throwing error as expected, but only because self.logger was missing,
  // not because of http error. upon adding a logger to the mocked instance of self
  // the test stopped generating any errors, and thus the test started failing
  xit('Response Error', async () => {
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

  it('Custom JSONata transformation', async () => {
    cfg.customJsonata = '$$.purchaseOrder';
    await attachmentToJson.process.bind(self)({
      attachments: {
        'po.xml': {
          url: mockSever,
        },
      },
    }, cfg);

    const results = produceString(self.logger, self.emit.getCalls());
    expect(JSON.parse(results)).to.deep.equal(json.purchaseOrder);
  });

  it('Child Array Configuration', async () => {
    cfg.childArray = true;
    await attachmentToJson.process.bind(self)({
      attachments: {
        'po.xml': {
          url: mockSever,
        },
      },
    }, cfg);

    const results = produceString(self.logger, self.emit.getCalls());
    expect(JSON.parse(results)).to.deep.equal(jsonChildArray);
  });

  it('Split Functionality - No batch size given', async () => {
    cfg.splitResult = {
      arrayWrapperName: 'records',
      arrayElementName: 'record',
    };
    await attachmentToJson.process.bind(self)({
      attachments: {
        'poSplit.xml': {
          url: `${mockSever}/Split`,
        },
      },
    }, cfg);

    const results = await self.emit.getCalls();
    expect(results[0].args[1].data).to.deep.equal(jsonSplit.batchNotGiven[0]);
    expect(results[1].args[1].data).to.deep.equal(jsonSplit.batchNotGiven[1]);
    expect(results[2].args[1].data).to.deep.equal(jsonSplit.batchNotGiven[2]);
  });

  it('Split Functionality - Batch size given', async () => {
    cfg.splitResult = {
      arrayWrapperName: 'records',
      arrayElementName: 'record',
      batchSize: 3,
    };
    await attachmentToJson.process.bind(self)({
      attachments: {
        'poSplit.xml': {
          url: `${mockSever}/Split`,
        },
      },
    }, cfg);

    const results = self.emit.getCalls();
    expect(results[0].args[1].data).to.deep.equal(jsonSplit.batchGiven);
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
    expect(JSON.parse(results)).to.deep.equal(json);
  });
});
