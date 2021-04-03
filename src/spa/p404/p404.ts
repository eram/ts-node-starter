((parent: ShadowRoot = document.getElementsByTagName("main-template")[0].shadowRoot) => {

  const debug = document.location.hostname === "localhost" || document.location.search.indexOf("debug=true") > 0;
  const info = debug ? console.info.bind(console, "[/p404]") : () => { };
  // const error = console.error.bind(console, "[/p404]");
  info("script running on", parent);

  function goBack() {
    window.history.back();
  }

  const elem = parent.getElementById("a-back");
  elem.addEventListener("click", goBack, false);
})();
