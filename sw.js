/* =========================================
   sw.js — service worker: permite instalar o painel
   como app e abrir mesmo sem internet.
   Só funciona quando servido por http/https
   (ex.: GitHub Pages), não abrindo o arquivo direto.
   ========================================= */

// Troque a versão sempre que publicar mudanças, para forçar a atualização
const VERSAO = 'painel-vencimentos-v2';

const ARQUIVOS = [
  './',
  './index.html',
  './css/style.css',
  './js/util.js',
  './js/dados.js',
  './js/telas.js',
  './js/acoes.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(VERSAO).then(cache => cache.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys().then(chaves => Promise.all(chaves.filter(c => c !== VERSAO).map(c => caches.delete(c))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', evento => {
  const req = evento.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // Arquivos do painel: tenta a rede primeiro (pega atualizações), cai no cache sem internet
    evento.respondWith(
      fetch(req)
        .then(resp => {
          const copia = resp.clone();
          caches.open(VERSAO).then(cache => cache.put(req, copia));
          return resp;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
  } else {
    // Bibliotecas de CDN (Tailwind, SheetJS, fonte): usa o cache e atualiza em segundo plano
    evento.respondWith(
      caches.match(req).then(emCache => {
        const daRede = fetch(req)
          .then(resp => {
            const copia = resp.clone();
            caches.open(VERSAO).then(cache => cache.put(req, copia));
            return resp;
          })
          .catch(() => emCache);
        return emCache || daRede;
      })
    );
  }
});
