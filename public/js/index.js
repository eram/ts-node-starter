/* eslint-disable */
document.getElementById("btnRefresh").addEventListener('click', refresh, false);
document.getElementById("btnLogout").addEventListener('click', logout, false);

let response = document.getElementById("response");

function refresh(event) {
  event.preventDefault();
  window.fetch("/sso/github/refresh")
    .then(resp => resp.json())
    .then(data => response.innerText = data.error || data.token || JSON.stringify(data))
    .catch(error => response.innerText = error.message || JSON.stringify(error));
}

function logout(event) {
  event.preventDefault();
  window.fetch("/sso/github/revoke")
    .then(resp => resp.json())
    .then(data => response.innerText = data.error || data.ok || JSON.stringify(data))
    .catch(error => response.innerText = error.message || JSON.stringify(error));
}

const searchParams = (new URL(document.location)).searchParams;
const error = searchParams.get("error") || searchParams.get("user");
if (error) {
  response.innerText = decodeURIComponent(error);
}
