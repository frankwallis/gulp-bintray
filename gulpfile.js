var gulp = require('gulp');
var tsc = require('gulp-tsc');
var zip = require('gulp-zip');
var bintray = require('./lib/index.js');
var clean = require('gulp-clean');
var bump = require('gulp-bump');

var paths = {
	src: 'src/**/*.ts',
	dest: 'lib/'
};
 
var tscopts = {
	out: 'index.js',
	module: 'commonjs',
	declaration: true,
	sourcemap: true
};

var bintrayopts = {
	username: 'bintrayuser',
	apikey: '123456789012345678901234567890',
	repository: 'gulp-plugins',
	pkg: {
		name: 'gulp-bintray'
	}
}

gulp.task('compile', function() {
    return gulp.src(paths.src)
        .pipe(tsc(tscopts, this))
        .pipe(gulp.dest(paths.dest));
});
 
gulp.task('bump', ['compile'], function(){
    return gulp.src('./package.json')
        .pipe(bump({type:'minor'}))
        .pipe(gulp.dest('./'));
});

gulp.task('bintray', function() {
    return gulp.src([ '**/*.*', '!node_modules/**' ])
        .pipe(bintray(bintrayopts))
        //.pipe(gulp.dest('./dist/'));
});

gulp.task('bintray', ['compile', 'bump'], function() {
    return gulp.src([ '**/*.*', '!node_modules/**' ])
        .pipe(zip('archive.zip'))	
        .pipe(gulp.dest('.'))
        .pipe(bintray(bintrayopts))
        .pipe(clean())
});

gulp.task('release', ['compile', 'bump', 'bintray' ], function() {
    console.log('Released minor version ' + require('./package.json').version);
});

gulp.task('default', [ 'compile' ]);
