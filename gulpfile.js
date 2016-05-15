/**
 * Created by Ilkka on 19.4.2016.
 */
"use strict";
require('es6-promise').polyfill();

//Gulp
var gulp               = require('gulp');
var $                  = require('gulp-load-plugins')();
var del                = require('del');
var runSequence        = require('run-sequence');
var browserSync        = require('browser-sync');
var merge              = require('merge-stream');
var path               = require('path');
var fs                 = require('fs');
var glob               = require('glob-all');
var historyApiFallback = require('connect-history-api-fallback');
var pkg                = require('./package.json');
var crypto             = require('crypto');
var ensureFiles        = require('./tasks/ensure-files.js');

//Static
var AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];
var DIST = 'dist';

/*
 Helpers
 */

var dist = function ( subPath ) {
  return !subPath ? DIST : path.join(DIST, subPath);
};

var styleTask = function ( src ){
  return gulp.src(src, {base: './'})
    .pipe($.sass())
    .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe($.cleanCss())
    .pipe(gulp.dest('.'))
    .pipe($.size({
      title: 'scss'
    }));
};

var styleModule = function(src, dest){
  return gulp.src(src)
    .pipe($.processhtml())
    .pipe($.htmlmin({
      collapseWhitespace: true,
      removeComments: true,
      sortAttributes: true,
      sortClassName: true
    }))
    .pipe(gulp.dest(dest))
    .pipe($.size({
      title: 'styleModule'
    }))
};

var imageminTask = function ( src, dest ) {
  return gulp.src(src)
    .pipe($.imagemin({
      progressive: true,
      interlaced: true
    }))
    .pipe(gulp.dest(dest))
    .pipe($.size({title: 'images'}));
};

var uglifyTask = function (src) {
  return gulp.src(src)
    .pipe($.uglify())
    .pipe(gulp.dest(dist()))
    .pipe($.size({
      title: 'uglify'
    }))
};

var cleanCss = function (src, dest) {
  return gulp.src(src)
    .pipe($.cleanCss())
    .pipe(gulp.dest(dest))
    .pipe($.size({
      title: 'cleanCss'
    }))
};

var minifyHtml = function (src) {
  return gulp.src(src, {base: 'dist'})
    .pipe($.processhtml())
    .pipe($.htmlmin({
      collapseWhitespace: true,
      removeComments: true,
      sortAttributes: true,
      sortClassName: true
    }))
    .pipe(gulp.dest(dist()))
    .pipe($.size({
      title: 'minifyHtml'
    }))
};

var minifyInline = function(src){
  return gulp.src(src, {base: 'dist'})
    .pipe($.minifyInline())
    .pipe(gulp.dest(dist()))
    .pipe($.size({
      title:'minifyInline'
    }))
};

var vulcanizeTask = function (src) {
  return gulp.src(src, {base: 'src'})
    .pipe($.vulcanize({
      stripComments: true,
      inlineCss: true,
      inlineScripts: true,
      stripExcludes: false,
      excludes: [
        '//fonts.googleapis.com/*',
        '../polymer/',
        '/styles/'
      ]
    }))
    .pipe(gulp.dest(dist()))
    .pipe($.size({
      title: 'vulcanize'
    }));
};

var crisperTask = function (src) {
  return gulp.src(src, {base: 'dist'})
    .pipe($.crisper({
      scriptInHead: false
    }))
    .pipe(gulp.dest(dist()))
    .pipe($.size({
      title: 'crisper'
    }));
};
/*
  Tasks
 */



//Build dist
gulp.task('build', ['clean'], function (cb) {
  runSequence(
    ['ensureFiles', 'copy', 'styles:dist'],
    ['images', 'fonts'],
    ['vulcanize', 'vulcanizePolymer'],
    'crisper',
    'minifyHtml',
    ['uglify', 'minifyInline'],
    cb);
});

//Prefix and clean css
gulp.task('styles', function(){
  return styleTask(['src/styles/src/dark-theme/dark-theme.scss']);
});

gulp.task('styles:dev', ['styles'], function () {
  return styleModule(['src/styles/src/**/*.html'], 'src/styles')
});

gulp.task('styles:dist',['styles'], function () {
  return styleModule(['src/styles/src/**/*.html'], dist('styles'));
});

//Check that all of the need files are there
gulp.task('ensureFiles', function (cb) {
  var requiredFiles = ['.bowerrc'];
  ensureFiles(requiredFiles.map(function (p) {
    return path.join(__dirname, p);
  }), cb);
});

//Minify images
gulp.task('images', function () {
  return imageminTask('src/images/**/*', dist('images'));
});

//Copy root files
gulp.task('copy', function () {
  var app = gulp.src([
    'src/images',
    'src/index.html',
    'src/manifest.json',
    'src/favicon.ico'
  ],{
    dot: true
  }).pipe(gulp.dest(dist()));

  var bower = gulp.src([
    'src/bower_components/webcomponentsjs/webcomponents-lite.min.js'
  ], {base:'src'}).pipe(gulp.dest(dist()));

  return merge(app, bower)
    .pipe($.size({
      title: 'copy'
    }));
});

//Search for assets and optimize
gulp.task('minifyHtml', function() {
  return minifyHtml(
    ['dist/**/*.html']);
});

gulp.task('minifyInline', function(){
  return minifyInline(
    ['dist/**/*.html']);
});

gulp.task('uglify', function () {
  return uglifyTask(
    ['dist/**/*.js', '!dist/bower_components/**/*.js']
  )
});

//Copy fonts
gulp.task('fonts', function() {
  return gulp.src(['src/fonts/**'])
    .pipe(gulp.dest(dist('fonts')))
    .pipe($.size({
      title: 'fonts'
    }));
});

//Watch the files and reload using browser-sync
gulp.task('serve', ['styles:dev'], function () {
  browserSync({
    port: 1337,
    notify: false,
    logPrefix: 'SNW',
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function (snippet) {
          return snippet;
        }
      }
    },
    https: false,
    server:{
      baseDir: ['src'],
      middleWare: [historyApiFallback()]
    }
  });

  gulp.watch(['src/**/*.html', '!src/bower_components/**/*.html', '!src/test/**/*', '!src/styles/**/*.html'], browserSync.reload);
  gulp.watch(['src/styles/**/*.scss'], ['styles:dev', browserSync.reload]);
  gulp.watch(['src/scripts/**/*.js'], browserSync.reload);
  gulp.watch(['src/images/**/*'], browserSync.reload);
});

// Build and serve the output from the dist build
gulp.task('serve:dist', ['build'], function() {
  browserSync({
    port: 1338,
    notify: false,
    logPrefix: 'SNW',
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function(snippet) {
          return snippet;
        }
      }
    },
    https: true,
    server: dist(),
    middleware: [historyApiFallback()]
  });
});

//Vulcanize
gulp.task('vulcanize', function () {
  return vulcanizeTask(
    ['src/elements/*.html']);
});

gulp.task('vulcanizePolymer', function(){
  return gulp.src(['src/bower_components/polymer/polymer.html', 'src/bower_components/polymer/polymer-mini.html', 'src/bower_components/polymer/polymer-micro.html'], {base: 'src'})
    .pipe($.vulcanize({
      stripComments: true,
      inlineCss: true,
      inlineScripts: true,
      stripExcludes: false,
      excludes: [
        '//fonts.googleapis.com/*'
      ]
    }))
    .pipe(gulp.dest(dist()))
    .pipe($.size({
      title: 'vulcanize'
    }));
});

// Clean output directory
gulp.task('clean', function() {
  return del(['.tmp', dist()]);
});

// Clean temp directory
gulp.task('cleanTmp', function() {
  return del(['.tmp']);
});

gulp.task('crisper', function () {
  return crisperTask(['dist/elements/**/*.html'])
});

//Default task
gulp.task('default',['build']);

//Build and deploy to gh pages !!RUN THIS
gulp.task('deploy-gh-pages', function (cb) {
  runSequence(
    'build',
    'gh-pages',
    cb);
});

//Deploy to gh-pages
gulp.task('gh-pages', function () {
  return gulp.src(dist('**/*'))
    .pipe($.ghPages({
      remoteUrl: 'https://'+ process.env.GH_TOKEN +'@github.com/' + process.env.GH_REPO,
      silent: true,
      branch: 'gh-pages'
    }));
});

//Load tester
require('web-component-tester').gulp.init(gulp);

//try to load custom tasks
//Do nothing if we fail
try{
  require('require-dir')('tasks');
}catch (err){}
