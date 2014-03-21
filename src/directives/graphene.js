'use strict';

angular.module('sg.graphene')
  .directive('sgGraphene', function($http, $templateCache, $compile, $window) {
    return {
      restrict: 'E',
      scope: {
        'ngModel': '=?',
        'sbml': '=?',
        'sbmlUrl': '@?',
        'jsonUrl': '@?',
        'template': '@',
        'nodes': '=?',
        'links': '=?',
        'params': '=?',
        'linkDistance': '=?',
        'charge': '=?',
        'gravity': '=?',
        'height': '=?',
        'width': '=?',
        'nodeSize': '=?',
        'scale': '=?',
        'force': '=?',
        'svg': '=?',
        'translate': '=?',
        'layoutComplete': '=?',
        'layoutStopThreshold': '=?',
        'forceLayout': '=?',
        'additionalData': '=?'
      },
      // templateUrl: function(element, attr) {
      //   return attr.template ? attr.template : 'template/sbml.html';
      // },
      // templateUrl: 'template/sbml.html',
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
        loadTemplate(scope.template);

        // Reference to underscore for use in the view
        if (_) {
          scope._ = _;
        }

        var watching = ['links', 'nodes'];

        _.each(watching, function(w) {
          scope.$watchCollection(w, function(newVal) {
            if (newVal) {
              scope.forceLayout(scope.nodes, scope.links, scope.params);
            }
          });
        });

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

        scope.$watch('enable-zoom', function(newVal) {
          if (newVal) {
            d3.select(element.find('svg')[0]).call(zoom);
          }
        });

        function initializeGraph() {
          scope.svg = element;
        }

        scope.arrow = d3.svg.symbol().size(function(d) {
          return d.size;
        }).type(function(d) {
          return d.type;
        });

        scope.extendPoint = function(start, end, distance) {
          // var slope = (end.y - start.y) / (end.x - start.x);
          var length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y -
            start.y, 2));
          return {
            x: end.x + (end.x - start.x) / length * distance,
            y: end.y + (end.y - start.y) / length * distance
          };
        };

        scope.forceLayout = function(nodes, links) {
          var force = d3.layout.force()
            .charge(scope.charge || -700)
            .linkDistance(scope.linkDistance || 40)
            .gravity(scope.gravity || 0.1)
            .size([scope.width || 800, scope.height || 800]);
          _.each(nodes, function(n) {
            n.force = force;
          });
          var ran = false;
          force
            .nodes(nodes)
            .links(links)
            .on('tick', function() {
              if (scope.height && scope.width && scope.nodeSize) {
                _.each(nodes, function(n) {
                  n.x = Math.max(n.width, Math.min(scope.width -
                    n.width, n.x));
                  n.y = Math.max(n.height, Math.min(scope.height -
                    n.height, n.y));
                });
                if (!ran) {
                  scope.$digest();
                  ran = true;
                }
              }
              var thres = scope.layoutStopThreshold || 0.01;
              if (force.alpha() <= thres) {
                force.stop();
                scope.$digest();
                if (scope.layoutComplete) {
                  if (_.isFunction($window[scope.layoutComplete])) {
                    $window[scope.layoutComplete]();
                  }
                }
              }
            })
            .start();
          return force;
        };

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
  })
  .directive('draggable', function($document) {
    return {
      link: function(scope, element) {

        // d3.select(element[0]).data([scope.node]).call(scope.node.force.drag);
        // scope.node.force.drag(d3.select(element[0])[0]);

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
          offset.x = element.scope().node.x - event.pageX / scope.scale;
          offset.y = element.scope().node.y - event.pageY / scope.scale;
          $document.on('mousemove', mousemove);
          $document.on('mouseup', mouseup);
        });

        function mousemove(event) {
          var node = element.scope().node;
          node.x = event.pageX / scope.scale + offset.x;
          node.y = event.pageY / scope.scale + offset.y;
          element.scope().$apply();
          if (scope.onDrag) {
            scope.onDrag(event, node);
          }
        }

        function mouseup() {
          $document.unbind('mousemove', mousemove);
          $document.unbind('mouseup', mouseup);
        }
      }
    };
  });
