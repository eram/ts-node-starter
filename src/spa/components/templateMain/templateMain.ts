import { BASE_PATH, error, info, TEMPLATES_PATH, url } from "../../globals";

class OnloadEvent extends Event {
  path: { src: string }[];
}

export class TemplateMain extends HTMLElement {
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
    script.type = "module";
    script.src = `${TEMPLATES_PATH}/${basename}/${basename}.ts`;
    script.async = false;
    script.onload = (ev: OnloadEvent) => {
      info(`on${ev.type}: ${ev.path[0].src}`);
    };
    script.onerror = (oErr: Event) => {
      error(`on${oErr.type}`, oErr);
    };

    const html = document.createElement("span");
    html.id = `template-main-${basename}`;
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
      }).catch(reason => {
        // we're probably offline
        error(reason);
        url.pathname = `/${BASE_PATH}/offline`;
        document.location.replace(url.href);
      });

    // append elems to root shadow
    const root = this.attachShadow({ mode: "open" });
    root.appendChild(html);
    root.appendChild(script);
  }
}


