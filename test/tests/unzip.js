const assert = require('assert');
const path   = require('path');

const fse    = require('fs-extra');
const should = require('should');

const aux = require('../aux');

const zipUtil = require('../../lib');

describe('zip-util#unzip(sourcePath, destinationPath, cb)', function () {

  beforeEach(function () {
    return aux.setup();
  });

  afterEach(function () {
    return aux.teardown();
  });

  it('should unzip the file at the sourcePath to the destinationPath', function () {

    var sourcePath = aux.fixturesPath + '/html5up-multiverse.zip';
    var destPath   = aux.tmpPath + '/html5up-multiverse';

    return zipUtil.unzip(sourcePath, destPath)
      .then(() => {
        // check that the destPath has the following files
        var contents = [
          'assets',
          'images',
          'index.html',
          'LICENSE.txt',
          'README.txt'
        ];
        fse.readdirSync(destPath).forEach((content) => {
          contents.indexOf(content).should.not.equal(-1);
        });
      });

  });

  it('should require the sourcePath to be passed as first argument', function () {
    assert.throws(function () {
      zipUtil.unzip(undefined, aux.tmpPath + '/html5up-multiverse');
    });
  });

  it('should require the destinationPath to be passed as second argument', function () {
    assert.throws(function () {
      zipUtil.unzip(aux.fixturesPath + '/html5up-multiverse.zip', undefined);
    });
  });
});