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
