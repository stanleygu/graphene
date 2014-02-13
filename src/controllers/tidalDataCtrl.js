'use strict';

angular.module('sg.nodegraph')
  .controller('sgTidalDataCtrl', function($scope, $http) {
    if ($scope.jsonUrl) {
      $http.get($scope.jsonUrl).success(function(data) {
        $scope.ngModel = data;
        $scope.edges = _.map(data.edges, function(edge) {
          return {
            source: _.find(data.nodes, function(n) {
              return n.id === edge[0];
            }),
            target: _.find(data.nodes, function(n) {
              return n.id === edge[1];
            }),
          };
        });

        var sections = data.timeSlots;

        $scope.groups = [];
        var count = 0;
        _.each(sections, function(sect, key) {
          var nodes = _.filter(data.nodes, function(n) {
            return _.contains(sect, n.id);
          });
          _.each(nodes, function(n) {
            n.group = count;
          });
          var links = _.filter($scope.edges, function(l) {
            return _.contains(sect, l.source.id) && _.contains(sect, l.target.id);
          });
          $scope.forceLayout(nodes, [], {
            bounds: {
              w: 800,
              h: 500,
            },
            size: 30
          });
          $scope.groups.push({
            nodes: nodes,
            links: links,
            name: key
          });
          count += 1;
        });

        $scope.additionalData = {
          groups: $scope.groups,
          edges: $scope.edges
        };

      });
    }

  });
