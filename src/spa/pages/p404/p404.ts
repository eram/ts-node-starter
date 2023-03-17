import { info } from "../../globals";

((parent: ShadowRoot = document.getElementsByTagName("template-main")[0].shadowRoot) => {
  info("script running on", parent);

  function goBack() {
    window.history.back();
  }

  const elem = parent.getElementById("a-back");
  elem.addEventListener("click", goBack, false);
})();
