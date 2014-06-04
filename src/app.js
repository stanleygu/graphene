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
