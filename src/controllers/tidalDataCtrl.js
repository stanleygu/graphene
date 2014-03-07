'use strict';

angular.module('sg.nodegraph')
  .controller('sgTidalDataCtrl', function($scope, $http) {
    if ($scope.jsonUrl) {
      $http.get($scope.jsonUrl).success(function(data) {
        $scope.data = data;
      });
    } else if ($scope.json) {
      $scope.data = $scope.json;
    }

    // Timeout to let forceLayout function to be available
    //
    var unwatchFunc = $scope.$watch('forceLayout', function(newVal) {
      if (newVal) {
        var unwatch = $scope.$watch('data', function(newVal) {
          if (newVal) {
            var data = newVal;
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

            var orderedKeys = _.keys(sections).sort(function(a, b) {
              var reA = /[^a-zA-Z]/g;
              var reN = /[^0-9]/g;
              var aA = a.replace(reA, '');
              var bA = b.replace(reA, '');
              if (aA === bA) {
                var aN = parseInt(a.replace(reN, ''), 10);
                var bN = parseInt(b.replace(reN, ''), 10);
                return aN === bN ? 0 : aN > bN ? 1 : -1;
              } else {
                return aA > bA ? 1 : -1;
              }
            });

            $scope.groups = [];
            var count = 0;
            _.each(orderedKeys, function(key) {
              var sect = sections[key];
              var nodes = _.filter(data.nodes, function(n) {
                return _.contains(sect, n.id);
              });
              _.each(nodes, function(n) {
                n.group = count;
              });
              var links = _.filter($scope.edges, function(l) {
                return _.contains(sect, l.source.id) && _.contains(sect, l.target.id);
              });
              $scope.forceLayout(nodes, []);
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
            unwatch();
          }
        });
        unwatchFunc();
      }
    });


  });
