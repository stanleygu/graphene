'use strict';

angular.module('sg.graphene')
  .factory('sgSbmlValidator', function() {
    var x2js = new X2JS();
    // Public API
    return {
      process: function(sbml) {
        var sbmlJson = x2js.xml_str2json(sbml);
        if (sbmlJson && sbmlJson.sbml && sbmlJson.sbml.model) {
          return sbmlJson;
        } else {
          return false;
        }
      }
    };
  });
