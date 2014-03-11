/*
* gulp-bintray
* https://github.com/frankwallis/gulp-bintray
*
* Copyright (c) 2014 Frank Wallis
* Licensed under the MIT license.
*/
/// <reference path="../definitions/node/node.d.ts" />
/// <reference path="../definitions/q/q.d.ts" />
/// <reference path="../definitions/through/through.d.ts" />
var Q = require('q');
var Bintray = require('bintray');
var gutil = require('gulp-util');
var through = require('through2');

function bintray(options) {
    // load package.json to get version etc
    var projectPackage = require(process.cwd() + '/package.json');

    // setup some defaults
    options.organization = options.organization || options.username;
    options.baseUrl = options.baseUrl || Bintray.apiBaseUrl;

    options.pkg.name = options.pkg.name || projectPackage.name;
    options.pkg.version = options.pkg.version || projectPackage.version;
    options.pkg.desc = options.pkg.desc || 'Automatically created gulp-bintray package';
    options.pkg.licenses = options.pkg.licenses || ['MIT'];

    var bintray = new Bintray(options);
    var filelist = [];
    var _stream = null;

    function eachFile(file, encoding, done) {
        _stream = this;

        if (file.isNull()) {
            _stream.emit('error', new gutil.PluginError('gulp-bintray', 'file is null'));
            _stream.push(file);
            return done();
        }

        if (file.isStream()) {
            _stream.emit('error', new gutil.PluginError('gulp-bintray', 'Streaming not supported'));
            return done();
        }

        filelist.push(file);
        return done();
    }

    function endStream(done) {
        gutil.log(gutil.colors.yellow('Uploading ' + filelist.length + ' file(s) to ' + options.repository + '/' + options.pkg.name));

        if (filelist.length === 0) {
            return done();
        }

        checkAndCreatePackage(options.pkg.name).then(function (res) {
            return uploadFiles(filelist);
        }, function (err) {
            throw err;
        }).then(function () {
            gutil.log(gutil.colors.green("Successfully uploaded all files to Bintray."));
        }, function (err) {
            gutil.log(gutil.colors.red('Failed to upload all files to Bintray.'));
            _stream.emit('error', new gutil.PluginError('gulp-bintray', 'Failed to upload all files to Bintray.'));
        }).done(done);
    }

    function formatErr(err) {
        return ' [' + err.code + " - " + err.status + ']';
    }

    function checkAndCreatePackage(name) {
        return bintray.getPackage(name).then(function (resGet) {
            gutil.log(gutil.colors.yellow("Package '" + resGet.data.name + "' already exists."));
        }, function (errGet) {
            if (errGet.code === 404) {
                return bintray.createPackage(name).then(function (resCreate) {
                    gutil.log(gutil.colors.green("Successfully created new package '" + resCreate.data.name + "'."));
                }, function (errCreate) {
                    gutil.log(gutil.colors.red("Failed to create new package '" + name + "'" + formatErr(errCreate)));
                    throw errCreate;
                });
            } else {
                gutil.log(gutil.colors.red("Error getting package '" + name + "'" + formatErr(errGet)));
                throw errGet;
            }
        });
    }

    function uploadFiles(files) {
        var funcs = [];

        files.forEach(function (file) {
            // replace backslash with forward slash
            var srcPath = file.relative.replace(/\\/g, "/");
            var remotePath = srcPath.replace(/^\/|\/$/g, '') + ';';

            funcs.push(function () {
                try  {
                    return bintray.uploadPackage(options.pkg.name, options.pkg.version, srcPath, remotePath).then(function (res) {
                        _stream.push(file);
                        gutil.log(gutil.colors.yellow('Deployed ' + srcPath + ' to remote path ' + remotePath));
                    }, function (err) {
                        gutil.log(gutil.colors.red('Failed to deploy ' + srcPath + ' to remote path ' + remotePath + formatErr(err)));
                        throw err;
                    });
                } catch (err) {
                    gutil.log(gutil.colors.red('Failed to deploy ' + srcPath + ' to remote path ' + remotePath + formatErr(err)));
                    return Q.reject(err);
                }
            });
        });

        var result = Q.resolve(true);
        funcs.forEach(function (f) {
            result = result.then(function () {
                return f();
            }, function (err) {
                throw err;
            });
        });

        return result;
    }

    return through.obj(eachFile, endStream);
}

module.exports = bintray;
//# sourceMappingURL=index.js.map
