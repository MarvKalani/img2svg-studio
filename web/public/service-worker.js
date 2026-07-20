const shareBridgeCache = "img2svg-share-bridge-v1";
const shareBridgePrefix = "img2svg-share-bridge-";
const shareTargetRoute = "/share-target";
const sharedImageRoute = "/__shared-image/";
const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((names) =>
          Promise.all(
            names
              .filter((name) => name.startsWith(shareBridgePrefix) && name !== shareBridgeCache)
              .map((name) => caches.delete(name)),
          ),
        ),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.pathname === shareTargetRoute) {
    event.respondWith(storeSharedImage(event.request));
    return;
  }
  if (event.request.method === "GET" && url.pathname.startsWith(sharedImageRoute)) {
    event.respondWith(readSharedImageOnce(event.request));
  }
});

async function storeSharedImage(request) {
  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File) || !acceptedImageTypes.has(image.type)) {
    return Response.redirect("/?share-error=unsupported", 303);
  }

  const token = crypto.randomUUID();
  const sharedRequest = new Request(`${self.location.origin}${sharedImageRoute}${token}`);
  const cache = await caches.open(shareBridgeCache);
  // Cache Storage is only a one-navigation bridge; the page deletes the entry on its first read.
  await cache.put(
    sharedRequest,
    new Response(image, {
      headers: {
        "Content-Type": image.type,
        "X-Img2svg-File-Name": encodeURIComponent(image.name),
      },
    }),
  );
  return Response.redirect(`/?shared-image=${encodeURIComponent(token)}`, 303);
}

async function readSharedImageOnce(request) {
  const cache = await caches.open(shareBridgeCache);
  const response = await cache.match(request);
  if (!response) {
    return new Response("Shared image not found.", { status: 404 });
  }
  await cache.delete(request);
  return response;
}
