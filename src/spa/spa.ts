import { TemplateMain } from "./components/templateMain/templateMain";
import { url, info, error, BASE_PATH } from "./globals";

(() => {
  // Application Shell
  const SLEEP_BEFORE_SW_REGISTRATION = 1000;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      setTimeout(() => {
        navigator.serviceWorker.register(`/${BASE_PATH}/sw.ts`)
          .then((registration) => {
            info("ServiceWorker registration successful with scope: ", registration.scope);
          }, (err) => {
            error("ServiceWorker registration failed: ", err);
          });
      }, SLEEP_BEFORE_SW_REGISTRATION);
    });
  }

  // if we're on the parent folder redirect into the folder ("/app" => "/app/")
  if (url.pathname === `/${BASE_PATH}`) {
    url.pathname += "/";
    document.location.replace(url.href);
  }

  // register all custom elements here
  customElements.define("template-main", TemplateMain);

  info("running");
})();
