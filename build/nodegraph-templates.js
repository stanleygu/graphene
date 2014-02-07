angular.module('template/default.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/default.html',
    '<svg xmlns="http://www.w3.org/2000/svg" ng-attr-height="{{height || 800}}" ng-attr-width="{{width || 800}}">\n' +
    '  <style>\n' +
    '  svg .node.species {\n' +
    '    stroke: #FFB800;\n' +
    '    stroke-width: 3px;\n' +
    '    size: 300px;\n' +
    '  }\n' +
    '  svg .node.reaction {\n' +
    '    stroke: #8089F7;\n' +
    '    opacity: 0;\n' +
    '    stroke-width: 1.5px;\n' +
    '  }\n' +
    '  svg .link {\n' +
    '    stroke: #999;\n' +
    '    stroke-opacity: .6;\n' +
    '    stroke-width: 3px;\n' +
    '  }\n' +
    '  svg .link.modifier {\n' +
    '    stroke-dasharray: 5, 5;\n' +
    '  }\n' +
    '  svg .node-label {\n' +
    '    font-size: 14px;\n' +
    '    font-family: Georgia;\n' +
    '    font-weight: bolder;\n' +
    '    text-anchor: middle;\n' +
    '    dominant-baseline: middle;\n' +
    '  }\n' +
    '\n' +
    '/*  svg .node.selected {\n' +
    '    stroke: #FF0000;\n' +
    '  }\n' +
    '  svg .link.selected {\n' +
    '    stroke: #FF0000;\n' +
    '  }*/\n' +
    '  svg marker {\n' +
    '    stroke: none;\n' +
    '    fill: #999;\n' +
    '    opacity: 1;\n' +
    '    overflow: visible;\n' +
    '  }\n' +
    '  </style>\n' +
    '  <defs>\n' +
    '    <marker case-sensitive="refX,refY" id="production" viewBox="0 -5 10 10" ng-attr-refX="{{sizeLookup[\'species\'] - 22}}"\n' +
    '    ng-attr-refY="{{0}}" markerWidth="15" markerHeight="15" orient="auto">\n' +
    '      <path transform="rotate(-90)" ng-attr-d="{{arrow({size: 5, type: \'triangle-down\'})}}"></path>\n' +
    '      <!-- <path d="M0,-5L10,0L0,5"></path> -->\n' +
    '    </marker>\n' +
    '    <marker case-sensitive="refX,refY" id="degradation" viewBox="0 -5 10 10" ng-attr-refX="{{0}}"\n' +
    '    ng-attr-refY="{{0}}" markerWidth="15" markerHeight="15" orient="auto">\n' +
    '      <path transform="rotate(-90)" ng-attr-d="{{arrow({size: 5, type: \'triangle-down\'})}}"></path>\n' +
    '      <!-- <path d="M0,-5L10,0L0,5"></path> -->\n' +
    '    </marker>\n' +
    '    <marker case-sensitive="refX,refY" id="modifier" markerWidth="8" markerHeight="8"\n' +
    '    ng-attr-refX="{{0}}" ng-attr-refY="{{0}}" fill="black" orient="auto">\n' +
    '          <path ng-attr-d="{{arrow({size: 5, type: \'circle\'})}}"></path>\n' +
    '      <!-- <circle cx="1" cy="1" r="1" fill="black" stroke="black" opacity=".6"></circle> -->\n' +
    '    </marker>\n' +
    '    <linearGradient id="gradient">\n' +
    '      <stop offset="5%" stop-color="#FFDC9E"></stop>\n' +
    '      <stop offset="95%" stop-color="#FFF"></stop>\n' +
    '    </linearGradient>\n' +
    '    <linearGradient id="reactionGradient">\n' +
    '      <stop offset="5%" stop-color="#B0C0FF"></stop>\n' +
    '      <stop offset="95%" stop-color="#FFF"></stop>\n' +
    '    </linearGradient>\n' +
    '  </defs>\n' +
    '  <g ng-attr-transform="translate({{translate.x}}, {{translate.y}})scale({{scale}})">\n' +
    '    <g>\n' +
    '      <line ng-click="App.selectReaction(link.source.id); isSelected = !isSelected" ng-repeat="link in lines.production"\n' +
    '      ng-class="{selected: isSelected}" class="reaction production link" ng-attr-x1="{{getReactionPosition(link.source.id).x}}" marker-end="url(#production)"\n' +
    '      ng-attr-y1="{{getReactionPosition(link.source.id).y}}" ng-attr-x2="{{link.target.x}}" ng-attr-y2="{{link.target.y}}">\n' +
    '      </line>\n' +
    '    </g>\n' +
    '    <g>\n' +
    '      <line ng-click="App.selectReaction(link.target.id); isSelected = !isSelected" ng-repeat="link in lines.reactant"\n' +
    '      ng-class="{selected: isSelected}" class="reaction reactant link" ng-attr-x1="{{link.source.x}}" ng-attr-y1="{{link.source.y}}"\n' +
    '      ng-attr-x2="{{getReactionPosition(link.target.id).x}}" ng-attr-y2="{{getReactionPosition(link.target.id).y}}">\n' +
    '      </line>\n' +
    '    </g>\n' +
    '    <g>\n' +
    '      <line ng-click="App.selectReaction(link.target.id); isSelected = !isSelected" ng-repeat="link in lines.degradation"\n' +
    '      ng-class="{selected: isSelected}" class="reaction degradation link" ng-attr-x1="{{link.source.x}}" marker-end="url(#degradation)"\n' +
    '      ng-attr-y1="{{link.source.y}}" ng-attr-x2="{{extendPoint(link.source, link.target, 20).x}}" ng-attr-y2="{{extendPoint(link.source, link.target, 20).y}}">\n' +
    '      </line>\n' +
    '    </g>\n' +
    '    <g>\n' +
    '      <line ng-click="App.selectReaction(link.target.id); isSelected = !isSelected" ng-repeat="link in lines.modifier"\n' +
    '      ng-class="{selected: isSelected}" class="modifier link" ng-attr-x1="{{link.source.x}}" ng-attr-y1="{{link.source.y}}"\n' +
    '      ng-attr-x2="{{getReactionPosition(link.target.id).x}}" ng-attr-y2="{{getReactionPosition(link.target.id).y}}" marker-end="url(#modifier)">\n' +
    '      </line>\n' +
    '    </g>\n' +
    '    <g draggable ng-repeat="node in species" ng-attr-transform="translate({{node.x}},{{node.y}})">\n' +
    '      <circle ng-class="{selected: isSelected}" class="species node" ng-attr-r="{{sizeLookup.species}}" fill="url(#gradient)"\n' +
    '      ng-click="App.selectSpecies(node.id); isSelected = !isSelected;">\n' +
    '        <title>ID: {{node.id}}, Name: {{node.name}}</title>\n' +
    '      </circle>\n' +
    '      <text class="node-label">{{node.id}}</text>\n' +
    '    </g>\n' +
    '    <g draggable ng-repeat="node in reactions" ng-attr-transform="translate({{node.x}},{{node.y}})">\n' +
    '      <circle ng-class="node.classes" class="node" ng-attr-r="{{sizeLookup.reaction}}"\n' +
    '      fill="url(#reactionGradient)" ng-click="openReactionModal(node)">\n' +
    '        <title>ID: {{node.id}}, Name: {{node.name}}</title>\n' +
    '      </circle>\n' +
    '      <text class="node-label">{{}}</text>\n' +
    '    </g>\n' +
    '  </g>\n' +
    '</svg>\n' +
    '');
}]);

angular.module('template/json.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/json.html',
    '<svg xmlns="http://www.w3.org/2000/svg" ng-attr-height="{{1800}}" ng-attr-width="{{width || 800}}">\n' +
    '  <style>\n' +
    '  svg .node {\n' +
    '    stroke: #FFB800;\n' +
    '    stroke-width: 3px;\n' +
    '    size: 300px;\n' +
    '  }\n' +
    '  svg .node.reaction {\n' +
    '    stroke: #8089F7;\n' +
    '    opacity: 0;\n' +
    '    stroke-width: 1.5px;\n' +
    '  }\n' +
    '  svg .link {\n' +
    '    stroke: #999;\n' +
    '    stroke-opacity: .6;\n' +
    '    stroke-width: 3px;\n' +
    '  }\n' +
    '  svg .link.modifier {\n' +
    '    stroke-dasharray: 5, 5;\n' +
    '  }\n' +
    '  svg .node-label {\n' +
    '    color: #333;\n' +
    '    stroke-width: 0;\n' +
    '    font-size: 14px;\n' +
    '    font-family: Georgia;\n' +
    '    font-weight: bolder;\n' +
    '    text-anchor: middle;\n' +
    '    dominant-baseline: middle;\n' +
    '  }\n' +
    '  /*  svg .node.selected {\n' +
    '    stroke: #FF0000;\n' +
    '  }\n' +
    '  svg .link.selected {\n' +
    '    stroke: #FF0000;\n' +
    '  }*/\n' +
    '  svg marker {\n' +
    '    stroke: none;\n' +
    '    fill: #999;\n' +
    '    opacity: 1;\n' +
    '    overflow: visible;\n' +
    '  }\n' +
    '  svg .box {\n' +
    '    stroke: #000;\n' +
    '    fill: none;\n' +
    '  }\n' +
    '  </style>\n' +
    '  <defs>\n' +
    '    <marker case-sensitive="refX,refY" id="arrow" viewBox="0 -5 10 10" ng-attr-refX="{{sizeLookup[\'species\'] - 22}}"\n' +
    '    ng-attr-refY="{{0}}" markerWidth="15" markerHeight="15" orient="auto">\n' +
    '      <path transform="rotate(-90)" ng-attr-d="{{arrow({size: 5, type: \'triangle-down\'})}}"></path>\n' +
    '      <!-- <path d="M0,-5L10,0L0,5"></path> -->\n' +
    '    </marker>\n' +
    '    <marker case-sensitive="refX,refY" id="degradation" viewBox="0 -5 10 10" ng-attr-refX="{{0}}"\n' +
    '    ng-attr-refY="{{0}}" markerWidth="15" markerHeight="15" orient="auto">\n' +
    '      <path transform="rotate(-90)" ng-attr-d="{{arrow({size: 5, type: \'triangle-down\'})}}"></path>\n' +
    '      <!-- <path d="M0,-5L10,0L0,5"></path> -->\n' +
    '    </marker>\n' +
    '    <marker case-sensitive="refX,refY" id="modifier" markerWidth="8" markerHeight="8"\n' +
    '    ng-attr-refX="{{0}}" ng-attr-refY="{{0}}" fill="black" orient="auto">\n' +
    '      <path ng-attr-d="{{arrow({size: 5, type: \'circle\'})}}"></path>\n' +
    '      <!-- <circle cx="1" cy="1" r="1" fill="black" stroke="black" opacity=".6"></circle> -->\n' +
    '    </marker>\n' +
    '    <linearGradient id="gradient">\n' +
    '      <stop offset="5%" stop-color="#FFDC9E"></stop>\n' +
    '      <stop offset="95%" stop-color="#FFF"></stop>\n' +
    '    </linearGradient>\n' +
    '    <linearGradient id="reactionGradient">\n' +
    '      <stop offset="5%" stop-color="#B0C0FF"></stop>\n' +
    '      <stop offset="95%" stop-color="#FFF"></stop>\n' +
    '    </linearGradient>\n' +
    '  </defs>\n' +
    '  <g ng-attr-transform="translate({{translate.x}}, {{translate.y}})scale({{scale}})">\n' +
    '    <g>\n' +
    '      <line ng-repeat="link in edges" class="link" ng-attr-x1="{{link.source.x}}" ng-attr-y1="{{link.source.y + link.source.group * height}}"\n' +
    '      ng-attr-x2="{{link.target.x}}" ng-attr-y2="{{link.target.y + link.target.group * height}}"\n' +
    '      marker-end="url(#arrow)">\n' +
    '      </line>\n' +
    '    </g>\n' +
    '    <g ng-repeat="group in groups">\n' +
    '      <g ng-repeat="node in group.nodes" class="node" ng-attr-transform="translate({{node.x}},{{node.y + $parent.$index * height}})">\n' +
    '        <circle ng-attr-r="{{30}}" fill="url(#gradient)">\n' +
    '          <title>ID: {{node.id}}, Name: {{node.name}}</title>\n' +
    '        </circle>\n' +
    '        <text class="node-label">{{node.name}}</text>\n' +
    '      </g>\n' +
    '      <rect class="box" ng-attr-x="{{0}}" ng-attr-y="{{$index * height}}" ng-attr-width="{{width}}"\n' +
    '      ng-attr-height="{{height}}" ng-attr-x2="{{width}}"></rect>\n' +
    '      <text x="650" ng-attr-y="{{($index + 1) * height}}" font-family="Georgia" font-size="40">{{group.name}}</text>\n' +
    '    </g>\n' +
    '  </g>\n' +
    '</svg>\n' +
    '');
}]);
