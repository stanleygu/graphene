angular.module('nodegraph-standalone', ['template/default.html', 'nodegraph']);

angular.element(document).ready(function() {
  'use strict';
  angular.module('myApp', ['nodegraph-standalone']);
  angular.bootstrap(document, ['myApp']);
});