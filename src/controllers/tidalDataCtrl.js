'use strict';

angular.module('sg.graphene')
  .controller('sgTidalDataCtrl', function($scope, $http, $window) {

    $scope.callWindowFunction = function(f) {
      if (_.isFunction($window[f])) {
        $window[f]();
      }
    };

    $scope.$watch('jsonUrl', function(newVal) {
      if (newVal) {
        $http.get($scope.jsonUrl).success(function(data) {
          $scope.data = data;
          $window.copy = angular.copy(data);
        });
      }
    });
    $scope.$watch('json', function(newVal) {
      if (newVal) {
        $scope.data = $scope.json;
      }
    });

    var urlify = function(content) {
      var blob = new Blob([content], {
        type: 'text/plain'
      });
      return (window.URL || window.webkitURL).createObjectURL(blob);
    };
    $scope.svgToUrl = function() {
      var svg = $window.document.querySelector('svg');
      var x = new XMLSerializer();
      $scope.svgUrl = urlify(x.serializeToString(svg));
    };


    // Timeout to let forceLayout function to be available
    //
    $scope.$watch('data', function(newVal) {
      if (newVal) {
        var data = newVal;
        $scope.edges = _.map(data.edges, function(edge) {
          return {
            source: _.find(data.nodes, function(n) {
              return n.id === edge.nodes[0];
            }),
            target: _.find(data.nodes, function(n) {
              return n.id === edge.nodes[1];
            }),
            type: edge.type
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

        var sizes = {};
        sizes.max = _.max(data.nodes, function(n) {
          return n.size;
        });
        sizes.min = _.min(data.nodes, function(n) {
          return n.size;
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
            n.scaleFactor = (n.size - sizes.min.size) / (sizes.max.size - sizes.min.size);
            n.width = $scope.nodeSize.min.width +
              (($scope.nodeSize.max.width - $scope.nodeSize.min.width) *
              n.scaleFactor);
            n.height = $scope.nodeSize.min.height +
              (($scope.nodeSize.max.height - $scope.nodeSize.min.height) *
              n.scaleFactor);
          });

          var links = _.filter($scope.edges, function(l) {
            return _.contains(sect, l.source.id) && _.contains(sect, l.target.id);
          });

          var force = d3.layout.force()
            .charge($scope.charge || -700)
            .linkDistance($scope.linkDistance || 40)
            .gravity($scope.gravity || 0.1)
            .size([$scope.subgraph.width || 800, $scope.subgraph.height || 800]);
          _.each(nodes, function(n) {
            n.force = force;
          });
          var ran = false;
          force
            .nodes(nodes)
            .on('tick', function() {
              if ($scope.subgraph.height && $scope.subgraph.width) {
                _.each(nodes, function(n) {
                  n.x = Math.max(n.width, Math.min($scope.subgraph.width -
                    n.width, n.x));
                  n.y = Math.max(n.height, Math.min($scope.subgraph.height -
                    n.height, n.y));
                });
                if (!ran) {
                  $scope.$digest();
                  ran = true;
                }
              }
              var thres = $scope.layoutStopThreshold || 0.01;
              if (force.alpha() <= thres) {
                force.stop();
                $scope.$digest();
                if ($scope.layoutComplete) {
                  $scope.callWindowFunction($scope.layoutComplete);
                }
              }
            })
            .start();
          $scope.groups.push({
            nodes: nodes,
            links: links,
            name: key
          });
          count += 1;
        });

        $scope.exports = {
          groups: $scope.groups,
          edges: $scope.edges,
          subgraph: $scope.subgraph
        };
      }
    });

  });
