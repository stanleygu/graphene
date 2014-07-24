'use strict';

angular.module('sg.graphene')
  .factory('SgNode', function() {

    // Contructor for new SgNode
    var SgNode = function() {
      this.x = null;
      this.y = null;
      this.opacity = null;
      this.width = null;
      this.height = null;
      this.charge = null;
    };

    return SgNode;

  });
