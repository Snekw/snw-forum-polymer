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
var reload             = browserSync.reload;
var merge              = require('merge-stream');
var path               = require('path');
var fs                 = require('fs');
var glob               = require('glob-all');
var historyApiFallback = require('connect-history-api-fallback');
var pkg                = require('./package.json');
var crypto             = require('crypto');
var ensureFiles        = require('./tasks/ensure-files.js');
var polyclean          = require('polyclean');

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

var styleTask = function ( stylesPath, srcs ) {
  return gulp.src(
    srcs.map(function ( src ) {
      return path.join('src', stylesPath, src);
    }))
    .pipe($.changed(stylesPath, {extension: '.css'}))
    .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(gulp.dest(path.join('.tmp', stylesPath)))
    .pipe($.cleanCss())
    .pipe(gulp.dest(dist(stylesPath)))
    // .pipe(del('.tmp'))
    .pipe($.size({title: stylesPath}));
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
    .pipe($.htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest(dist()))
    .pipe($.size({
      title: 'minifyHtml'
    }))
};

var vulcanizeTask = function (src) {
  return gulp.src(src, {base: 'src'})
    .pipe($.vulcanize({
      stripComments: true,
      inlineCss: true,
      inlineScripts: true,
      stripExcludes: false,
      excludes: '//fonts.googleapis.com/*'
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

//Prefix and clean css
gulp.task('styles', function () {
  return styleTask('styles', ['**/*.css']);
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
    'src/*',
    '!src/test',
    '!src/elements',
    '!src/bundles',
    '!src/bower_components',
    '!**/.DS_Store'
  ],{
    dot: true
  }).pipe(gulp.dest(dist()));

  var bower = gulp.src([
    'src/bower_components/{webcomponentsjs,polymer,page}/**/*'
  ]).pipe(gulp.dest(dist('bower_components')));

  return merge(app, bower)
    .pipe($.size({
      title: 'copy'
    }));
});

//Search for assets and optimize
gulp.task('html', function() {
  return minifyHtml(
    ['dist/**/*.html', '!dist/{elements,test,bower_components}/**/*.html']);
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
gulp.task('serve', ['styles'], function () {
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
      baseDir: ['.tmp', 'src'],
      middleWare: [historyApiFallback()]
    }
  });

  gulp.watch(['src/**/*.html', '!src/bower_components/**/*.html', '!src/test/**/*'], reload);
  gulp.watch(['src/styles/**/*.css'], ['styles', reload]);
  gulp.watch(['src/scripts/**/*.js'], reload);
  gulp.watch(['src/images/**/*'], reload);
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
    ['src/index.html','src/bundles/**/*.html']);
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
  return crisperTask(['dist/index.html', 'dist/bundles/**/*.html'])
});

//Build dist
gulp.task('build', ['clean'], function (cb) {
  runSequence(
    ['ensureFiles', 'copy', 'styles'],
    ['images', 'fonts', 'cleanTmp'],
    'vulcanize',
    'crisper',
    'html',
    'uglify',
    cb);
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

// gulp.task('polybuild', function () {
//   return gulp.src(['src/index.html', 'src/bundles/admin.html', 'src/bundles/min-elements.html'])
//     .pipe(polybuild({maximumCrush: true}))
//     .pipe(gulp.dest('dist'));
// });


//Load tester
require('web-component-tester').gulp.init(gulp);

//try to load custom tasks
//Do nothing if we fail
try{
  require('require-dir')('tasks');
}catch (err){}
