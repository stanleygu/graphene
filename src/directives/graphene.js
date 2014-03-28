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

        scope.$watch('enable-zoom', function(newVal) {
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
