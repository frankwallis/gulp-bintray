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

//process.setMaxListeners(0);

import Q = require('q');
var Bintray = require('bintray');
var gutil = require('gulp-util');
var through = require('through2');

//var inq = require('inquirer'),

//module.exports = function (filename) {
//	var firstFile = false;
//	var zip = new AdmZip();
//
//	return through.obj(function (file, enc, cb) {
//		if (file.isNull()) {
//			_this;.push(file);
//			return cb();
//		}

//		if (file.isStream()) {
//			_this;.emit('error', new gutil.PluginError('gulp-zip', 'Streaming not supported'));
//			return cb();
//		}

//		if (!firstFile) {
//			firstFile = file;
//		}

//		var relativePath = file.path.replace(file.cwd + path.sep, '');
//		zip.addFile(relativePath, file.contents);
//		cb()
//	}, function (cb) {
//		if (!firstFile) {
//			return cb();
//		}

//		_this;.push(new gutil.File({
//			cwd: firstFile.cwd,
//			base: firstFile.cwd,
//			path: path.join(firstFile.cwd, filename),
//			contents: zip.toBuffer()
//		}));
//		cb();
//	});
//};

interface IBintrayPackage {
	name?: string;
	version?: string;
	desc?: string;
	licenses?: Array<string>;
	labels?: Array<string>;
}

interface IBintrayOptions {
	username: string;
	repository?: string;
	organization?: string;
	apikey?: string;
	baseUrl?: string;
	pkg?: IBintrayPackage;
};

//function BintrayPlugin(options: any, oncomplete: any) {
class BintrayPlugin {

//	public static Factory(options: any) {
   
	//var options = _this;.options({
	//	user: null,
	//	apikey: null,
	//	baseUrl: null,
	//	pkg: {
	//		repo: null,
	//		userOrg: null,
	//		name: null,
	//		version: null,
	//		desc: null,
	//		licenses: null,
	//		labels: null
	//	}
	//});

	constructor(private options: any, private oncomplete: any) {		
		//var projectPackage = { version: "323", name: "Myname" };
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

		return through.obj(eachFile2);
	}

	private bintray;
	private projectPackage;
	
	private checkAndCreatePackage(name) {
		//return Q.fcall(() => bintray.getPackage(name))
		return bintray.getPackage(name)
			.then((res) => {
				gutil.log(gutil.colors.yellow("Package '" + res.data.name + "' already exists."));
			}, (err) => {
				if(err.code === 404) {
					return bintray.createPackage(name)
						.then((res) => {
							gutil.log(gutil.colors.green("Successfully created new package '" + res.data.name + "'."));
						}, (err2) => {
							gutil.log(gutil.colors.red("Failed to created new package '" + name));
						});
				}
				else
				{
					gutil.log(gutil.colors.red("Error getting package '" + name));		
				}
			});
	}

	private uploadFiles(files) {
		//var filesDestination = "https://bintray.com/" + bintray.endpointBase + "/" + options.pkg.name + "/" + options.pkg.version + "/files";
		//gutil.log("Deploying files to '" + filesDestination + "'");

		var promises = [];
		files.forEach((srcPath) => {	
			// replace backslash with forward slash
			srcPath = srcPath.replace(/\\/g,"/");
			var remotePath = srcPath.replace(/^\/|\/$/g, '') + ';';
				
			promises.push(
				bintray.uploadPackage(options.pkg.name, options.pkg.version, srcPath, remotePath)
					.done((res) => {},

					(err) => {
						gutil.log(gutil.colors.red('Failed deploying ' + srcPath + ' to remote path ' + remotePath + ' [' + err.code + " - " + err.status + ']'));
					})
			);
		});

		return Q.allSettled(promises).then((err) => gutil.log("succeeeeeeeeeeeeeeeeeeded " + err.length), () => gutil.log("FAIIIIIIIIIIILEEEEED"));
	}

	private checkAndCreatePackage2(name) {
		//return Q.fcall(() => bintray.getPackage(name))
		if(createdPackage)
			return Q(true);

		createdPackage = true;

		return bintray.getPackage(name)
			.then((res) => {
				gutil.log(gutil.colors.yellow("Package '" + res.data.name + "' already exists."));
			}, (err) => {
				if(err.code === 404) {
					return bintray.createPackage(name)
						.then((res) => {
							gutil.log(gutil.colors.green("Successfully created new package '" + res.data.name + "'."));
						}, (err2) => {
							gutil.log(gutil.colors.red("Failed to created new package '" + name));
						});
				}
				else
				{
					gutil.log(gutil.colors.red("Error getting package '" + name));		
				}
			});
	}

	private uploadFile2(file) {
		// replace backslash with forward slash
		var srcPath = file.relative.replace(/\\/g,"/");
		var remotePath = srcPath.replace(/^\/|\/$/g, '') + ';';

		return bintray.uploadPackage(options.pkg.name, options.pkg.version, srcPath, remotePath)
				.then((res) => {}, (err) => {
						gutil.log(gutil.colors.red('Failed deploying ' + srcPath + ' to remote path ' + remotePath + ' [' + err.code + " - " + err.status + ']'));
					})
	
	}

	private filelist = [];
	private createdPackage = false;

	private eachFile(file, encoding, done) {
		if (file.isNull()) {
			this.push(file);
			return done();
		}

		if (file.isStream()) {
			_this.emit('error', new gutil.PluginError('gulp-zip', 'Streaming not supported'));
			return done();
		}

		if (filelist.length < 6) 
		filelist.push(file.relative);


		this.push(file);
		return done();
	}

	private eachFile2(file, encoding, done) {
		this.setMaxListeners(0);

		if (file.isNull()) {
			gutil.log("IsNull");
			this.push(file);
			return done();
		}

		if (file.isStream()) {
			this.emit('error', new gutil.PluginError('gulp-zip', 'Streaming not supported'));
			return done();
		}

		//if (filelist.length < 6) 
		//filelist.push(file.relative);

		//this.push(file);

		remaining.push(checkAndCreatePackage2(options.pkg.name)
			.then(() => { return uploadFile2(file); }, () => gutil.log("HEEEEEEEEEEEEEEEEEEEEERRRRRRRRREEEEEE"))
			.then(() => gutil.log("Uploaded"))
			.fail(() => gutil.log("Failed"))
			.done(done()))
		
		//this.push(file);
		return;
	}

	private remaining = [];

	private endStream2(done) {
		Q.allSettled(remaining).done(() => { oncomplete(); done(); });
		//return done();
	}

	private endStream(done) {
		

		gutil.log(gutil.colors.yellow('Uploading ' + filelist.length + ' files to' + options.repository + '/' + options.pkg.name ));
		
		if (filelist.length === 0) {
			return done();
		}
	
		//Q.fcall(() => { return checkAndCreatePackage(options.pkg.name); })
		checkAndCreatePackage(options.pkg.name)
			.then(() => { return uploadFiles(filelist); }, () => gutil.log("HEEEEEEEEEEEEEEEEEEEEERRRRRRRRREEEEEE"))
			.then(() => {
				gutil.log(gutil.colors.green("Successfully uploaded to Bintray")); 
			})
			.fail((err) => {
				gutil.log(gutil.colors.red('Failed to upload to Bintray [' + err.code + " - " + err.status + ']'));
			})
			.done(done());
	}
	//return through.obj(eachFile, endStream);
	//return through.obj(eachFile2);
	//return through.obj(eachFile, endStream);
}

export = BintrayPlugin;