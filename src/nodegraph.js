'use strict';

angular.module('nodegraph')
  .directive('nodegraph', function($http, $templateCache, $compile) {
    return {
      templateUrl: 'template/default.html',
      restrict: 'E',
      scope: {
        'ngModel': '=?',
        'sbmlUrl': '@?',
        'jsonUrl': '@?',
        'template': '@',
        'linkDistance': '=?',
        'charge': '=?',
        'height': '=?',
        'width': '=?',
        'scale': '=?',
        'force': '=?',
        'nodes': '=?',
        'links': '=?',
        'svg': '=?',
        'species': '=?',
        'reactions': '=?',
        'translate': '=?',
        'runForceLayout': '=?'
      },
      link: function postLink(scope, element) {
        function loadTemplate(template) {
          $http.get(template, {
            cache: $templateCache
          })
            .success(function(templateContent) {
              element.children().remove();
              element.append($compile(templateContent)(scope));
              initializeGraph();
            });
        }

        if (scope.jsonUrl) {
          $http.get(scope.jsonUrl).success(function(data) {
            scope.ngModel = data;
            scope.edges = _.map(data.edges, function(edge) {
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

            scope.groups = [];
            var count = 0;
            _.each(sections, function(sect, key) {
              var nodes = _.filter(data.nodes, function(n) {
                return _.contains(sect, n.id);
              });
              _.each(nodes, function(n) {
                n.group = count;
              });
              var links = _.filter(scope.edges, function(l) {
                return _.contains(sect, l.source.id) && _.contains(sect, l.target.id);
              });
              scope.d3ForceLayout(nodes, links, {
                bounds: {
                  w: scope.width,
                  h: scope.height
                }
              });
              scope.groups.push({
                nodes: nodes,
                links: links,
                name: key
              });
              count += 1;
            });

            // var force = scope.d3ForceLayout(data.nodes, edges);
            // scope.nodes = force.nodes();
            // scope.links = force.links();
            loadTemplate(scope.template);
          });
        }

        if (scope.sbmlUrl) {
          $http.get(scope.sbmlUrl).success(function(data) {
            var x2js = new X2JS();
            scope.ngModel = x2js.xml_str2json(data);
            scope.runForceLayout();
          });
        }


        scope.translate = {};
        scope.scale = 1;
        // Zooming behavior

        function zoomed() {
          scope.scale = d3.event.scale;
          scope.translate.x = d3.event.translate[0];
          scope.translate.y = d3.event.translate[1];
          scope.$digest();
        }

        var zoom = d3.behavior.zoom()
          .translate([0, 0])
          .scale(1)
          .scaleExtent([0.5, 8])
          .on('zoom', zoomed);

        function initializeGraph() {
          d3.select(element.find('svg')[0]).call(zoom);
          scope.svg = element;
        }


        scope.arrow = d3.svg.symbol().size(function(d) {
          return d.size;
        }).type(function(d) {
          return d.type;
        });



        var arrayify = function(s) {
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
        };

        var generateIdLookup = function(array, id) {
          //generates a lookup hashtable for an array with objects containing IDs
          var lookup = {};
          angular.forEach(array, function(value) {
            lookup[value[id || 'id']] = value;
          });
          return lookup;
        };

        var getNodes = function(model) {
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
        };

        var getEdges = function(model) {
          // TODO: not very DRY

          var edges = [];

          var reactions = (((model || {}).listOfReactions || {}).reaction || {}) || [];

          var species;

          var getEdge = function(reaction) {
            var rInfo = {
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
            scope.reactionInfo[reaction._id] = rInfo;
          });
          return edges;
        };

        scope.sizeLookup = {
          species: 30,
          reaction: 5
        };

        scope.lookupMarkerId = function(classes) {
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

        scope.textVisibilityLookup = {
          species: true,
          reaction: false
        };

        scope.color = d3.scale.category20();

        scope.getReactionPosition = function(id) {
          var reaction = scope.reactionInfo;
          var node = generateIdLookup(scope.nodes);
          var species = _.union(reaction[id].products, reaction[id].reactants);
          if (species.length <= 1) {
            return node[id];
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

        scope.extendPoint = function(start, end, distance) {
          // var slope = (end.y - start.y) / (end.x - start.x);
          var length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
          return {
            x: end.x + (end.x - start.x) / length * distance,
            y: end.y + (end.y - start.y) / length * distance
          };
        };

        scope.d3ForceLayout = function(nodes, links, params) {
          var force = d3.layout.force()
            .charge(scope.charge || -700)
            .linkDistance(scope.linkDistance || 40)
            .size([scope.width || 800, scope.height || 800]);
          force
            .nodes(nodes)
            .links(links)
            .on('tick', function() {
              scope.$digest();
              if (params.bounds) {
                _.each(nodes, function(n) {
                  n.x = Math.max(scope.sizeLookup.species, Math.min(params.bounds.w - scope.sizeLookup.species, n.x));
                  n.y = Math.max(scope.sizeLookup.species, Math.min(params.bounds.h - scope.sizeLookup.species, n.y));
                });
              }
            })
            .start();
          return force;
        };
        scope.runForceLayout = function() {
          if (scope.ngModel && scope.ngModel.sbml) {
            scope.reactionInfo = {};
            scope.nodes = getNodes(scope.ngModel.sbml.model);
            scope.edges = getEdges(scope.ngModel.sbml.model);
            scope.species = _.filter(scope.nodes, function(n) {
              return _.contains(n.classes, 'species');
            });
            scope.reactions = _.filter(scope.nodes, function(n) {
              return _.contains(n.classes, 'reaction');
            });

            var d3NodeLookup = {};

            angular.forEach(scope.nodes, function(node, i) {
              d3NodeLookup[node.id] = i;
            });

            scope.links = _.map(scope.edges, function(edge) {
              return {
                source: d3NodeLookup[edge.source],
                target: d3NodeLookup[edge.target],
                reaction: edge.reaction,
                classes: edge.classes
              };
            });

            scope.force = d3.layout.force()
              .charge(scope.charge || -700)
              .linkDistance(scope.linkDistance || 40)
              .size([scope.width || 800, scope.height || 800]);

            scope.force
              .nodes(scope.nodes)
              .links(scope.links)
              .on('tick', function() {
                scope.$digest();
              })
              .start();

            scope.lines = classifyLinks(scope.links, scope.nodes);
          }
        };

        // Watchers to classify links and nodes
        var classifyLinks = function(links, nodes) {
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
            var source = nodes[line.source.index];
            var target = nodes[line.target.index];
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

        scope.runForceLayout();
      }
    };
  })
  .directive('caseSensitive', function() {
    return {
      link: function(scope, element, attr) {
        scope.attr = attr;
        var caseSensitive = attr.caseSensitive.split(',');
        angular.forEach(caseSensitive, function(a) {
          var lowercase = a.toLowerCase();
          scope.$watch('attr[lowercase]', function() {
            element[0].setAttribute(a, element[0].getAttribute(lowercase));
          });
        });
      }
    };
  });
