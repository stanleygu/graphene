'use strict';

angular.module('sg.nodegraph')
  .directive('sgNodegraph', function($http, $templateCache, $compile) {
    return {
      restrict: 'E',
      scope: {
        'ngModel': '=?',
        'sbmlUrl': '@?',
        'jsonUrl': '@?',
        'template': '@',
        'nodes': '=?',
        'links': '=?',
        'linkDistance': '=?',
        'charge': '=?',
        'height': '=?',
        'width': '=?',
        'scale': '=?',
        'force': '=?',
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
        loadTemplate(scope.template);

        // Reference to underscore for use in the view
        if (_) {
          scope._ = _;
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
                  h: scope.height,
                },
                size: 30
              });
              scope.groups.push({
                nodes: nodes,
                links: links,
                name: key
              });
              count += 1;
            });

            loadTemplate(scope.template);
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
                  n.x = Math.max(params.size, Math.min(params.bounds.w - params.size, n.x));
                  n.y = Math.max(params.size, Math.min(params.bounds.h - params.size, n.y));
                });
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
