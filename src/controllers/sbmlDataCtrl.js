'use strict';

angular.module('sg.graphene')
  .controller('sgSbmlDataCtrl', function($scope, $http, $window, sgSbml, $log) {

    $scope.exports = {};

    $scope.linkModifers = false;
    $scope.allowUnstick = false;
    $scope.showReactionNodes = false;

    $scope.max = {
      links: {
        in : 1,
        out: 1
      }
    };

    var OPACITY = {
      focused: 1,
      unfocused: 0.1,
      normal: 1
    };

    var clickNode = function(node) {
      $log.info('Clicked on ' + node.name);
    };

    var dblClickNode = function(node) {
      $log.info('Double clicked on ' + node.name);
    };

    var mouseoverNode = function(node, $scope) {

      node.opacity = OPACITY.focused;
      if (_.contains(node.classes, 'species')) {
        _.each($scope.imports.species, function(n) {
          if (n.id !== node.id) {
            n.opacity = OPACITY.unfocused;
          }
        });

        _.each($scope.imports.links, function(edge) {
          edge.opacity = OPACITY.unfocused;
        });

        var reactions = [];
        _.each(_.union(node.linksFromHere, node.linksToHere), function(l) {
          reactions.push(l.reaction);
        });
        _.each(reactions, function(r) {
          _.each(_.union(r.products, r.reactants, r.linksFromHere, r.linksToHere), function(n) {
            n.opacity = OPACITY.normal;
          });
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
          node.d = 30;
          node.deg = 0;
          node.getCp1 = function() {
            return {
              x: this.x + this.d * Math.cos(this.deg / 180 * Math.PI),
              y: this.y - this.d * Math.sin(this.deg / 180 * Math.PI)
            };
          };
          node.getCp2 = function() {
            return {
              x: this.x + this.d * Math.cos((this.deg + 180) / 180 * Math.PI),
              y: this.y - this.d * Math.sin((this.deg + 180) / 180 * Math.PI)
            };
          };
          node.reactants = [];
          _.each(node.rInfo.reactants, function(r) {
            var reactant = d3NodeLookup[r];
            if (!reactant) {
              $log.error('Could not find reactant node %s', r);
            }
            node.reactants.push(d3NodeLookup[r]);
          });
          node.products = [];
          _.each(node.rInfo.products, function(p) {
            var product = d3NodeLookup[p];
            if (!product) {
              $log.error('Could not find product node %s', p);
            }
            node.products.push(d3NodeLookup[p]);
          });
        } else {
          node.width = $scope.nodeSize.width;
          node.height = $scope.nodeSize.height;
          node.linksToHere = [];
          node.linksFromHere = [];
        }
      });

      $scope.links = _.map($scope.edges, function(edge) {
        var source = d3NodeLookup[edge.source];
        var target = d3NodeLookup[edge.target];
        source.linksFromHere = source.linksFromHere || [];
        target.linksToHere = target.linksToHere || [];
        var link = {
          source: source,
          target: target,
          reaction: d3NodeLookup[edge.rInfo.id],
          reactionSbml: edge.reaction,
          rInfo: edge.rInfo,
          classes: edge.classes
        };
        source.linksFromHere.push(link);
        target.linksToHere.push(link);
        return link;
      });

      _.each($scope.species, function(n) {
        var rest;
        var aliasConstructor = function(direction) {
          var linkArrayKey, otherLinkArrayKey, speciesKey, linkTarget;
          if (direction === 'from') {
            linkArrayKey = 'linksFromHere';
            otherLinkArrayKey = 'linksToHere';
            speciesKey = 'reactants';
            linkTarget = 'source';
          } else {
            linkArrayKey = 'linksToHere';
            otherLinkArrayKey = 'linksFromHere';
            speciesKey = 'products';
            linkTarget = 'target';
          }
          return function(l) {
            var alias = _.clone(n);
            alias[linkArrayKey] = [l];
            alias[otherLinkArrayKey] = [];
            l[linkTarget] = alias;
            var ind = _.findKey(l.reaction[speciesKey], function(r) {
              return r.id === alias.id;
            });
            l.reaction[speciesKey][ind] = alias;
            $scope.nodes.push(alias);
            $scope.species.push(alias);
          };
        };
        while (n.linksFromHere.length > $scope.max.links.out) {
          rest = _.rest(n.linksFromHere, $scope.max.links.out);
          n.linksFromHere = _.first(n.linksFromHere, $scope.max.links.out);
          _.each(rest, aliasConstructor('from'));
        }
        while (n.linksToHere.length > $scope.max.links. in ) {
          rest = _.rest(n.linksToHere);
          n.linksToHere = _.first(n.linksToHere, $scope.max.links. in );
          _.each(rest, aliasConstructor('to'));
        }
      });


      if (!$scope.linkModifiers) {
        $scope.links = _.filter($scope.links, function(link) {
          return !_.contains(link.classes, 'modifier');
        });
      }

      var sourceAndSink = sgSbml.getSourceAndSinkNodes($scope.nodes, $scope.links, d3NodeLookup);
      _.each(sourceAndSink.nodes, function(n) {
        n.width = 16;
        n.height = 16;
      });
      $scope.nodes = $scope.nodes.concat(sourceAndSink.nodes);
      $scope.links = $scope.links.concat(sourceAndSink.edges);


      // $scope.sourceNodes = _.filter($scope.nodes, function(n) {
      //   return _.contains(n.classes, 'source');
      // });
      // $scope.sinkNodes = _.filter($scope.nodes, function(n) {
      //   return _.contains(n.classes, 'sink');
      // });

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
        if (newVal && $scope.ngModel) {
          if ($scope.force) {
            console.log('Change %s to ' + newVal, w);
            $scope.force[w](newVal).start();
          }
        }
      });
    });

    var watchListRestart = ['linkModifiers', 'max.links', 'width', 'height'];
    _.each(watchListRestart, function(w) {
      $scope.$watch(w, function(newVal) {
        if (newVal && $scope.ngModel) {
          $scope.force = runForceLayout();
        }
      }, true);
    });

  });
