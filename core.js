(function (root) {
  'use strict';
  const BACKGROUNDS = ['moon', 'rose', 'night', 'sky'];
  const STORAGE_KEY = 'moon-wardrobe:looks:v1';
  function createWardrobe({ looks, loadImage = async () => {}, storage, onChange = () => {} }) {
    if (!looks || !looks.length) throw Error('缺少可试穿造型');
    const ids = new Set(looks.map(look => look.id));
    let token = 0;
    let saved = [];
    try {
      const raw = JSON.parse(storage?.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(raw)) saved = raw.filter(item => item && ids.has(item.current) && BACKGROUNDS.includes(item.background)).slice(0, 60);
    } catch (_) { /* 损坏或禁用的存储不影响试穿。 */ }
    const state = { current: looks[0].id, background: 'moon', pending: null, error: '', history: [], saved };
    const snapshot = () => ({ current: state.current, background: state.background });
    const notify = () => onChange(state);
    function remember() { state.history.push(snapshot()); if (state.history.length > 40) state.history.shift(); }
    async function choose(id, options = {}) {
      if (!ids.has(id)) return false;
      const request = ++token;
      state.pending = id;
      state.error = '';
      notify();
      try {
        await loadImage(id);
        if (request !== token) return false;
        if (id !== state.current || (options.background && options.background !== state.background)) remember();
        state.current = id;
        if (BACKGROUNDS.includes(options.background)) state.background = options.background;
        state.pending = null;
        notify();
        return true;
      } catch (_) {
        if (request !== token) return false;
        state.pending = null;
        state.error = '造型加载失败，已保留当前造型。请重试。';
        notify();
        return false;
      }
    }
    function setBackground(background) {
      if (!BACKGROUNDS.includes(background) || background === state.background) return;
      remember(); state.background = background; notify();
    }
    function undo() {
      token++; state.pending = null; state.error = '';
      const previous = state.history.pop();
      if (previous) Object.assign(state, previous);
      notify();
    }
    function save() {
      const item = snapshot();
      if (state.saved.some(x => x.current === item.current && x.background === item.background)) return 'duplicate';
      const next = [...state.saved, item].slice(-60);
      try {
        if (!storage?.setItem) throw Error('storage unavailable');
        storage.setItem(STORAGE_KEY, JSON.stringify(next));
        state.saved = next; notify(); return 'saved';
      } catch (_) { return 'unavailable'; }
    }
    function removeSaved(index) {
      const next = state.saved.filter((_, i) => i !== index);
      try { storage?.setItem(STORAGE_KEY, JSON.stringify(next)); state.saved = next; notify(); return true; }
      catch (_) { return false; }
    }
    return { state, choose, undo, save, removeSaved, setBackground };
  }
  const api = { createWardrobe, BACKGROUNDS, STORAGE_KEY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MoonCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
