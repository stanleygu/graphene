angular.module('nodegraph-standalone', ['template/sbml.html', 'template/tidal.html', 'sg.nodegraph']);
angular.element(document).ready(function() {
  'use strict';
  angular.module('myApp', ['nodegraph-standalone']);
  angular.bootstrap(document, ['myApp']);
});
