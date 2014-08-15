'use strict';

angular.module('sg.graphene', ['Svgs'])
  .config(['$compileProvider',
    function($compileProvider) {
      // blobs need to be whitelisted for img and a tags
      // https://github.com/angular/angular.js/issues/3889
      $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|blob):|data:image\//);
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|blob):/);
    }
  ]);

var app = angular.module('Svgs', []);

angular.forEach([{
  ngAttrName: 'ngXlinkHref',
  attrName: 'xlink:href'
}, {
  ngAttrName: 'ngWidth',
  attrName: 'width'
}, {
  ngAttrName: 'ngHeight',
  attrName: 'height'
}], function(pair) {

  var ngAttrName = pair.ngAttrName;
  var attrName = pair.attrName;

  app.directive(ngAttrName, function() {

    return {

      priority: 99,

      link: function(scope, element, attrs) {

        attrs.$observe(ngAttrName, function(value) {

          if (!value) {
            return;
          }

          attrs.$set(attrName, value);
          //if (IeHelperSrv.isIE) {
          //  element.prop(attrName, value);
          //}
        });
      }
    };
  });
});

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

    $scope.clickLink = function(link) {
      _.each($scope.imports.reactions, function(r) {
        r.selected = false;
      });
      link.reaction.selected = true;
    };

    $scope.clickNode = function(node) {
      _.each($scope.imports.reactions, function(r) {
        r.selected = false;
      });
      node.selected = true;
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
        link.cp1 = $scope.extendPoint(sourceToTarget, targetToSource, -20);
        link.cp2 = $scope.extendPoint(targetToSource, sourceToTarget, -20);
      } else {
        link.x1 = targetToSource.x;
        link.y1 = targetToSource.y;
        link.x2 = sourceToTarget.x;
        link.y2 = sourceToTarget.y;
        link.cp1 = $scope.extendPoint(sourceToTarget, targetToSource, -20);
        link.cp2 = $scope.extendPoint(targetToSource, sourceToTarget, -20);
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
          subgraph: $scope.subgraph,
          events: $scope.events
        };
      }
    });

  });

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

'use strict';

angular.module('sg.graphene')
  .directive('sgGraphene', function($http, $templateCache, $compile) {
    return {
      restrict: 'E',
      scope: {
        'template': '@',
        'imports': '=?'
      },
      link: function postLink(scope, element) {
        function loadTemplate(template) {
          $http.get(template, {
            cache: $templateCache
          })
            .success(function(templateContent) {
              element.children().remove();
              element.append($compile(templateContent)(scope));
              scope.svg = element;
            });
        }
        loadTemplate(scope.template);
        scope.$watch('template', function() {
          loadTemplate(scope.template);
        });
      }
    };
  })
  .directive('zoomable', function() {
    return {
      link: function(scope, element, attrs) {
        // Zooming behavior
        scope.translate = scope.translate || {x: 0, y:0};
        scope.scale = 1;
        scope.zoomed = function() {
          if (element.scope().$apply(attrs.zoomable)) {
            scope.scale = d3.event.scale;
            scope.translate.x = d3.event.translate[0];
            scope.translate.y = d3.event.translate[1];
            scope.$digest();
          }
        };

        scope.zoom = d3.behavior.zoom()
          .translate([0, 0])
          .scale(1)
          .scaleExtent([0.5, 8])
          .on('zoom', scope.zoomed);

        scope.$watch('svg', function(newVal) {
          if (newVal) {
            d3.select(element[0]).call(scope.zoom);
          }
        });
      }
    };
  })
  .directive('caseSensitive', function($timeout) {
    return {
      link: function(scope, element, attr) {
        $timeout(function() { // bug where sometimes ng-attr hasn't linked yet
          scope.attr = attr;
          var caseSensitive = attr.caseSensitive.split(',');
          angular.forEach(caseSensitive, function(a) {
            var lowercase = a.toLowerCase();
            scope.$watch('attr[lowercase]', function() {
              element[0].setAttribute(a, element[0].getAttribute(lowercase));
            });
          });
        }, 0);
      }
    };
  })
  .directive('draggable', function($document) {
    return {
      link: function(scope, element) {

        var offset = {};

        element.css({
          position: 'relative',
          border: '1px solid red',
          backgroundColor: 'lightgrey',
          cursor: 'pointer'
        });

        element.on('mousedown', function(event) {
          // Prevent default dragging of selected content
          event.preventDefault();
          event.stopPropagation();
          var node = element.scope().node;
          node.wasFixed = node.fixed;
          node.fixed = true;
          offset.x = node.x - event.pageX / scope.scale;
          offset.y = node.y - event.pageY / scope.scale;
          $document.on('mousemove', mousemove);
          $document.on('mouseup', mouseup);
        });

        function mousemove(event) {
          var node = element.scope().node;
          if (scope.imports && scope.imports.force) {
            node.px = event.pageX / scope.scale + offset.x;
            node.py = event.pageY / scope.scale + offset.y;
            scope.imports.force.resume();
          } else {
            node.x = event.pageX / scope.scale + offset.x;
            node.y = event.pageY / scope.scale + offset.y;
          }
          if (scope.onDrag) {
            scope.onDrag(event, node);
          }
          element.scope().$apply();
        }

        function mouseup() {
          var node = element.scope().node;
          if (scope.imports.allowUnstick) {
            if (node.wasFixed) {
              delete node.fixed;
            }
          }
          $document.unbind('mousemove', mousemove);
          $document.unbind('mouseup', mouseup);
          element.scope().$digest();
        }
      }
    };
  })
  .directive('sgDrag', function($document) {
    return {
      link: function(scope, element, attrs) {

        var offset = {};

        element.on('mousedown', function(event) {
          // Prevent default dragging of selected content
          event.preventDefault();
          event.stopPropagation();

          // Function to return current position of object
          var node = element.scope().$apply(attrs.sgDragBegin);

          offset.x = node.x - event.pageX / scope.scale;
          offset.y = node.y - event.pageY / scope.scale;
          $document.on('mousemove', mousemove);
          $document.on('mouseup', mouseup);
        });

        function mousemove(event) {
          // Calls function to report new position
          element.scope().$apply(attrs.sgDragMove)({
            x: event.pageX / scope.scale + offset.x,
            y: event.pageY / scope.scale + offset.y
          });
        }

        function mouseup() {
          $document.unbind('mousemove', mousemove);
          $document.unbind('mouseup', mouseup);
        }
      }
    };
  })
  .filter('truncateTo', function() {
    return function(input, limit) {
      if (!_.isNumber(limit)) {
        return input;
      } else {
        if (_.size(input) > limit) {
          return _.first(input, limit - 3).join('') + '...';
        } else {
          return input;
        }
      }
    };
  })
  .filter('jsonToHtmlTable', function() {
    return function(input) {
      var json = '<table>' +
        '<tr><th>Key</th><th class="pull-right">Value</th></tr>' +
        '<% _.forEach(json, function(value, key) { %><tr><td><%- key %>&nbsp;&nbsp;&nbsp;</td><td class="pull-right"><%- value %></td></tr><% }); %>' +
        '</table>';
      return _.template(json, { 'json': input });
    };
  });

'use strict';

angular.module('sg.graphene')
  .factory('sgGeo', function() {
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

    var api = {
      getLineIntersectionWithRectangle: function(line, rect) {
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
      },

      linkArc: function(d) {
        var dx = d.x2 - d.x1,
          dy = d.y2 - d.y1,
          dr = Math.sqrt(dx * dx + dy * dy);
        return 'M' + d.x1 + ',' + d.y1 + 'A' + dr + ',' + dr + ' 0 0,1 ' + d.x2 + ',' + d.y2;
      },

      extendPoint: function(start, end, distance) {
        // var slope = (end.y - start.y) / (end.x - start.x);
        var length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y -
          start.y, 2));
        return {
          x: end.x + (end.x - start.x) / length * distance,
          y: end.y + (end.y - start.y) / length * distance
        };
      },

      arrow: d3.svg.symbol().size(function(d) {
        return d.size;
      }).type(function(d) {
        return d.type;
      })

    };

    // Public API
    return api;
  });

'use strict';

angular.module('sg.graphene')
  .factory('SgLink', function() {

    // Contructor for new SgNode
    var SgLink = function(source, target) {
      this.source = source;
      this.target = target;
      this.opacity = null;
    };

    return SgLink;

  });

'use strict';

angular.module('sg.graphene')
  .factory('SgNode', function() {

    // Contructor for new SgNode
    var SgNode = function(id) {
      this.id = id || null;
    };

    return SgNode;

  });

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

      var parseReactionAndAddEdges = function(reaction) {
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
        var rInfo = parseReactionAndAddEdges(reaction);
        reactionInfo[reaction._id] = rInfo;
      });
      return {
        edges: edges,
        reactionInfo: reactionInfo
      };
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

    function classifyLinks(links, nodeLookup) {
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
              if (source.rInfo.products.length > 1) {
                _.each(source.rInfo.products, function(p) {
                  if (p !== target.id) {
                    line.siblings = line.siblings || [];
                    var sibling = nodeLookup[p];
                    line.siblings = _.union(line.siblings, sibling);
                  }
                });
              }

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
              if (target.rInfo.reactants.length > 1) {
                _.each(target.rInfo.reactants , function(p) {
                  if (p !== target.id) {
                    line.siblings = line.siblings || [];
                    var sibling = nodeLookup[p];
                    line.siblings = _.union(line.siblings, sibling);
                  }
                });
              }
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

    function getSourceAndSinkNodes(nodes, edges, nodeLookup) {
      var newNodes = [];
      var newEdges = [];
      var classifiedLinks = classifyLinks(edges, nodeLookup);
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
      getSourceAndSinkNodes: function(nodes, edges, nodeLookup) {
        return getSourceAndSinkNodes(nodes, edges, nodeLookup);
      },
      getNodes: function(sbml) {
        return getNodes(sbml.model);
      },
      getEdges: function(sbml) {
        return getEdges(sbml.model);
      },
      classifyLinks: function(links, nodeLookup) {
        return classifyLinks(links, nodeLookup);
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
