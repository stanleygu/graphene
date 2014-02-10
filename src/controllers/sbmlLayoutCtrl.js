'use strict';

angular.module('sg.nodegraph')
  .controller('sgSbmlLayoutCtrl', function($scope) {

    $scope.classifyLinks = function(links) {
      var lines = {
        production: [],
        reactant: [],
        degradation: [],
        modifier: []
      };

      var linkMap = {};
      _.each(links, function(link) {
        var init = function(id) {
          linkMap[id] = linkMap[id] || {
            asSource: [],
            asTarget: []
          };
        };

        init(link.source.id);
        init(link.target.id);
        linkMap[link.source.id].asSource.push(link);
        linkMap[link.target.id].asTarget.push(link);
      });

      _.each(links, function(line) {
        var source = line.source;
        var target = line.target;
        if (_.contains(line.classes, 'modifier')) {
          lines.modifier.push(line);
        } else if (_.contains(source.classes, 'reaction')) {
          if (_.contains(target.classes, 'species')) {
            lines.production.push(line);
          }
        } else if (_.contains(source.classes, 'species')) {
          if (_.contains(target.classes, 'reaction')) {
            if (linkMap[target.id].asSource.length > 0) {
              // target has some edges from it, which makes it a reactant
              lines.reactant.push(line);
            } else {
              // target has no edges out so make it a degradation term
              lines.degradation.push(line);
            }
          }
        }
      });
      return lines;
    };

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

    $scope.getReactionPosition = function(link) {
      var reaction = link.rInfo;
      var node = generateIdLookup($scope.nodes);
      var species = _.union(reaction.products, reaction.reactants);
      if (species.length <= 1) {
        return node[reaction.id];
      } else {

        var sumX = 0;
        var sumY = 0;
        angular.forEach(species, function(s) {
          sumX += node[s].x;
          sumY += node[s].y;
        });
        return {
          x: sumX / species.length,
          y: sumY / species.length
        };
      }
    };

    $scope.$watchCollection('links', function(newVal) {
      if (newVal) {
        $scope.lines = $scope.classifyLinks($scope.links);
      }
    });

    $scope.$watchCollection('nodes', function(newVal) {
      if (newVal) {
        $scope.species = _.filter($scope.nodes, function(n) {
          return _.contains(n.classes, 'species');
        });
        $scope.reactions = _.filter($scope.nodes, function(n) {
          return _.contains(n.classes, 'reaction');
        });
      }
    })

  });
