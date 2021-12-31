import {registerRoute} from "workbox-routing";
import {StaleWhileRevalidate, CacheFirst} from "workbox-strategies";
import {CacheableResponsePlugin} from "workbox-cacheable-response";
import {ExpirationPlugin} from "workbox-expiration";
import {BroadcastUpdatePlugin} from "workbox-broadcast-update";

// cache the Google Fonts stylesheets
registerRoute(
	/^https:\/\/fonts\.googleapis\.com/,
	new StaleWhileRevalidate({
		cacheName: "google-fonts-stylesheets",
		plugins: [
			new CacheableResponsePlugin({
				statuses: [0, 200],
			}),
		],
	}),
);

// cache the Google Fonts webfont files
registerRoute(
	/^https:\/\/fonts\.gstatic\.com/,
	new CacheFirst({
		cacheName: "google-fonts-webfonts",
		plugins: [
			new CacheableResponsePlugin({
				statuses: [0, 200],
			}),
			new ExpirationPlugin({
				maxAgeSeconds: 60 * 60 * 24 * 365,
			}),
		],
	}),
);

// cache the application code
registerRoute(
	/(?:\.js|\.css|\/)$/,
	new StaleWhileRevalidate({
		cacheName: "solitaire-application-code",
		plugins: [
			new CacheableResponsePlugin({statuses: [200]}),
			new BroadcastUpdatePlugin("code-updates"),
		],
	}),
);

// prefill application cache
self.addEventListener("install", (event) => {
	const urls = [
		"/",
		"/dist/main.js",
		"/dist/styles.css",
	];

	event.waitUntil(caches.open("solitaire-application-code").then(
		(cache) => cache.addAll(urls),
	));
});
