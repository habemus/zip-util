const assert = require('assert');
const path   = require('path');

const fse    = require('fs-extra');
const should = require('should');
const mockery = require('mockery');

const aux = require('../aux');

describe('zip-util#zipDownload(fileUrl, destinationPath)', function () {

  beforeEach(function () {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    mockery.registerMock('request', function () {
      return fse.createReadStream(aux.fixturesPath + '/html5up-multiverse.zip');
    });

    return aux.setup();
  });

  afterEach(function () {
    mockery.disable();

    return aux.teardown();
  });

  it('should unzip the downloaded zip file to the destinationPath', function () {

    // require within test so that dependencies are mocked
    const zipUtil = require('../../lib');

    var destPath = aux.tmpPath + '/html5up-multiverse';

    return zipUtil.zipDownload('http://somewebsite.com/zip-file.zip', destPath)
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
});