/* eslint-disable no-undef */
(() => {

  const debug = document.location.hostname === "localhost" || document.location.search.indexOf("debug=true") > 0;
  const info = debug ? console.info.bind(console) : () => { };
  const error = console.error.bind(console);

  info("index.js running");
  const response = document.getElementById("response");

  function refresh(event) {
    event.preventDefault();
    window.fetch("/sso/github/refresh")
      .then(resp => resp.json())
      .then(data => { response.innerText = data.error || data.token || JSON.stringify(data); })
      .catch(err => { response.innerText = err.message || JSON.stringify(err); });
  }

  function logout(event) {
    event.preventDefault();
    window.fetch("/sso/github/revoke")
      .then(resp => resp.json())
      .then(data => { response.innerText = data.error || data.ok || JSON.stringify(data); })
      .catch(err => { response.innerText = err.message || JSON.stringify(err); });
  }

  document.getElementById("btnRefresh").addEventListener("click", refresh, false);
  document.getElementById("btnLogout").addEventListener("click", logout, false);

  const searchParams = (new URL(document.location)).searchParams;
  const user = searchParams.get("error") || searchParams.get("user");
  if (user) {
    response.innerText = decodeURIComponent(error);
  }

})();

