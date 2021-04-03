(() => {
  // Application Shell
  const debug = document.location.hostname === "localhost" || document.location.search.indexOf("debug=true") > 0;
  const info = debug ? console.info.bind(console, "[SPA]") : () => { };
  const error = console.error.bind(console, "[SPA]");

  const SLEEP_BEFORE_SW_REGISTRATION = 1000;
  const BASE_PATH = "app";
  const TEMPLATES_PATH = `/${BASE_PATH}`;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      setTimeout(() => {
        navigator.serviceWorker.register(`/${BASE_PATH}/sw.ts`)
          .then((registration) => {
            info("ServiceWorker registration successful with scope: ", registration.scope);
          }, (err) => {
            info("ServiceWorker registration failed: ", err);
          });
      }, SLEEP_BEFORE_SW_REGISTRATION);
    });
  }

  // if we're on the parent folder redirect into the folder ("/app" => "/app/")
  const url = new URL(document.location.href);
  if (url.pathname === `/${BASE_PATH}`) {
    url.pathname += "/";
    document.location.replace(url.href);
  }

  class MainTemplate extends HTMLElement {
    constructor() {
      // element functionality written in here
      // always call super first in constructor
      super();

      // extract the filename and build a script object and an html object from it
      const re = url.pathname.split("/") || ["", BASE_PATH];
      if (re[re.length - 1] === "") re.length--;
      const lastDot = re[re.length - 1].lastIndexOf(".");
      const ext = lastDot > 0 ? re[re.length - 1].substr(lastDot) : "";
      const basename = ext ? re[re.length - 1].substr(0, lastDot) : re[re.length - 1];

      info(`loading template '${basename}' on page '${url.pathname}'`);

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = `${TEMPLATES_PATH}/${basename}/${basename}.ts`;
      script.async = false;
      script.onload = (ev: Event) => {
        info(`on${ev.type}: ${ev.path[0].src}`);
      };
      script.onerror = (oErr: Event) => {
        error(`on${oErr.type}`, oErr);
      };

      const html = document.createElement("span");
      html.id = `main-template-${basename}`;
      fetch(`${TEMPLATES_PATH}/${basename}/${basename}.html`)
        .then(resp => {
          if (resp.ok) {
            return resp.text().then(text => {
              html.innerHTML = text;
            });
          }

          error(resp.url, resp.status);
          switch (resp.status) {
            case 404:
              url.pathname = `/${BASE_PATH}/p404`;
              document.location.replace(url.href);
              break;
            case 401:
            default:
              html.innerHTML = `${resp.statusText} (${resp.status})`;
          }
          return Promise.resolve();
        }).catch(error);

      // append elems to root shadow
      const root = this.attachShadow({ mode: "open" });
      root.appendChild(html);
      root.appendChild(script);
    }
  }

  // register all custom elements here
  customElements.define("main-template", MainTemplate);

  info("running");
})();
