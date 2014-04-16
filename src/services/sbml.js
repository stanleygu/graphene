'use strict';

angular.module('sg.graphene')
  .factory('sgSbml', function() {
    var x2js = new X2JS();

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

      var result = [];
      return result.concat(speciesNodes, reactionNodes);
    }

    function getEdges(model) {
      // TODO: not very DRY

      var edges = [];

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

      var reactionInfo = {};
      _.each(reaction, function(reaction) {
        var rInfo = getEdge(reaction);
        reactionInfo[reaction._id] = rInfo;
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

    function classifyLinks(links) {
      var lines = {
        production: [],
        generation: [],
        reactant: [],
        degradation: [],
        modifier: [],
        source: [],
        sink: []
      };

      var linkMap = {};
      _.each(links, function(link) {
        var init = function(id) {
          linkMap[id] = linkMap[id] || {
            asSource: [],
            asTarget: []
          };
        };

        if (!_.contains(link.classes, 'modifier')) {
          init(link.source.id);
          init(link.target.id);
          linkMap[link.source.id].asSource.push(link);
          linkMap[link.target.id].asTarget.push(link);
        }
      });

      _.each(links, function(line) {
        var source = line.source;
        var target = line.target;
        if (_.contains(line.classes, 'modifier')) {
          lines.modifier.push(line);
        } else if (_.contains(line.classes, 'sink')) {
          lines.sink.push(line);
        } else if (_.contains(line.classes, 'source')) {
          lines.source.push(line);
        } else if (_.contains(source.classes, 'reaction')) {
          if (_.contains(target.classes, 'species')) {
            if (linkMap[source.id].asTarget.length > 0) {
              // source has some edges from it
              lines.production.push(line);
              line.classes = _.union(line.classes, ['production']);
            } else {
              lines.generation.push(line);
              line.classes = _.union(line.classes, ['generation']);
              //source.classes = _.union(source.classes, ['source']);
            }
          }
        } else if (_.contains(source.classes, 'species')) {
          if (_.contains(target.classes, 'reaction')) {
            if (linkMap[target.id].asSource.length > 0) {
              // target has some edges from it, which makes it a reactant
              lines.reactant.push(line);
              line.classes = _.union(line.classes, ['reactant']);
            } else {
              // target has no edges out so make it a degradation term
              lines.degradation.push(line);
              line.classes = _.union(line.classes, ['degradation']);
              //target.classes = _.union(target.classes, ['sink']);
            }
          }
        } else {
          throw new Error('Could not classify link', line);
        }
      });
      return lines;
    }

    function getSourceAndSinkNodes(nodes, edges) {
      var newNodes = [];
      var newEdges = [];
      var classifiedLinks = classifyLinks(edges);
      _.each(classifiedLinks.generation, function(edge) {
        var reaction = edge.source;
        var sourceNode = {
          id: 'source-' + reaction.id,
          name: 'Source',
          classes: ['source'],
          reaction: reaction
        };
        newNodes.push(sourceNode);
        edge.rInfo.reactants.push(sourceNode.id);
        newEdges.push({
          source: sourceNode,
          target: edge.source,
          rInfo: edge.rInfo,
          classes: ['source'],
          reaction: edge.reaction
        });
      });
      _.each(classifiedLinks.degradation, function(edge) {
        var reaction = edge.target;
        var sinkNode = {
          id: 'sink-' + reaction.id,
          name: 'Sink',
          classes: ['sink'],
          reaction: reaction
        };
        newNodes.push(sinkNode);
        edge.rInfo.products.push(sinkNode.id);
        newEdges.push({
          source: edge.target,
          target: sinkNode,
          rInfo: edge.rInfo,
          classes: ['sink'],
          reaction: edge.reaction
        });
      });

      return {
        nodes: newNodes,
        edges: newEdges
      };
    }
    // Public API
    return {
      getSourceAndSinkNodes: function(nodes, edges) {
        return getSourceAndSinkNodes(nodes, edges);
      },
      getNodes: function(sbml) {
        return getNodes(sbml.model);
      },
      getEdges: function(sbml) {
        return getEdges(sbml.model);
      },
      classifyLinks: function(links) {
        return classifyLinks(links);
      },
      sbmlToJson: function(sbml) {
        var sbmlJson = x2js.xml_str2json(sbml);
        if (sbmlJson && sbmlJson.sbml && sbmlJson.sbml.model) {
          return sbmlJson;
        } else {
          return false;
        }
      }
    };
  });
