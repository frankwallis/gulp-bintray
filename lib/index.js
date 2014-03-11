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
    gutil.log(__dirname + '/package.json');
    gutil.log(require.main.filename + '/package.json');
    gutil.log(process.cwd() + '/package.json');
    var projectPackage = require(process.cwd() + '/package.json');

    // These don't work when specifying directly inside pkg above
    options.organization = options.organization || options.username;
    options.baseUrl = options.baseUrl || Bintray.apiBaseUrl;

    options.pkg.name = options.pkg.name || projectPackage.name;
    options.pkg.version = options.pkg.version || projectPackage.version;
    options.pkg.desc = options.pkg.desc || 'Automatically created gulp-bintray package';
    options.pkg.licenses = options.pkg.licenses || ['MIT'];

    var bintray = new Bintray(options);

    gutil.log(JSON.stringify(options));

    var filelist = [];
    var _stream = this;

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

        if (filelist.length < 16)
            filelist.push(file);

        return done();
    }

    function endStream(done) {
        gutil.log(gutil.colors.yellow('Uploading ' + filelist.length + ' files to' + options.repository + '/' + options.pkg.name));

        if (filelist.length === 0) {
            return done();
        }

        checkAndCreatePackage(options.pkg.name).then(function (res) {
            return uploadFiles(filelist);
        }, function (err) {
            return Q.reject(err);
        }).then(function () {
            gutil.log(gutil.colors.green("Successfully uploaded all files to Bintray"));
            done();
        }, function (err) {
            gutil.log(gutil.colors.red('Failed to upload to Bintray [' + err.code + " - " + err.status + ']'));
            done();
        });
    }

    function checkAndCreatePackage(name) {
        return bintray.getPackage(name).then(function (res) {
            gutil.log(gutil.colors.yellow("Package '" + res.data.name + "' already exists."));
        }, function (err) {
            if (err.code === 404) {
                return bintray.createPackage(name).then(function (res) {
                    gutil.log(gutil.colors.green("Successfully created new package '" + res.data.name + "'."));
                }, function (err2) {
                    gutil.log(gutil.colors.red("Failed to created new package '" + name));
                    return Q.reject(err2);
                });
            } else {
                gutil.log(gutil.colors.red("Error getting package '" + name));
                return Q.reject(err);
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
                return bintray.uploadPackage(options.pkg.name, options.pkg.version, srcPath, remotePath).then(function (res) {
                    _stream.push(file);
                    gutil.log(gutil.colors.yellow('Deployed ' + srcPath + ' to remote path ' + remotePath));
                }, function (err) {
                    gutil.log(gutil.colors.red('Failed deploying ' + srcPath + ' to remote path ' + remotePath + ' [' + err.code + " - " + err.status + ']'));
                });
            });
        });

        var result = null;
        funcs.forEach(function (f) {
            if (result === null)
                result = f();
            else
                result = result.then(function () {
                    return f();
                }, function (err) {
                    return Q.reject(err);
                });
        });

        return result;
    }

    return through.obj(eachFile, endStream);
}

module.exports = bintray;
//# sourceMappingURL=index.js.map
