/**
 * Created by Ilkka on 7.4.2016.
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
            return path.join('app', stylesPath, src);
        }))
        .pipe($.changed(stylesPath, {extension: '.css'}))
        .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
        .pipe(gulp.dest(path.join('.tmp', stylesPath)))
        .pipe($.cleanCss({compatibility: 'ie10'}))
        .pipe(gulp.dest(dist(stylesPath)))
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

var optimizeHtmlTask = function ( src, dest ) {
    var assets = $.useref.assets({
        searchPath: ['.tmp', 'app']
    });

    return gulp.src(src)
        .pipe(assets)
        //Min js
        .pipe($.if('*.js', $.uglify({
            preserveComments: 'license'
        })))
        //Min css
        .pipe($.if('*.css', $.cleancss()))
        .pipe(assets.restore())
        .pipe($.useref())
        //Min html
        .pipe($.if('*.html', $.minifyhtml({
            quotes: true,
            empty: true,
            spare: true
        })))
        //Out
        .pipe(gulp.dest(dest))
        .pipe($.size({
            title: 'html'
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
    return imageminTask('app/images/**/*', dist('images'));
});

//Copy root files
gulp.task('copy', function () {
    var app = gulp.src([
        'app/*',
        '!app/test',
        '!app/elements',
        '!app/bower_components',
        '!**/.DS_Store'
    ],{
        dot: true
    }).pipe(gulp.dest(dist()));

    var bower = gulp.src([
        'app/bower_components/{webcomponentsjs,promise-polyfill}/**/*'
    ]).pipe(gulp.dest(dist('bower_components')));

    return merge(app, bower)
        .pipe($.size({
            title: 'copy'
        }));
});

//Copy fonts
gulp.task('fonts', function() {
    return gulp.src(['app/fonts/**'])
        .pipe(gulp.dest(dist('fonts')))
        .pipe($.size({
            title: 'fonts'
        }));
});

//Search for assets and optimize
gulp.task('html', function() {
    return optimizeHtmlTask(
        ['app/**/*.html', '!app/{elements,test,bower_components}/**/*.html'],
        dist());
});

//Vulcanize
gulp.task('vulcanize', function () {
    return gulp.src('app/elemtns/elements.html')
        .pipe($.vulcanize({
            stripComments: true,
            inlineCss: true,
            inlineScripts: true
        }))
        .pipe(gulp.dest(dist('elements')))
        .pipe($.size({
            title: 'vulcanize'
        }));
});

// Clean output directory
gulp.task('clean', function() {
    return del(['.tmp', dist()]);
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
            baseDir: ['.tmp', 'app'],
            middleWare: [historyApiFallback()]
        }
    });

    gulp.watch(['app/**/*.html', '!app/bower_components/**/*.html'], reload);
    gulp.watch(['app/styles/**/*.css'], ['styles', reload]);
    gulp.watch(['app/scripts/**/*.js'], reload);
    gulp.watch(['app/images/**/*'], reload);
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

//Build dist
gulp.task('build', ['clean'], function (cb) {
    runSequence(
        ['ensureFiles', 'copy', 'styles'],
        ['images', 'fonts', 'html'],
        'vulcanize',
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

//Load tester
require('web-component-tester').gulp.init(gulp);

//try to load custom tasks
//Do nothing if we fail
try{
    require('require-dir')('tasks');
}catch (err){}
