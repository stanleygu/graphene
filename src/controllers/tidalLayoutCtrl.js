'use strict';

angular.module('sg.graphene')
  .controller('sgTidalLayoutCtrl', function($scope, sgGeo) {

    $scope.spacer = 10;

    // COMPUTED LINK PROPERTY
    var updateLinkPosition = function(link) {
      var targetToSource = sgGeo.getLineIntersectionWithRectangle({
        x1: link.source.x,
        y1: link.source.y + link.source.group * $scope.imports.subgraph.height,
        x2: link.target.x,
        y2: link.target.y + link.target.group * $scope.imports.subgraph.height
      }, {
        x1: link.source.x - (link.source.width / 2 + $scope.spacer),
        y1: link.source.y - (link.source.height / 2 + $scope.spacer) + link.source.group * $scope.imports.subgraph.height,
        x2: link.source.x + link.source.width / 2 + $scope.spacer,
        y2: link.source.y + link.source.height / 2 + $scope.spacer + link.source.group * $scope.imports.subgraph.height
      });
      var sourceToTarget = sgGeo.getLineIntersectionWithRectangle({
        x1: link.source.x,
        y1: link.source.y + link.source.group * $scope.imports.subgraph.height,
        x2: link.target.x,
        y2: link.target.y + link.target.group * $scope.imports.subgraph.height
      }, {
        x1: link.target.x - (link.target.width / 2 + $scope.spacer),
        y1: link.target.y - (link.target.height / 2 + $scope.spacer) + link.target.group * $scope.imports.subgraph.height,
        x2: link.target.x + link.target.width / 2 + $scope.spacer,
        y2: link.target.y + link.target.height / 2 + $scope.spacer + link.target.group * $scope.imports.subgraph.height
      });

      link.x1 = targetToSource.x;
      link.y1 = targetToSource.y;
      link.x2 = sourceToTarget.x;
      link.y2 = sourceToTarget.y;
    };

    $scope.$watchCollection('imports.edges', function(val) {
      if (val) {
        $scope.links = $scope.imports.edges;
        _.each($scope.links, function(l) {
          $scope.$watch(function() {
            return l.source.x + l.source.y + l.target.x + l.target.y;
          }, function() {
            updateLinkPosition(l);
          });
          updateLinkPosition(l);
        });
      }
    });

    $scope.arrow = d3.svg.symbol().size(function(d) {
      return d.size;
    }).type(function(d) {
      return d.type;
    });


    $scope.clickNode = function(node, $event) {
      var f = $scope.imports.events.click;
      if (_.isFunction(f)) {
        f(node, $scope, $event);
      }
    };

    $scope.dblClickNode = function(node, $event) {
      var f = $scope.imports.events.dblClick;
      if (_.isFunction(f)) {
        f(node, $scope, $event);
      }
    };

    $scope.mouseoverNode = function(node, $event) {
      var f = $scope.imports.events.mouseover;
      if (_.isFunction(f)) {
        f(node, $scope, $event);
      }
    };

    $scope.mouseleaveNode = function(node, $event) {
      var f = $scope.imports.events.mouseleave;
      if (_.isFunction(f)){
        f(node, $scope, $event);
      }
    };

  });
