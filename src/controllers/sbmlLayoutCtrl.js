'use strict';

angular.module('sg.graphene')
  .controller('sgSbmlLayoutCtrl', function($scope, sgSbml, $log) {

    var nodeLookup;

    var generateIdLookup = function(array, id) {
      //generates a lookup hashtable for an array with objects containing IDs
      var lookup = {};
      angular.forEach(array, function(value) {
        lookup[value[id || 'id']] = value;
      });
      return lookup;
    };
    $scope.textVisibilityLookup = {
      species: true,
      reaction: false
    };

    $scope.lookupMarkerId = function(classes) {
      if (_.every(classes, function(c) {
        return _.contains(['reaction', 'production'], c);
      })) {
        return 'reactionProduction';
      } else if (_.every(classes, function(c) {
        return _.contains(['reaction', 'production'], c);
      })) {
        return 'reactionConsumption';
      }
    };

    $scope.sizeLookup = {
      species: 30,
      reaction: 5
    };

    var getReactionNode = function(link) {
      var reaction = link.rInfo;
      return nodeLookup[reaction.id];
    };

    var getReactionPosition = function(link) {
      var reaction = link.rInfo;
      var reactionNode = getReactionNode(link);
      var species = _.union(reaction.products, reaction.reactants);
      if (species.length <= 1) {
        return reactionNode;
      } else {

        var sumX = 0;
        var sumY = 0;
        angular.forEach(species, function(s) {
          var speciesNode = nodeLookup[s];
          sumX += speciesNode.x;
          sumY += speciesNode.y;
        });
        return {
          x: sumX / species.length,
          y: sumY / species.length
        };
      }
    };

    function checkLineIntersection(line1StartX, line1StartY, line1EndX,
      line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
      // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
      var denominator, a, b, numerator1, numerator2, result = {
          x: null,
          y: null,
          onLine1: false,
          onLine2: false
        };
      denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) -
        ((line2EndX - line2StartX) * (line1EndY - line1StartY));
      if (denominator === 0) {
        return result;
      }
      a = line1StartY - line2StartY;
      b = line1StartX - line2StartX;
      numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY -
        line2StartY) * b);
      numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY -
        line1StartY) * b);
      a = numerator1 / denominator;
      b = numerator2 / denominator;

      // if we cast these lines infinitely in both directions, they intersect here:
      result.x = line1StartX + (a * (line1EndX - line1StartX));
      result.y = line1StartY + (a * (line1EndY - line1StartY));
      /*
        // it is worth noting that this should be the same as:
        x = line2StartX + (b * (line2EndX - line2StartX));
        y = line2StartX + (b * (line2EndY - line2StartY));
        */
      // if line1 is a segment and line2 is infinite, they intersect if:
      if (a > 0 && a < 1) {
        result.onLine1 = true;
      }
      // if line2 is a segment and line1 is infinite, they intersect if:
      if (b > 0 && b < 1) {
        result.onLine2 = true;
      }
      // if line1 and line2 are segments, they intersect if both of the above are true
      return result;
    }

    var getLineIntersectionWithRectangle = function(line, rect) {
      var sides = [{
        x1: rect.x1, //left side
        y1: rect.y1,
        x2: rect.x1,
        y2: rect.y2
      }, {
        x1: rect.x1, // top side
        y1: rect.y1,
        x2: rect.x2,
        y2: rect.y1
      }, {
        x1: rect.x2, // right side
        y1: rect.y1,
        x2: rect.x2,
        y2: rect.y2
      }, {
        x1: rect.x1, // bottom side
        y1: rect.y2,
        x2: rect.x2,
        y2: rect.y2
      }];

      var intersection;
      _.each(sides, function(s) {
        if (!intersection) {
          var result = checkLineIntersection(line.x1, line.y1, line.x2,
            line.y2,
            s.x1, s.y1, s.x2, s.y2);
          if (result.onLine1 && result.onLine2) {
            intersection = result;
          }
        }
      });

      if (!intersection) {
        intersection = {
          x: (rect.x1 + rect.x2) / 2,
          y: (rect.y1 + rect.y2) / 2
        };
      }
      return intersection;
    };

    $scope.extendPoint = function(start, end, distance) {
      // var slope = (end.y - start.y) / (end.x - start.x);
      var length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y -
        start.y, 2));
      return {
        x: end.x + (end.x - start.x) / length * distance,
        y: end.y + (end.y - start.y) / length * distance
      };
    };

    $scope.arrow = d3.svg.symbol().size(function(d) {
      return d.size;
    }).type(function(d) {
      return d.type;
    });

    // COMPUTED LINK PROPERTY
    var updateLinkPosition = function(link) {
      var reactionPosition = getReactionPosition(link);
      var reactionNode = getReactionNode(link);
      reactionNode.x = reactionPosition.x;
      reactionNode.y = reactionPosition.y;

      var sourceSpacer, targetSpacer;
      if (_.isEqual(link.source.width, 0)) {
        sourceSpacer = 0;
      } else {
        sourceSpacer = 8;
      }
      if (_.isEqual(link.target.width, 0)) {
        targetSpacer = 0;
      } else {
        targetSpacer = 15;
      }
      var targetToSource = getLineIntersectionWithRectangle({
        x1: link.target.x,
        y1: link.target.y,
        x2: link.source.x,
        y2: link.source.y
      }, {
        x1: link.source.x - (link.source.width / 2 + sourceSpacer),
        y1: link.source.y - (link.source.height / 2 + sourceSpacer),
        x2: link.source.x + (link.source.width / 2 + sourceSpacer),
        y2: link.source.y + (link.source.height / 2 + sourceSpacer)
      });
      var sourceToTarget = getLineIntersectionWithRectangle({
        x1: link.source.x,
        y1: link.source.y,
        x2: link.target.x,
        y2: link.target.y
      }, {
        x1: link.target.x - (link.target.width / 2 + targetSpacer),
        y1: link.target.y - (link.target.height / 2 + targetSpacer),
        x2: link.target.x + (link.target.width / 2 + targetSpacer),
        y2: link.target.y + (link.target.height / 2 + targetSpacer)
      });

      if(_.contains(link.classes, 'modifier')) {
        var newPoint = $scope.extendPoint(targetToSource, sourceToTarget, -15);
        link.x1 = targetToSource.x;
        link.y1 = targetToSource.y;
        link.x2 = newPoint.x;
        link.y2 = newPoint.y;
      } else {
        link.x1 = targetToSource.x;
        link.y1 = targetToSource.y;
        link.x2 = sourceToTarget.x;
        link.y2 = sourceToTarget.y;
      }

    };


   // $scope.getSpeciesInfo = function(node) {
   //   var info = {};

   //   if (_.isUndefined(node.species)) {
   //     $log.error('Node is missing species')
   //   } else {
   //     node.species
   //   }
   // };


    /*
     * Watchers
     */

    var linkWatchers = []; // storing node watchers to be removed if unnecessary
    var nodeWatchers = []; // storing node watchers to be removed if unnecessary

    $scope.$watchCollection('imports.links', function(newVal) {
      if (newVal) {
        /*
         * unwatch all link watchers
         */
        _.each(linkWatchers, function(w) {
          w();
        });
        linkWatchers = [];
        $scope.links = $scope.imports.links;
        $scope.lines = sgSbml.classifyLinks($scope.links);
        nodeLookup = $scope.imports.nodeLookup; //generateIdLookup($scope.imports.nodes); //sometimes run before node watcher
        _.each($scope.links, function(l) {
          var watch = $scope.$watch(function() {
            return l.source.x + l.source.y + l.target.x + l.target.y;
          }, function() {
            updateLinkPosition(l);
          });
          updateLinkPosition(l);
          linkWatchers.push(watch);
        });
      }
    });

    $scope.$watchCollection('imports.nodes', function(newVal) {
      if (newVal) {
        _.each(nodeWatchers, function(w) {
          w();
        });
        nodeWatchers = [];
        $scope.nodes = $scope.imports.nodes;
        $scope.species = $scope.imports.species;
        $scope.reactions = $scope.imports.reactions;
        nodeLookup = $scope.imports.nodeLookup; //generateIdLookup($scope.nodes);
       // $scope.species = _.filter($scope.nodes, function(n) {
       //   return _.contains(n.classes, 'species');
       // });
       // $scope.reactions = _.filter($scope.nodes, function(n) {
       //   return _.contains(n.classes, 'reaction');
       // });
      }
    });

  });
