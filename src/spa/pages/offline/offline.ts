import { info } from "../../globals";

((parent: ShadowRoot = document.getElementsByTagName("template-main")[0].shadowRoot) => {
  info("script running on", parent);

  function reload() {
    window.location.reload();
  }

  const elem = parent.getElementById("a-reload");
  elem.addEventListener("click", reload, false);
})();
