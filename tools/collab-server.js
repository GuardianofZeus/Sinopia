#!/usr/bin/env node
/* Sinopia "draw together" server for the local network. No dependencies: run it with Node.js.

     node tools/collab-server.js [port]      (or double-click "Start collab server.bat")

   It serves the app (index.html, the manifest, the service worker and icons, nothing else from the folder) and relays
   messages between everyone connected at ws://<this PC>:<port>/collab. It keeps no drawing of its own: when someone
   joins, the person who has been connected longest sends them a copy of the drawing.

   Messages from a browser:
     text   {t:'hello', name, join}   first message; the server answers {t:'welcome', id, peers}
            {t:'ready'}               this peer has the drawing and can hand out copies
            {t:'snapreq'}             ask the longest-connected ready peer for a copy
            anything else             relayed with `from` added, to `to` if set, otherwise to everyone else
     binary [uint32 to][...]          relayed with the first 4 bytes replaced by the sender's id (to 0 = everyone else) */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');

const ROOT = path.resolve(__dirname, '..');
const FILES = { '/': 'index.html', '/index.html': 'index.html', '/manifest.webmanifest': 'manifest.webmanifest', '/sw.js': 'sw.js' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const server = http.createServer((req, res) => {
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400).end(); return; }
  if (p === '/collab/info') { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }).end(JSON.stringify({ app: 'sinopia', peers: peers.size })); return; }
  let rel = FILES[p];
  if (!rel && /^\/icons\/[\w.-]+$/.test(p)) rel = p.slice(1);
  if (!rel) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return; }
  fs.readFile(path.join(ROOT, rel), (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(rel)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(data);
  });
});

/* ---- a minimal WebSocket server (RFC 6455): handshake, framing, ping/pong, close ---- */
const peers = new Map();   // id -> { id, name, sock, ready, since }
let nextPeer = 1;

server.on('upgrade', (req, sock) => {
  if (!req.url.startsWith('/collab') || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { sock.destroy(); return; }
  const key = req.headers['sec-websocket-key'];
  if (!key) { sock.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  sock.setNoDelay(true);
  const P = { id: 0, name: 'Guest', sock, ready: false, since: Date.now() };
  let buf = Buffer.alloc(0), frags = [], fragOp = 0;
  sock.on('data', chunk => {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    for (;;) {
      if (buf.length < 2) return;
      const fin = buf[0] & 0x80, op = buf[0] & 0x0f, masked = buf[1] & 0x80;
      let len = buf[1] & 0x7f, o = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); o = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); o = 10; }
      if (len > 1024 * 1024 * 1024) { sock.destroy(); return; }
      const need = o + (masked ? 4 : 0) + len;
      if (buf.length < need) return;
      let data = buf.subarray(o + (masked ? 4 : 0), need);
      if (masked) { const m = buf.subarray(o, o + 4); data = Buffer.from(data); for (let i = 0; i < data.length; i++) data[i] ^= m[i & 3]; }
      buf = buf.subarray(need);
      if (op === 8) { close(P); return; }
      if (op === 9) { send(P, data, 10); continue; }
      if (op === 10) continue;
      if (op === 0) { frags.push(data); if (!fin) continue; data = Buffer.concat(frags); frags = []; onMessage(P, fragOp, data); continue; }
      if (!fin) { fragOp = op; frags = [data]; continue; }
      onMessage(P, op, data);
    }
  });
  sock.on('close', () => close(P));
  sock.on('error', () => close(P));
});

function frame(data, op) {
  const n = data.length;
  const head = n < 126 ? Buffer.from([0x80 | op, n]) : n < 65536 ? Buffer.alloc(4) : Buffer.alloc(10);
  if (n >= 126 && n < 65536) { head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(n, 2); }
  else if (n >= 65536) { head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(n), 2); }
  return [head, data];
}
function send(P, data, op) {
  if (P.sock.destroyed) return;
  const [h, d] = frame(data, op); P.sock.write(h); P.sock.write(d);
}
const sendJSON = (P, obj) => send(P, Buffer.from(JSON.stringify(obj)), 1);

function onMessage(P, op, data) {
  if (op === 2) {   // binary: route by the first 4 bytes, then stamp the sender there
    if (!P.id || data.length < 8) return;
    const to = data.readUInt32LE(0), out = Buffer.from(data); out.writeUInt32LE(P.id, 0);
    for (const Q of peers.values()) if (Q !== P && (!to || Q.id === to)) send(Q, out, 2);
    return;
  }
  if (op !== 1) return;
  let m; try { m = JSON.parse(data.toString('utf8')); } catch (e) { return; }
  if (m.t === 'hello') {
    if (P.id) return;
    P.id = nextPeer++; P.name = String(m.name || 'Guest').slice(0, 24);
    const others = [...peers.values()].filter(Q => Q.ready);
    peers.set(P.id, P);
    if (!others.length) P.ready = true;   // the first one in shares their drawing
    sendJSON(P, { t: 'welcome', id: P.id, peers: others.map(Q => ({ id: Q.id, name: Q.name })) });
    return;
  }
  if (!P.id) return;
  if (m.t === 'ready') {   // has the drawing: now the others hear about them
    P.ready = true;
    if (!P.announced) { P.announced = true; for (const Q of peers.values()) if (Q !== P) sendJSON(Q, { t: 'peer', id: P.id, name: P.name }); log(P.name + ' is drawing (' + [...peers.values()].filter(Q => Q.announced).length + ' in the session)'); }
    return;
  }
  if (m.t === 'snapreq') {
    const src = [...peers.values()].filter(Q => Q !== P && Q.ready).sort((a, b) => a.since - b.since)[0];
    if (src) sendJSON(src, { t: 'snapreq', from: P.id }); else { P.ready = true; sendJSON(P, { t: 'nosnap' }); }
    return;
  }
  m.from = P.id;
  const out = Buffer.from(JSON.stringify(m));
  for (const Q of peers.values()) if (Q !== P && (!m.to || Q.id === m.to)) send(Q, out, 1);
}
function close(P) {
  if (P.closed) return; P.closed = true;
  try { P.sock.end(); } catch (e) {}
  if (!P.id || !peers.has(P.id)) return;
  peers.delete(P.id);
  if (!P.announced) return;
  for (const Q of peers.values()) sendJSON(Q, { t: 'leave', id: P.id });
  log(P.name + ' left (' + [...peers.values()].filter(Q => Q.announced).length + ' in the session)');
}
const log = s => console.log(new Date().toLocaleTimeString() + '  ' + s);

/* ---- start, trying the next port if this one is taken ---- */
let port = +process.argv[2] || 8080;
server.on('error', e => {
  if (e.code === 'EADDRINUSE' && port < 8099) { port++; server.listen(port); return; }
  console.error('Could not start the server: ' + e.message); process.exit(1);
});
server.on('listening', () => {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === 'IPv4' && !a.internal) ips.push(a.address);
  console.log('\n  Sinopia: drawing together is on.\n');
  console.log('  On this PC, open:        http://localhost:' + port);
  for (const ip of ips) console.log('  On other PCs or an iPad: http://' + ip + ':' + port);
  console.log('\n  Everyone on the same Wi-Fi opens one of these, then File > Draw together > Connect.');
  console.log('  Leave this window open while you draw. Close it to end the session.\n');
});
server.listen(port);
