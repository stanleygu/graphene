# Graphene

![Logo](https://raw.githubusercontent.com/stanleygu/graphene-logo/master/app/images/logo.png)

Graphene is a drawing library using [Angular](https://angularjs.org/) and [D3](http://d3js.org/) that lets you create interactive web components!

## Installation

Using `bower`:

```
bower install --save stanleygu/graphene#gh-pages
```

Then add into your HTML:

```
<script src="bower_components/graphene/graphene-standalone.min.js"></script>
```

The standalone build includes the Angular and D3 dependencies.
Alternatively, if you would like to include `Angular` and `D3` separately, use:

```
<script src="bower_components/graphene/graphene.js"></script>
```

## Using Graphene

See [this demo](https://github.com/stanleygu/graphene-logo) of building the Graphene logo using Graphene.

## Building Graphene

* First make sure that you have `gulp` installed

```
npm install -g gulp
```

* Then running `gulp dist` will build the concatenated and minified versions of Graphene.

