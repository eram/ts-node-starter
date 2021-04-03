((parent: ShadowRoot = document.getElementsByTagName("main-template")[0].shadowRoot) => {

  const debug = document.location.hostname === "localhost" || document.location.search.indexOf("debug=true") > 0;
  const info = debug ? console.info.bind(console, "[/about]") : () => { };
  // const error = console.error.bind(console, "[/about]");
  info("script running on", parent);
})();
