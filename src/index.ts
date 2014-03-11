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

interface IBintrayPackage {
	name?: string;				// default: package.name
	version?: string;			// default: package.version
	desc?: string;				// default: 'Automatically created gulp-bintray package'
	licenses?: Array<string>;	// default: ['MIT'] 
}

interface IBintrayOptions {
	username: string;
	organization?: string;	// default: username
	repository?: string;   
	pkg?: IBintrayPackage;
	apikey?: string;
	baseUrl?: string;		// default: Bintray.apiBaseUrl
}

// Gulp plugin to upload files to bintray
// For example usage see gulpfile.js

function bintray(options: any) {
    // setup some defaults
	options.organization = options.organization || options.username;
	options.baseUrl = options.baseUrl || Bintray.apiBaseUrl;
	
	// load package.json to get name & version
    var projectPackage = require(process.cwd() + '/package.json');

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
		
		gutil.log(gutil.colors.yellow('Uploading ' + filelist.length + ' file(s) to ' + options.repository + '/' + options.pkg.name ));
		
		if (filelist.length === 0) {
			return done();
		}
	
		checkAndCreatePackage(options.pkg.name)
			.then((res) => {  
					return uploadFiles(filelist); 
				}, (err) => {
					throw err;
				})
			.then(() => {
				gutil.log(gutil.colors.green("Successfully uploaded all files to Bintray.")); 
			}, (err) => {
				gutil.log(gutil.colors.red('Failed to upload all files to Bintray.'));
				_stream.emit('error', new gutil.PluginError('gulp-bintray', 'Failed to upload all files to Bintray.'));
			}).done(done);
	}

	function formatErr(err) {
		return ' [' + err.code + " - " + err.status + ']';
	}

	function checkAndCreatePackage(name) {
		return bintray.getPackage(name)
			.then((resGet) => {
				gutil.log(gutil.colors.yellow("Package '" + resGet.data.name + "' already exists."));
			}, (errGet) => {
				if(errGet.code === 404) {
					return bintray.createPackage(name)
						.then((resCreate) => {
							gutil.log(gutil.colors.green("Successfully created new package '" + resCreate.data.name + "'."));
						}, (errCreate) => {
							gutil.log(gutil.colors.red("Failed to create new package '" + name + "'" + formatErr(errCreate)));
							throw errCreate;
						});
				}
				else
				{
					gutil.log(gutil.colors.red("Error getting package '" + name + "'" + formatErr(errGet)));
					throw errGet;	
				}
			});
	}

	function uploadFiles(files) {
		var funcs = [];
		
		files.forEach((file) => {	
			// replace backslash with forward slash
			var srcPath = file.relative.replace(/\\/g,"/");
			// strip out bad characters
			var remotePath = srcPath.replace(/^\/|\/$/g, '') + ';'; // ';' needed to fix the url

			funcs.push(() => { 
				try {
					return bintray.uploadPackage(options.pkg.name, options.pkg.version, srcPath, remotePath)
						.then((res) => {
								_stream.push(file);
								gutil.log(gutil.colors.yellow('Deployed ' + srcPath + ' to remote path ' + remotePath));
							}, (err) => {
								gutil.log(gutil.colors.red('Failed to deploy ' + srcPath + ' to remote path ' + remotePath + formatErr(err)));
								throw err;
							})
				} catch(err) {
					gutil.log(gutil.colors.red('Failed to deploy ' + srcPath + ' to remote path ' + remotePath + formatErr(err)));
					return Q.reject(err);
				}
			});
		});

		var result = Q.resolve(true);
		funcs.forEach((f) => {
			result = result.then(() => { return f() }, (err) => { throw err; } );
		});

		return result;
	}

	return through.obj(eachFile, endStream);
}

export = bintray;