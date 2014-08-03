'use strict';

angular.module('sg.graphene')
  .factory('SgNode', function() {

    // Contructor for new SgNode
    var SgNode = function(id) {
      this.id = id || null;
    };

    return SgNode;

  });
