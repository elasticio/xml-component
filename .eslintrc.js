module.exports = {
  extends: 'airbnb-base',
  env: {
    mocha: true,
  },
  rules: {
    'no-plusplus': 1,
    'max-len': ['error', { code: 160 }],
    quotes: ['error', 'single'],
    'no-await-in-loop': 1,
    'no-restricted-syntax': 1,
    camelcase: 0,
    'no-restricted-globals': 1,
    'no-lonely-if': 0,
    'consistent-return': 1,
    'no-prototype-builtins': 0,
  },
};
