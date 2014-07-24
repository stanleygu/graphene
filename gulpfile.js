'use strict';
var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var bower = require('gulp-bower');
var html2js = require('gulp-html2js');
var rename = require('gulp-rename');
var ngmin = require('gulp-ngmin');
var clean = require('gulp-clean');
var connect = require('gulp-connect');

// 1)
// templates.html  -> templates.js
// srcs -> graphene.js

// 2)
// graphene.js + templates.js + angular -> graphene.standalone.js

// 3)
// all files -> minified

var names = {
  main: 'graphene.js',
  standalone: 'graphene-standalone.js',
  templates: 'graphene-templates.js'
};

var paths = {
  srcs: ['src/app.js', 'src/controllers/*.js', 'src/directives/*.js', 'src/services/*.js'],
  built: ['build/*.js'],
  standalone: ['bower_components/angular/angular.js',
    'bower_components/d3/d3.js', 'bower_components/x2js/xml2json.js',
    'bower_components/lodash/dist/lodash.js', 'build/**/*.js',
    'src/standalone/*.js'
  ],
  templates: ['src/**/*.html'],
  build: 'build/',
  demo: 'demo/'
};

gulp.task('min', ['standalone'], function() {
  // Minify and copy all JavaScript (except vendor scripts)
  return gulp.src(paths.built)
    .pipe(ngmin())
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest(paths.build));
});

gulp.task('standalone', ['build'], function() {
  return gulp.src(paths.standalone)
    .pipe(concat(names.main))
    .pipe(rename({
      suffix: '-standalone'
    }))
    .pipe(gulp.dest(paths.build));
});

gulp.task('connect-standalone', ['build'], function() {
  return gulp.src(paths.standalone)
    .pipe(concat(names.main))
    .pipe(rename({
      suffix: '-standalone'
    }))
    .pipe(gulp.dest(paths.build))
    .pipe(connect.reload());
});

gulp.task('build', ['bower', 'html2js'], function() {
  return gulp.src(paths.srcs)
    .pipe(concat(names.main))
    .pipe(gulp.dest(paths.build));
});

gulp.task('bower', function() {
  bower();
});

gulp.task('html2js', ['clean'], function() {
  return gulp.src(paths.templates)
    .pipe(html2js({
      quoteChar: '\'',
      module: 'graphene.templates'
    }))
    .pipe(concat(names.templates))
    .pipe(gulp.dest(paths.build));
});

gulp.task('connect', connect.server({
  root: __dirname,
  port: 9000,
  livereload: true,
  // open: {
  //   target: 'http://localhost:9000/demo',
  //   browser: 'Google Chrome' // if not working OS X browser: 'Google Chrome'
  // }
}));

gulp.task('clean', function() {
  return gulp.src(paths.build, {
    read: false
  })
    .pipe(clean());
});

// Rerun the task when a file changes
gulp.task('watch', function() {
  gulp.watch(paths.srcs, ['connect-standalone']);
  gulp.watch(paths.templates, ['connect-standalone']);
});

// Rerun the task when a file changes
gulp.task('watch-build', function() {
  gulp.watch(paths.srcs, ['build']);
  gulp.watch(paths.templates, ['build']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['standalone', 'watch', 'connect']);

gulp.task('dist', ['min'], function() {
  return gulp.src(['demo/index.html', 'demo/sampleJSONwithProps.json',
    'demo/init.js',
    'build/graphene.min.js', 'build/graphene-templates.min.js',
    'build/graphene.js',
    'build/graphene-standalone.min.js', 'bower.json'
  ])
    .pipe(gulp.dest('dist'));
});
