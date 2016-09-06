const path = require('path');

const Bluebird = require('bluebird');
const fse      = require('fs-extra');

const FIXTURES_PATH = path.join(__dirname, '../fixtures');
const TMP_PATH      = path.join(__dirname, '../tmp');

exports.fixturesPath = FIXTURES_PATH;
exports.tmpPath      = TMP_PATH;

exports.setup = function () {
  fse.emptyDirSync(TMP_PATH);
};

exports.teardown = function () {
  fse.emptyDirSync(TMP_PATH);
};
