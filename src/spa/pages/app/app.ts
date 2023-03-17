import { info } from "../../globals";

((parent: ShadowRoot = document.getElementsByTagName("template-main")[0].shadowRoot) => {
  info("script running on", parent);

})();
