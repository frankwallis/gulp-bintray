gulp-bintray
============

gulp task to upload files to bintray

example usage: 
```javascript
var gulp = require('gulp');
var zip = require('gulp-zip');
var bintray = require('./lib/index.js');
var clean = require('gulp-clean');
var bump = require('gulp-bump');

var bintrayopts = {
	username: 'bintrayuser',
	organization: 'bintrayorgs';	// default: username
	repository: 'gulp-plugins',
	pkg: {
		name: 'bintraypackage',
		version: null;			        // default: package.version
	  desc: null;				          // default: 'Automatically created gulp-bintray package'
	  licenses?: null;	          // default: ['MIT'] 
  }

	apikey: '99999999999999999999999999999999999',
	baseUrl: null;		// default: Bintray.apiBaseUrl
}

gulp.task('bump', ['compile'], function(){
    return gulp.src('./package.json')
        .pipe(bump({type:'minor'}))
        .pipe(gulp.dest('./'));
});

gulp.task('bintray', ['compile', 'bump'], function() {
    return gulp.src([ '**/*.*', '!node_modules/**' ])
        .pipe(zip('archive.zip'))	
        .pipe(gulp.dest('.'))
        .pipe(bintray(bintrayopts))
        .pipe(clean())
        
gulp.task('bintraysrc', ['compile', 'bump'], function() {
    return gulp.src([ '**/*.*', '!node_modules/**' ])
        .pipe(zip('archive.zip'))	
        .pipe(gulp.dest('.'))
        .pipe(bintray(bintrayopts))
        .pipe(clean())

});

```

Credits:
========

- https://github.com/shayke/grunt-bintray-deploy
- https://github.com/h2non/node-bintray
