/* eslint-disable no-restricted-globals */

// import not supported is service worker
self.importScripts("./prefetch.ts");

(() => {
  const debug = self.location.hostname === "localhost" || self.location.search.indexOf("debug=true") > 0;
  const info = debug ? console.info.bind(console, "[ServiceWorker]") : () => { };
  const error = console.error.bind(console, "[ServiceWorker]");

  const SHELL_PATH = "/app";
  const SHELL_ROOT = `^${SHELL_PATH}\\/.*`;
  const CACHE_NAME = "app-pages-v1";
  const CACHE_ALLOW_LIST = [CACHE_NAME];

  // deleting any caches that aren"t defined in the cache allowlist
  self.addEventListener("activate", (event: ExtendableEvent) => {
    try {
      event.waitUntil(
        caches.keys().then(cacheNames => Promise.all(
          cacheNames.map(cacheName => ((CACHE_ALLOW_LIST.indexOf(cacheName) === -1)
            ? caches.delete(cacheName)
            : undefined)))));
    } catch (e) {
      error(e);
      throw new Error(e);
    }
  });


  // install and pre-cache the initial urls
  self.addEventListener("install", (_event: ExtendableEvent) => {
    try {
      // The promise that skipWaiting() returns can be safely ignored.
      void self.skipWaiting();

      // Perform any other actions required for your
      // service worker to install, potentially inside
      void caches.open(CACHE_NAME)
        .then(cache => {
          info("opened cache");
          cache.addAll(URLS_TO_PREFETCH.map(url => {
            info("prefetching:", url);
            return new Request(url, { mode: "no-cors" });
          }))
            .then(() => info("prefetch done"))
            .catch(error);
        });

    } catch (e) {
      error(e);
      throw new Error(e);
    }
  });

  const shellRoot = new RegExp(SHELL_ROOT);
  const isShellNavigate = (pathname: string) => (!!shellRoot.exec(pathname));

  // fetch from cache or from th enetwork then cache the response
  self.addEventListener("fetch", (event: FetchEvent) => {
    try {
      // we need to clone request but it's prperties are propertyIsEnumerable=false
      // so both object.assign() and request.clone() cannot be used here. i have to reconstruct it...
      const { body, cache, credentials, headers, integrity, keepalive, method, mode,
        redirect, referrer, referrerPolicy, signal, url } = event.request;
      const reqInfo = {
        body, cache, credentials, headers, integrity, keepalive, method, mode,
        redirect, referrer, referrerPolicy, signal, url,
      };

      // Always respond to navigations with the shell page
      const url2 = new URL(url);
      if ((reqInfo.mode === "navigate") && isShellNavigate(url2.pathname)) {
        url2.pathname = SHELL_PATH;
        reqInfo.url = url2.href;
        reqInfo.mode = "no-cors";
        info(`navigate: ${url} >> ${reqInfo.url} ${reqInfo.method}`);
      }

      // fix module request
      if (reqInfo.credentials !== "include" && reqInfo.mode !== "no-cors") {
        reqInfo.credentials = "include";
        reqInfo.mode = "no-cors";
      }

      event.respondWith(
        caches.match(reqInfo.url).then(resp => {

          if (resp) {
            // Cache hit - return response
            info("cache:", resp.url, resp.statusText);
            return resp;
          }

          return fetch(reqInfo.url, reqInfo).then(resp2 => {
            info("fetch:", resp2.url, resp2.statusText);
            if (!resp2.ok) {
              return resp2;
            }

            // NB! A response is a stream and because we want the browser to consume the
            // response as well as the cache consuming the response, we need  to clone
            // it so we have two streams.
            const responseToCache = resp2.clone();
            void caches.open(CACHE_NAME)
              .then(cache2 => cache2.put(resp2.url, responseToCache));

            return resp2;
          }).catch(reason => {
            error(reason);
          });
        }));
    } catch (e) {
      error(e);
      throw new Error(e);
    }
  });

  info("running");
})();
