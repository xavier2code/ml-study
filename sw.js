/* ML 学习路线 service worker —— 离线可学
   - 安装时预缓存应用外壳（index / days.json / 图标 / manifest）
   - 导航请求：网络优先，失败回退缓存的外壳（离线也能打开）
   - 其余同源 GET（content/days/*.json、figures/、icons/…）：
     stale-while-revalidate —— 先回缓存（秒开），后台静默更新；
     首次访问的天/图会被缓存下来，做一次全文搜索即缓存全部 160 天
   - VERSION 变更即弃旧缓存 */
const VERSION = "ml-study-v3";
const SHELL = [
  "./",
  "./index.html",
  "./days.json",
  "./milestones.json",
  "./favicon.svg",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  // req.url 由浏览器给出，理论必合法；仍作防护，避免极端情况下 SW 抛错中断请求
  let sameOrigin = false;
  try { sameOrigin = new URL(req.url).origin === self.location.origin; } catch { return; }
  if (!sameOrigin) return;

  // 页面导航：网络优先 + 缓存回退（保证拿到新版本，离线时仍可打开）
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put("./index.html", copy));
          return res;
        })
        .catch(() =>
          caches.match("./index.html").then(r => r || caches.match("./"))
        )
    );
    return;
  }

  // 静态资源：stale-while-revalidate
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
