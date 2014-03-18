'use strict';

angular.module('sg.nodegraph', [])
  .config(['$compileProvider',
    function($compileProvider) {
      // blobs need to be whitelisted for img and a tags
      // https://github.com/angular/angular.js/issues/3889
      $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|blob):|data:image\//);
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|blob):/);
    }
  ]);
