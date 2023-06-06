const packageJson = require('../package.json');
const compJson = require('../component.json');

exports.getUserAgent = () => {
  const { name: compName } = packageJson;
  const { version: compVersion } = compJson;
  const libVersion = packageJson.dependencies['@elastic.io/component-commons-library'];
  return `${compName}/${compVersion} component-commons-library/${libVersion}`;
};

const MB_TO_BYTES = 1024 * 1024;
exports.MAX_FILE_SIZE = process.env.MAX_FILE_SIZE * MB_TO_BYTES || 10 * MB_TO_BYTES;

const f = (n) => Math.round(n / 1024 / 1024);
exports.memUsage = () => {
  const usage = process.memoryUsage();
  // eslint-disable-next-line max-len
  return (`Memory usage - rss: ${f(usage.rss)}, heapTotal: ${f(usage.heapTotal)}, heapUsed: ${f(usage.heapUsed)}, external: ${f(usage.external)}, arrayBuffers: ${f(usage.arrayBuffers)}`);
};
