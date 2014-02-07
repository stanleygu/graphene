angular.module('nodegraph-standalone', ['template/default.html', 'template/json.html', 'nodegraph']);

angular.element(document).ready(function() {
  'use strict';
  angular.module('myApp', ['nodegraph-standalone']);
  angular.bootstrap(document, ['myApp']);
});