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
// srcs -> nodegraph.js

// 2)
// nodegraph.js + templates.js + angular -> nodegraph.standalone.js

// 3)
// all files -> minified

var names = {
  main: 'nodegraph.js',
  standalone: 'nodegraph-standalone.js',
  templates: 'nodegraph-templates.js'
};

var paths = {
  srcs: ['src/*.js'],
  built: ['build/*.js'],
  standalone: ['bower_components/angular/angular.js', 'bower_components/d3/d3.js', 'bower_components/x2js/xml2json.js', 'bower_components/underscore/underscore.js', 'src/standalone/*.js' , 'build/**/*.js'],
  templates: ['src/**/*.html'],
  build: 'build/',
  demo: 'demo/'
};

gulp.task('min', ['standalone'], function() {
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
    .pipe(gulp.dest(paths.demo))
    .pipe(gulp.dest(paths.build))
    .pipe(connect.reload());
});

gulp.task('build', ['bower', 'html2js'], function() {
  // Minify and copy all JavaScript (except vendor scripts)
  return gulp.src(paths.srcs)
    .pipe(concat(names.main))
    .pipe(gulp.dest(paths.build));
});

gulp.task('bower', function() {
  bower();
});

gulp.task('html2js', ['clean'], function() {
  gulp.src(paths.templates)
    .pipe(html2js({
      quoteChar: '\'',
      module: 'nodegraph.templates'
    }))
    .pipe(concat(names.templates))
    .pipe(gulp.dest(paths.build));
});

gulp.task('connect', connect.server({
  root: __dirname,
  port: 9000,
  livereload: true
  // open: {
  //   browser: 'Google Chrome' // if not working OS X browser: 'Google Chrome'
  // }
}));

gulp.task('clean', function() {
  gulp.src(paths.built, {
    read: false
  })
    .pipe(clean());
});

// Rerun the task when a file changes
gulp.task('watch', function() {
  gulp.watch(paths.srcs, ['min']);
  gulp.watch(paths.templates, ['min']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['min', 'watch', 'connect']);
