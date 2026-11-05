// Notifications only: do not cache the app or authenticated responses.
self.addEventListener('push', event => {
  let message = { title: '天图府有新作品', body: '前往你的图寻看看。', url: './#palace' }
  try { message = { ...message, ...event.data.json() } } catch {}
  event.waitUntil(self.registration.showNotification(message.title, {
    body: message.body, icon: './favicon.svg', tag: message.tag || 'tiantufu-new-map',
    data: { url: message.url },
  }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || './#palace', self.registration.scope)
  if (url.origin !== self.location.origin) return
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async windows => {
    for (const window of windows) { if (new URL(window.url).origin === url.origin) { await window.navigate(url.href); return window.focus() } }
    return self.clients.openWindow(url.href)
  }))
})
