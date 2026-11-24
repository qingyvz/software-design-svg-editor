import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = resolve(root, '.runtime/visual');
const evidence = resolve(root, '../doc/evidence/vscode');
const [mode = 'inspect', value, port = '9338'] = process.argv.slice(2);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const state = () => JSON.parse(readFileSync(resolve(directory, 'state.json'), 'utf8'));
async function action(name) {
  const id = Date.now() + '-' + Math.random().toString(36).slice(2);
  writeFileSync(resolve(directory, 'request.json'), JSON.stringify({ id, action: name }));
  for (let n = 0; n < 200; n++) {
    await delay(100);
    if (existsSync(resolve(directory, 'state.json'))) {
      const current = state();
      if (current.status === 'failed') throw new Error(current.error);
      if (current.lastRequestId === id) return current;
    }
  }
  throw new Error('Host request timed out: ' + name);
}
if (mode === 'action' || mode === 'finish') {
  const current = await action(mode === 'finish' ? 'finish' : value);
  if (mode === 'finish') { mkdirSync(evidence, { recursive: true }); writeFileSync(resolve(evidence, 'host-verification.json'), JSON.stringify(current, null, 2)); }
  console.log(JSON.stringify(current));
  process.exit(0);
}
const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
const target = targets.find(item => item.type === 'page' && /workbench/.test(item.url));
if (!target) throw new Error('No workbench target on this isolated task port');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let serial = 0;
const pending = new Map();
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject, timeout } = pending.get(message.id);
    clearTimeout(timeout); pending.delete(message.id);
    message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
  }
};
function call(method, params = {}) {
  const id = ++serial;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000);
    pending.set(id, { resolve, reject, timeout }); socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
try {
  await call('Page.enable');
  await call('Emulation.clearDeviceMetricsOverride');
  await delay(400);
  if (mode === 'inspect') {
    console.log(JSON.stringify(await evaluate('({title:document.title,width:innerWidth,height:innerHeight,outerWidth:outerWidth,outerHeight:outerHeight,dpr:devicePixelRatio,text:document.body.innerText.slice(0,6500),rows:[...document.querySelectorAll(".monaco-list-row")].map(e=>({text:e.innerText,aria:e.getAttribute("aria-label"),rect:{x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}}))})')));
  } else if (mode === 'panes') {
    console.log(JSON.stringify(await evaluate('[...document.querySelectorAll(".pane-header")].map(e=>({text:e.innerText,aria:e.getAttribute("aria-label"),class:e.className}))')));
  } else if (mode === 'toggle-pane') {
    console.log(JSON.stringify(await evaluate('(()=>{const e=[...document.querySelectorAll(".pane-header")].find(e=>e.innerText.trim()===' + JSON.stringify(value) + ');if(!e)throw Error("Unknown visible pane");e.dispatchEvent(new MouseEvent("click",{bubbles:true,detail:1}));return e.innerText})()')));
    await delay(400);
  } else if (mode === 'capture') {
    if (!/^[A-Za-z0-9_.-]+\.png$/.test(value) || basename(value) !== value) throw new Error('Use a simple PNG name');
    await evaluate('document.fonts.ready.then(()=>true)');
    const png = await call('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    mkdirSync(evidence, { recursive: true });
    writeFileSync(resolve(evidence, value), Buffer.from(png.data, 'base64'));
    console.log(JSON.stringify({ file: resolve(evidence, value), bytes: Buffer.from(png.data, 'base64').length }));
  } else if (mode === 'click') {
    const clicked = await evaluate('(()=>{const row=[...document.querySelectorAll(".monaco-list-row")].find(e=>e.innerText.trim()===' + JSON.stringify(value) + ');if(!row)throw Error("No current visible row");const e=row.querySelector(".label-name")||row;const r=e.getBoundingClientRect();const opts={bubbles:true,cancelable:true,view:window,button:0,buttons:1,detail:1,clientX:r.x+r.width/2,clientY:r.y+r.height/2};e.dispatchEvent(new MouseEvent("mousedown",opts));e.dispatchEvent(new MouseEvent("mouseup",{...opts,buttons:0}));e.dispatchEvent(new MouseEvent("click",{...opts,buttons:0}));return {text:row.innerText,aria:row.getAttribute("aria-label")}})()');
    console.log(JSON.stringify({ clicked }));
    await delay(350);
    console.log(JSON.stringify(await action('status')));
  } else throw new Error('Unknown visual mode');
} finally { socket.close(); }
