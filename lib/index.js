// native
const fs   = require('fs');
const path = require('path');

// third-party
const yazl       = require('yazl');
const yauzl      = require('yauzl');
const gracefulFs = require('graceful-fs');
const mkdirp     = require('mkdirp');
const tmp        = require('tmp');
const request    = require('request');
const Bluebird   = require('bluebird');
const gs         = require('glob-stream');

// directory file names end with '/'
const DIR_REGEXP = /\/$/;

// make sure tmp cleans up :)
tmp.setGracefulCleanup();

/**
 * Unzips a zip file to the given destination
 * @param  {String}   sourcePath
 *         path to the file to be unzipped
 * @param  {String}   destinationPath 
 *         path to the root destination, where unzipped files will be written to 
 */
function unzip(sourcePath, destinationPath) {
  // check for required arguments
  if (!sourcePath)      { throw new Error('sourcePath is required'); }
  if (!destinationPath) { throw new Error('destinationPath is required'); }

  // how to avoid crashing, according to the lib author
  // https://www.npmjs.com/package/yauzl#how-to-avoid-crashing

  return new Bluebird((resolve, reject) => {

    yauzl.open(sourcePath, function (err, zipFile) {
      if (err) {
        reject(err);
        return;
      };

      zipFile.on('entry', function (entry) {
        if (DIR_REGEXP.test(entry.fileName)) {
          // is a directory entry:
          // simply make the directory

          var entryDir = path.join(destinationPath, entry.fileName);
          mkdirp(entryDir, function (err) {
            if (err) {
              reject(err);
              return;
            }
          });

        } else {
          // is a file entry:
          // make the directory and then write the file

          zipFile.openReadStream(entry, function(err, readStream) {
            if (err) {
              reject(err);
              return;
            }

            var entryPath = path.join(destinationPath, entry.fileName);
            // as the filename may come like '/path/to/file.js',
            // its directory should be parsed from the file's path
            var entryDir  = path.parse(entryPath).dir;

            // create the directory for the entry
            mkdirp(entryDir, function (err) {
              if (err) {
                reject(err);
                return;
              }

              // write the file to the destination
              readStream.pipe(gracefulFs.createWriteStream(entryPath));
            });

            // handle errors on the entry readStream
            readStream.on('error', function (err) {
              reject(err);
            });
          });
        }
      });
      
      // error handler on zipFile
      zipFile.on('error', function (err) {
        reject(err);
      });

      // whenever the zipFile close event is emitted,
      // that means that all writes were done.
      zipFile.on('close', function () {
        resolve();
      });
    });

  });
}

/**
 * Downloads and unzips
 * Clears the original downloaded zip
 * @param  {HStorage} storage
 * @param  {String}   filename     The file to be downloaded
 * @param  {String}   destinationPath  Path to where the zipped archive should be extracted
 */
function zipDownload(fileUrl, destinationPath) {
  if (typeof fileUrl !== 'string') {
    throw new TypeError('fileUrl must be a String');
  }

  if (typeof destinationPath !== 'string') {
    throw new TypeError('destinationPath must be a String');
  }

  return new Bluebird((resolve, reject) => {

    // create a temporary file 
    tmp.file(function _tempFileCreated(err, tmpPath, fd, cleanupCallback) {
      if (err) {
        reject(err);
        return;
      }

      request(fileUrl)
        // create write stream using the file descriptor given
        // TODO: 
        // https://github.com/raszi/node-tmp/issues/52
        // until issue is solved, 
        // we will use the tmpPath instead of the fd for the writeStream
        // (awkward things happen when using the fd due to automatic cleanup)
        // .pipe(fs.createWriteStream(null, { fd: fd }))
        .pipe(fs.createWriteStream(tmpPath))
        .on('finish', function () {
          // on download completion, start unzip
          // Obs: use the promise callback in order 
          // to keep access to the scope's cleanupCallback function
          unzip(tmpPath, destinationPath)
            .then(() => {
              cleanupCallback();
              // callback with success:
              resolve();
            })
            .catch((err) => {
              cleanupCallback();
              reject(err);
              return;
            });
        })
        .on('error', function (err) {
          
          cleanupCallback();
          reject(err);
        });
    });

  });
}

/**
 * Zips
 * @param  {String|Array[String]} glob
 * @param  {Object} globOptions
 * @return {Stream}
 */
function zip(glob, globOptions) {
  var zipFile = new yazl.ZipFile();

  // use globStream to retrieve files to be zipped
  var fileStream = gs.create(glob, globOptions);

  fileStream.on('data', function (file) {
    // file has path, base, and cwd attrs
    var metadataPath = path.relative(file.base, file.path);

    // check if the file is a directory
    var stats = fs.lstatSync(file.path);

    if (stats.isDirectory()) {
      // is directory, add it as directory
      zipFile.addEmptyDirectory(metadataPath);
    } else {
      // is file, thus create read stream
      var readStream = fs.createReadStream(file.path);
      zipFile.addReadStream(readStream, metadataPath);

      // propagate read errors
      readStream.on('error', function (err) {
        zipFile.emit('error', err);
      });
    }
  });

  fileStream.on('end', function () {
    zipFile.end();
  });

  return zipFile.outputStream;
}

exports.zipDownload = zipDownload;
exports.unzip       = unzip;
exports.zip         = zip;
