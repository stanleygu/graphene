'use strict';

angular.module('sg.graphene')
  .controller('sgSbmlDataCtrl', function($scope, $http, $window, sgSbml) {

    $scope.exports = {};

    $scope.linkModifers = false;
    $scope.allowUnstick = true;
    $scope.showReactionNodes = false;
    var OPACITY = {
      focused: 1,
      unfocused: 0.1,
      normal: 1
    };

    var clickNode = function(node) {
      console.log('Clicked on ' + node.name);
    };

    var dblClickNode = function(node) {
      console.log('Double clicked on ' + node.name);
    };

    var mouseoverNode = function(node, $scope, $event) {
      var el = $event.target;
      console.log('mousing over', el);

      node.opacity = OPACITY.focused;
      if (_.contains(node.classes, 'species')) {
        _.each($scope.imports.nodes, function(n) {
          if (n.id !== node.id) {
            n.opacity = OPACITY.unfocused;
          }
        });

        var reactions = [];
        _.each($scope.imports.reactionInfo, function(r) {
          if (_.contains(r.products, node.id) || _.contains(r.reactants, node.id)) {
            reactions.push(r);

            var productsAndReactants = r.reactants.concat(r.products);
            _.each(productsAndReactants, function(p) {
              $scope.imports.nodeLookup[p].opacity = OPACITY.normal;
            });
          }
        });

        _.each($scope.imports.links, function(edge) {
          if(_.contains(_.map(reactions, 'id'), edge.rInfo.id)) {
            edge.opacity = OPACITY.focused;
          } else {
            edge.opacity = OPACITY.unfocused;
          }
        });

      }
    };

    var mouseleaveNode = function(node, $scope) {
      _.each($scope.imports.nodes, function(n) {
        n.opacity = OPACITY.normal;
      });
      _.each($scope.imports.links, function(edge) {
        edge.opacity = OPACITY.normal;
      });
    };

    var events = {
      click: clickNode,
      dblClick: dblClickNode,
      mouseover: mouseoverNode,
      mouseleave: mouseleaveNode
    };

    if ($scope.sbmlUrl) {
      $http.get($scope.sbmlUrl).success(function(data) {
        var sbml = sgSbml.sbmlToJson(data);
        if (sbml) {
          $scope.ngModel = sbml;
          $scope.force = runForceLayout();
        }
      });
    }

    $scope.$watch('sbml', function(newVal) {
      if (newVal) {
        var sbml = sgSbml.sbmlToJson(newVal);
        if (sbml) {
          $scope.ngModel = sbml;
          $scope.force = runForceLayout();
        }
      }
    });

    function runForceLayout() {
      $scope.nodes = sgSbml.getNodes($scope.ngModel.sbml);
      var output = sgSbml.getEdges($scope.ngModel.sbml);
      $scope.edges = output.edges;
      $scope.reactionInfo = output.reactionInfo;
      $scope.species = _.filter($scope.nodes, function(n) {
        return _.contains(n.classes, 'species');
      });
      $scope.reactions = _.filter($scope.nodes, function(n) {
        return _.contains(n.classes, 'reaction');
      });

      var d3NodeLookup = {};
      angular.forEach($scope.nodes, function(node) {
        d3NodeLookup[node.id] = node;
        if (_.contains(node.classes, 'reaction')) {
          node.width = 0;
          node.height = 0;
          node.rInfo = $scope.reactionInfo[node.id];
        } else {
          node.width = $scope.nodeSize.width;
          node.height = $scope.nodeSize.height;
        }
      });

      $scope.links = _.map($scope.edges, function(edge) {
        return {
          source: d3NodeLookup[edge.source],
          target: d3NodeLookup[edge.target],
          reaction: edge.reaction,
          rInfo: edge.rInfo,
          classes: edge.classes
        };
      });

      if (!$scope.linkModifiers) {
        $scope.links = _.filter($scope.links, function(link) {
          return !_.contains(link.classes, 'modifier');
        });
      }

      var sourceAndSink = sgSbml.getSourceAndSinkNodes($scope.nodes, $scope.links);
      _.each(sourceAndSink.nodes, function(n) {
        n.width = 16;
        n.height = 16;
      });
      $scope.nodes = $scope.nodes.concat(sourceAndSink.nodes);
      $scope.links = $scope.links.concat(sourceAndSink.edges);

      $scope.sourceNodes = _.filter($scope.nodes, function(n) {
        return _.contains(n.classes, 'source');
      });
      $scope.sinkNodes = _.filter($scope.nodes, function(n) {
        return _.contains(n.classes, 'sink');
      });

      var force = d3.layout.force()
        .charge($scope.charge || -700)
        .linkDistance($scope.linkDistance || 40)
        .gravity($scope.gravity || 0.1)
        .size([$scope.width || 800, $scope.height || 800]);
      _.each($scope.nodes, function(n) {
        n.force = force;
      });
      var ran = false;
      force
        .nodes($scope.nodes)
        .links($scope.links)
        .on('tick', function() {
          if ($scope.height && $scope.width) {
            _.each($scope.nodes, function(n) {
              n.x = Math.max(n.width, Math.min($scope.width -
                n.width, n.x));
              n.y = Math.max(n.height, Math.min($scope.height -
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
              if (_.isFunction($window[$scope.layoutComplete])) {
                $window[$scope.layoutComplete]();
              }
            }
          }
          $scope.$digest();
        })
        .start();
      $scope.exports = {
        links: $scope.links,
        nodes: $scope.nodes,
        reactions: $scope.reactions,
        species: $scope.species,
        reactionInfo: $scope.reactionInfo,
        nodeLookup: d3NodeLookup,
        force: force,
        height: $scope.height,
        width: $scope.width,
        allowUnstick: $scope.allowUnstick,
        showArcs: $scope.showArcs,
        showReactionNodes: $scope.showReactionNodes,
        events: events,
        zoom: true
      };
      return force;
    }

    $scope.zoom = true;
    var watchList = ['charge', 'linkDistance', 'gravity'];
    _.each(watchList, function(w) {
      $scope.$watch(w, function(newVal) {
        if (newVal) {
          if ($scope.force) {
            console.log('Change %s to ' + newVal, w);
            $scope.force[w](newVal).start();
          }
        }
      });
    });

    $scope.$watch('linkModifiers', function(newVal) {
      if (!_.isUndefined(newVal)) {
        $scope.force = runForceLayout();
      }
    });

  });
