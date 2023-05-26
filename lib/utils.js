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
