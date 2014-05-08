'use strict';

angular.module('sg.graphene')
  .controller('sgSbmlLayoutCtrl', function($scope, sgSbml, sgGeo) {

    var nodeLookup;

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

    var getReactionPosition = function(link) {
      var reaction = link.reaction;
      var species = _.union(reaction.products, reaction.reactants);
      if (species.length <= 1) {
        return reaction;
      } else {

        var sumX = 0;
        var sumY = 0;
        angular.forEach(species, function(s) {
          sumX += s.x;
          sumY += s.y;
        });
        return {
          x: sumX / species.length,
          y: sumY / species.length
        };
      }
    };

    $scope.linkArc = function(d) {
      var dx = d.x2 - d.x1,
      dy = d.y2 - d.y1,
      dr = Math.sqrt(dx * dx + dy * dy);
      return 'M' + d.x1 + ',' + d.y1 + 'A' + dr + ',' + dr + ' 0 0,1 ' + d.x2 + ',' + d.y2;
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
      var reactionNode = link.reaction;
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
      var targetToSource = sgGeo.getLineIntersectionWithRectangle({
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
      var sourceToTarget = sgGeo.getLineIntersectionWithRectangle({
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
        link.cp1 = $scope.extendPoint(sourceToTarget, targetToSource, 10);
        link.cp2 = $scope.extendPoint(targetToSource, sourceToTarget, -20);
      } else {
        link.x1 = targetToSource.x;
        link.y1 = targetToSource.y;
        link.x2 = sourceToTarget.x;
        link.y2 = sourceToTarget.y;
        link.cp1 = $scope.extendPoint(sourceToTarget, targetToSource, 10);
        link.cp2 = $scope.extendPoint(targetToSource, sourceToTarget, -10);
      }

    };

    var updateReactionNode = function(n) {
      // update centroids for reactants and products
      n.centroid = {};
      n.centroid.reactants = _.reduce(n.reactants, function(centroid, r) {
        var x = centroid.x + r.x / n.reactants.length;
        var y = centroid.y + r.y / n.reactants.length;
        return {
          x: x,
          y: y
        };
      }, {x: 0, y: 0});
      n.centroid.products = _.reduce(n.products, function(centroid, p) {
        var x = centroid.x + p.x / n.products.length;
        var y = centroid.y + p.y / n.products.length;
        return {
          x: x,
          y: y
        };
      }, {x: 0, y: 0});

      n.deg = 180 / Math.PI * Math.atan((n.y - n.centroid.reactants.y)/(n.centroid.reactants.x - n.x));
      if (n.centroid.reactants.x < n.x) {
        n.deg += 180;
      }
    };

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
        nodeLookup = $scope.imports.nodeLookup; //generateIdLookup($scope.imports.nodes); //sometimes run before node watcher
        $scope.lines = sgSbml.classifyLinks($scope.links, nodeLookup);
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

        _.each($scope.imports.reactions, function(n) {
          var watch = $scope.$watch(function() {
            var total = 0;
            _.each(n.reactants, function(r) {
              total += r.x + r.y;
            });
            _.each(n.products, function(p) {
              total += p.x + p.y;
            });
            return total;
          }, function() {
            updateReactionNode(n);
          });
          nodeWatchers.push(watch);
        });
       // $scope.species = _.filter($scope.nodes, function(n) {
       //   return _.contains(n.classes, 'species');
       // });
       // $scope.reactions = _.filter($scope.nodes, function(n) {
       //   return _.contains(n.classes, 'reaction');
       // });
      }
    });

  });
