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
              initializeGraph();
            });
        }
        loadTemplate(scope.template);

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

        scope.$watch('imports.zoom', function(newVal) {
          if (newVal) {
            d3.select(element.find('svg')[0]).call(zoom);
          }
        });

        function initializeGraph() {
          scope.svg = element;
        }
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
          var node = element.scope().node;
          node.fixed = true;
          offset.x = node.x - event.pageX / scope.scale;
          offset.y = node.y - event.pageY / scope.scale;
          $document.on('mousemove', mousemove);
          $document.on('mouseup', mouseup);
        });

        function mousemove(event) {
          var node = element.scope().node;
          node.px = event.pageX / scope.scale + offset.x;
          node.py = event.pageY / scope.scale + offset.y;
          element.scope().$apply();
          if (scope.onDrag) {
            scope.onDrag(event, node);
          }
          if (scope.imports && scope.imports.force) {
            scope.imports.force.resume();
          }
        }

        function mouseup() {
          var node = element.scope().node;
          delete node.fixed;
          $document.unbind('mousemove', mousemove);
          $document.unbind('mouseup', mouseup);
        }
      }
    };
  })
  .filter('truncateTo', function () {
    return function (input, limit) {
      if (!_.isNumber(limit)) {
        return input;
      } else {
        if (_.size(input) > limit) {
          return  _.first(input, limit - 3).join('') + '...';
        } else {
          return input;
        }
      }
    };
  });
