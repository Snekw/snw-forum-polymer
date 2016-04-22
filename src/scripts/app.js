/**
 * Created by Ilkka on 19.4.2016.
 */
(function (document) {
  "use strict";
  /**
   * Conditionally loads webcomponents polyfill if needed.
   * Credit: Glen Maddern (geelen on GitHub)
   */
  var webComponentsSupported = ('registerElement' in document
  && 'import' in document.createElement('link')
  && 'content' in document.createElement('template'));

  if (!webComponentsSupported) {
    var wcPoly = document.createElement('script');
    wcPoly.async = true;
    wcPoly.src = '/bower_components/webcomponentsjs/webcomponents-lite.min.js';
    wcPoly.onload = lazyLoadPolymerAndElements ;
    document.head.appendChild(wcPoly);
  } else {
    lazyLoadPolymerAndElements ();
  }

  function lazyLoadPolymerAndElements () {
    // Let's use Shadow DOM if we have it, because awesome.
    window.Polymer     = window.Polymer || {};
    window.Polymer.dom = 'shadow';

    var elements = [
      'bower_components/polymer/polymer.html',
      'bundles/min-elements.html'
    ];

    //Used to make sure we remove the splash on after all bundles have loaded
    //Only load important bundles!
    //Load less important bundles later.
    //We just want to get the src running :)
    var importCount = elements.length;

    //Remove the splash
    var onImportLoaded = function() {
      importCount--;
      if (importCount > 0)
        return;

      var loadEl = document.getElementById('splash');
      loadEl.addEventListener('transitionend', loadEl.remove);
      document.body.classList.remove('loading');
      var splash = document.getElementById('splash');
      splash.parentNode.removeChild(splash);
    };

    elements.forEach(function (elementURL) {

      var elImport  = document.createElement('link');
      elImport.rel  = 'import';
      elImport.href = elementURL;

      document.head.appendChild(elImport);

      //Don't try to load these on development environment
      //Load the scripts extracted from the elements
      // if (elementURL.indexOf('polymer/polymer.html') < 1){
      //   var elScript = document.createElement('script');
      //   elScript.async = true;
      //   elScript.src = '/scripts/'+ elementURL.replace('.html', '') +'.js';
      //   document.head.appendChild(elScript);
      // }

      if (elImport.import && elImport.import.readyState === 'complete') {
        onImportLoaded();
      } else {
        elImport.addEventListener('load', onImportLoaded);
      }
    });

  }

  var app = document.querySelector('#src');

  app.baseUrl = '/';
  app.webComponentSupport = webComponentsSupported;

  if (window.location.port === '') {  // if production e.g. gh-pages
    app.baseUrl = '/snw-forum-polymer/';
  }

  // Scroll page to top and expand header
  app.scrollPageToTop = function() {
    app.$.headerPanelMain.scrollToTop(true);
  };

})(document);