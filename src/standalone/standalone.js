angular.module('graphene-standalone', ['template/sbml.html', 'template/tidal.html', 'sg.graphene']);
angular.element(document).ready(function() {
  'use strict';
  angular.module('myApp', ['graphene-standalone']);
  angular.bootstrap(document.querySelector('div'), ['myApp']);
});
