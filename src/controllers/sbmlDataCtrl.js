'use strict';

angular.module('sg.nodegraph')
  .controller('sgSbmlDataCtrl', function($scope, $http) {
    if ($scope.sbmlUrl) {
      $http.get($scope.sbmlUrl).success(function(data) {
        var x2js = new X2JS();
        $scope.ngModel = x2js.xml_str2json(data);
        runForceLayout();
      });
    }

    $scope.$watch('sbml', function(newVal) {
      if (newVal) {
        var x2js = new X2JS();
        $scope.ngModel = x2js.xml_str2json(newVal);
        runForceLayout();
      }
    });

    function runForceLayout() {
      $scope.reactionInfo = {};
      $scope.nodes = getNodes($scope.ngModel.sbml.model);
      $scope.edges = getEdges($scope.ngModel.sbml.model);
      $scope.species = _.filter($scope.nodes, function(n) {
        return _.contains(n.classes, 'species');
      });
      $scope.reactions = _.filter($scope.nodes, function(n) {
        return _.contains(n.classes, 'reaction');
      });

      var d3NodeLookup = {};

      angular.forEach($scope.nodes, function(node) {
        d3NodeLookup[node.id] = node;
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

      // $scope.start();
    }


    function getNodes(model) {
      // TODO: not very DRY

      var species = (((model || {}).listOfSpecies || {}).species || {}) || [];
      var reactions = (((model || {}).listOfReactions || {}).reaction || {}) || [];

      var speciesNodes;
      species = arrayify(species);
      speciesNodes = _.map(species, function(specie) {
        return {
          id: specie._id,
          name: specie._name,
          classes: ['species'],
          species: specie
        };
      });

      var reactionNodes;
      reactions = arrayify(reactions);
      reactionNodes = _.map(reactions, function(reaction) {
        return {
          id: reaction._id,
          name: reaction._name,
          classes: ['reaction'],
          reaction: reaction
        };
      });

      return speciesNodes.concat(reactionNodes);
    }

    function getEdges(model) {
      // TODO: not very DRY

      var edges = [];
      $scope.reactionInfo = {};

      var reactions = (((model || {}).listOfReactions || {}).reaction || {}) || [];

      var species;

      var getEdge = function(reaction) {
        var rInfo = {
          id: reaction._id,
          reactants: [],
          products: [],
          modifiers: []
        };

        var reactant = reaction.listOfReactants;
        if (reactant) {
          species = arrayify(reactant.speciesReference);
          _.each(species, function(r) {
            edges.push({
              source: r._species,
              target: reaction._id,
              reaction: reaction,
              rInfo: rInfo,
              classes: ['reaction', 'consumption']
            });
            rInfo.reactants.push(r._species);
          });
        }

        var product = reaction.listOfProducts;
        if (product) {
          species = arrayify(product.speciesReference);
          _.each(species, function(r) {
            edges.push({
              source: reaction._id,
              target: r._species,
              reaction: reaction,
              rInfo: rInfo,
              classes: ['reaction', 'production']
            });
            rInfo.products.push(r._species);
          });

        }

        var modifier = reaction.listOfModifiers;
        if (modifier) {
          species = arrayify(modifier.modifierSpeciesReference);
          _.each(species, function(r) {
            edges.push({
              source: r._species,
              target: reaction._id,
              reaction: reaction,
              rInfo: rInfo,
              classes: ['modifier']
            });
            rInfo.modifiers.push(r._species);
          });
        }

        return rInfo;
      };

      var reaction = arrayify(reactions);

      _.each(reaction, function(reaction) {
        var rInfo = getEdge(reaction);
        $scope.reactionInfo[reaction._id] = rInfo;
      });
      return edges;
    }

    function arrayify(s) {
      if (typeof s === 'object') {
        if (s.length) {
          // already an array-like object
          return s;
        } else {
          return [s];
        }
      } else if (typeof s === 'string') {
        return s.split();
      }
    }
  });
