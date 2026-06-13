/* ============================================================
   Minimal browser environment for loading site/assets/main.js
   under Node, with no jsdom and no dependencies.

   It implements only the slice of the DOM / BOM that main.js
   actually touches. Element lookups that main.js guards with
   "if (!el) return" can safely return null; the few it does not
   guard (panel.querySelector for the console internals) return a
   live stub element instead.

   installDom() also overrides the global timers so the 30s / 120s
   setTimeout calls in main.js cannot keep the test process alive.
   Call controller.uninstall() when done to restore them.
   ============================================================ */

export function installDom(opts = {}) {
  const { dataPage = "home", search = "", pathname = "/", host = "localhost" } = opts;

  const docListeners = Object.create(null);
  const winListeners = Object.create(null);
  const timers = [];

  function makeEl(tag = "div") {
    const handlers = Object.create(null);
    const set = new Set();
    const el = {
      tagName: String(tag).toUpperCase(),
      _attrs: Object.create(null),
      _children: [],
      style: {},
      className: "",
      id: "",
      value: "",
      textContent: "",
      title: "",
      innerHTML: "",
      scrollTop: 0,
      scrollHeight: 10000,
      host,
      parentElement: null,
      classList: {
        add: (c) => set.add(c),
        remove: (c) => set.delete(c),
        contains: (c) => set.has(c),
        toggle(c, force) {
          const want = force === undefined ? !set.has(c) : !!force;
          if (want) set.add(c);
          else set.delete(c);
          return want;
        },
      },
      setAttribute(k, v) {
        this._attrs[k] = String(v);
        if (k === "id") this.id = String(v);
      },
      getAttribute(k) {
        return k in this._attrs ? this._attrs[k] : null;
      },
      hasAttribute(k) {
        return k in this._attrs;
      },
      removeAttribute(k) {
        delete this._attrs[k];
      },
      appendChild(c) {
        this._children.push(c);
        c.parentElement = this;
        return c;
      },
      removeChild(c) {
        const i = this._children.indexOf(c);
        if (i >= 0) this._children.splice(i, 1);
        return c;
      },
      remove() {
        if (this.parentElement) this.parentElement.removeChild(this);
      },
      addEventListener(t, fn) {
        (handlers[t] || (handlers[t] = [])).push(fn);
      },
      removeEventListener(t, fn) {
        if (handlers[t]) handlers[t] = handlers[t].filter((f) => f !== fn);
      },
      dispatch(t, ev) {
        (handlers[t] || []).forEach((fn) =>
          fn(ev || { type: t, target: el, preventDefault() {} })
        );
      },
      click() {
        this.dispatch("click", { type: "click", target: this, preventDefault() {} });
      },
      // Console internals are read back after innerHTML assignment without a
      // null check, so hand back a live stub rather than null here.
      querySelector() {
        return makeEl();
      },
      querySelectorAll() {
        return [];
      },
      _handlers: handlers,
    };
    return el;
  }

  const body = makeEl("body");
  body.setAttribute("data-page", dataPage);
  const documentElement = makeEl("html");

  // Element registry keyed by id, for getElementById. Built via the
  // caller's factory callback so it can use makeEl.
  const els = Object.create(null);
  if (typeof opts.elements === "function") {
    const reg = opts.elements(makeEl) || {};
    for (const [id, el] of Object.entries(reg)) {
      el.id = id;
      els[id] = el;
    }
  }

  const document = {
    body,
    documentElement,
    readyState: "loading",
    createElement: (t) => makeEl(t),
    getElementById: (id) => (id in els ? els[id] : null),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(t, fn) {
      (docListeners[t] || (docListeners[t] = [])).push(fn);
    },
    removeEventListener(t, fn) {
      if (docListeners[t]) docListeners[t] = docListeners[t].filter((f) => f !== fn);
    },
  };

  const window = {
    innerHeight: 1000,
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    addEventListener(t, fn) {
      (winListeners[t] || (winListeners[t] = [])).push(fn);
    },
    removeEventListener(t, fn) {
      if (winListeners[t]) winListeners[t] = winListeners[t].filter((f) => f !== fn);
    },
    requestAnimationFrame: () => 0,
  };

  const storage = () => {
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
      clear: () => m.clear(),
      _map: m,
    };
  };
  const localStorage = storage();
  const sessionStorage = storage();
  const location = { search, pathname, host };

  const saved = {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    requestAnimationFrame: globalThis.requestAnimationFrame,
  };

  // Apply to globals so main.js's bare references resolve.
  globalThis.window = window;
  globalThis.document = document;
  globalThis.location = location;
  globalThis.localStorage = localStorage;
  globalThis.sessionStorage = sessionStorage;
  globalThis.IntersectionObserver = class {
    constructor(cb) {
      this.cb = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.setTimeout = (fn, ms) => {
    timers.push({ fn, ms });
    return timers.length;
  };
  globalThis.clearTimeout = () => {};

  return {
    window,
    document,
    location,
    localStorage,
    sessionStorage,
    els,
    timers,
    makeEl,
    el: (id) => els[id],
    bodyChildren: () => body._children,
    dispatchDocument: (t, ev) => (docListeners[t] || []).forEach((fn) => fn(ev)),
    dispatchWindow: (t, ev) => (winListeners[t] || []).forEach((fn) => fn(ev)),
    fireDOMContentLoaded() {
      document.readyState = "complete";
      (docListeners.DOMContentLoaded || []).forEach((fn) =>
        fn({ type: "DOMContentLoaded" })
      );
    },
    runTimers(maxMs = Infinity) {
      for (const t of timers.splice(0)) if (t.ms <= maxMs) t.fn();
    },
    uninstall() {
      globalThis.setTimeout = saved.setTimeout;
      globalThis.clearTimeout = saved.clearTimeout;
      globalThis.requestAnimationFrame = saved.requestAnimationFrame;
      delete globalThis.window;
      delete globalThis.document;
      delete globalThis.location;
      delete globalThis.localStorage;
      delete globalThis.sessionStorage;
      delete globalThis.IntersectionObserver;
    },
  };
}
