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
