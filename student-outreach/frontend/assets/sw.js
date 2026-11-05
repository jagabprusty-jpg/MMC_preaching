const CACHE_NAME = 'mantra-outreach-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/students.html',
  '/student-details.html',
  '/register-student.html',
  '/attendance.html',
  '/sessions.html',
  '/followups.html',
  '/reports.html',
  '/settings.html',
  '/photo-directory.html',
  '/css/style.css',
  '/css/components.css',
  '/css/dashboard.css',
  '/css/responsive.css',
  '/js/api.js',
  '/js/auth.js',
  '/js/dashboard.js',
  '/js/students.js',
  '/js/attendance.js',
  '/js/sessions.js',
  '/js/followups.js',
  '/js/reports.js',
  '/js/photo_directory.js',
  '/assets/manifest.json'
];

// Install: Cache static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Never cache API calls (Strict security rule: Do not cache private student information or authenticated API responses)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // If request is for an API endpoint, network only
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first with cache fallback for HTML and assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Update cache with fresh version if static asset
        if (response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
