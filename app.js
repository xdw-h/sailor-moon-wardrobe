(function () {
  'use strict';
  const { characters, types, looks } = window.MoonData;
  const $ = selector => document.querySelector(selector);
  const byId = new Map(looks.map(look => [look.id, look]));
  const characterById = new Map(characters.map(character => [character.id, character]));
  const typeById = new Map(types.map(type => [type.id, type]));
  const scenes = [
    { id: 'moon', name: '月光花园', color: '#e7d9c8', top: '#f3eadd', bottom: '#eee1d9' },
    { id: 'rose', name: '玫瑰心事', color: '#dfb6c2', top: '#fae9e7', bottom: '#efd1d9' },
    { id: 'night', name: '银河夜色', color: '#66617e', top: '#32344f', bottom: '#8e7f96' },
    { id: 'sky', name: '晴空来信', color: '#bfd6e3', top: '#e4eff1', bottom: '#cfdfe8' }
  ];
  const imageCache = new Map();
  let activeCharacter = characters[0].id;
  let filter = 'all';
  let lastAttempt = looks[0].id;
  let toastTimer;
  let catalogPromise;
  let storage;
  try { storage = window.localStorage; } catch (_) { storage = null; }
  function loadImage(id) {
    const cached = imageCache.get(id);
    if (cached) return cached.promise;
    const image = new Image();
    const entry = { image, ready: false, promise: null };
    entry.promise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => fail(), 15000);
      function fail() {
        clearTimeout(timeout); image.onload = image.onerror = null;
        imageCache.delete(id); reject(Error('图片不可用'));
      }
      image.onload = () => {
        clearTimeout(timeout); entry.ready = true;
        image.onload = image.onerror = null; resolve(image);
      };
      image.onerror = fail;
      image.src = byId.get(id).image;
    });
    imageCache.set(id, entry);
    return entry.promise;
  }
  const game = window.MoonCore.createWardrobe({ looks, loadImage, storage, onChange: renderState });
  function escape(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
  function toast(message) {
    $('#toast').textContent = message; $('#toast').classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200);
  }
  async function wear(id, options = {}) {
    if (!byId.has(id)) return;
    lastAttempt = id;
    return game.choose(id, options);
  }
  function renderCharacters() {
    $('#characters').innerHTML = characters.map(character => `<button class="character ${character.id === activeCharacter ? 'active' : ''}" data-character="${character.id}" aria-pressed="${character.id === activeCharacter}" aria-label="选择${character.name}" style="--character-color:${character.color}"><span class="portrait"><img src="assets/portraits/${character.id}.webp" alt="" width="48" height="48"></span><span>${character.name}<small>${character.planet}</small></span></button>`).join('');
  }
  function renderFilters() {
    const categories = [{ id: 'all', name: '全部' }, { id: 'guardian', name: '战士服' }, { id: 'everyday', name: '少女日常' }, { id: 'princess', name: '礼服' }];
    $('#filters').innerHTML = categories.map(category => `<button class="filter ${filter === category.id ? 'active' : ''}" data-filter="${category.id}" aria-pressed="${filter === category.id}">${category.name}</button>`).join('');
  }
  function renderOutfits() {
    const visible = looks.filter(look => look.character === activeCharacter && (filter === 'all' || (filter === 'guardian' && ['base', 'super', 'eternal'].includes(look.type)) || (filter === 'everyday' && ['school', 'casual'].includes(look.type)) || look.type === filter));
    $('#outfit-count').textContent = String(visible.length).padStart(2, '0') + ' LOOKS';
    $('#outfits').innerHTML = visible.map(look => {
      const type = typeById.get(look.type);
      return `<button class="outfit ${game.state.current === look.id ? 'active' : ''} ${game.state.pending === look.id ? 'pending' : ''}" data-look="${look.id}" aria-pressed="${game.state.current === look.id}" aria-label="试穿${characterById.get(look.character).name}的${look.name}" title="${escape(look.note)}"><span class="outfit-art"><img src="${look.thumb}" alt="" width="160" height="210" decoding="async"><span class="check">✓</span></span><span class="outfit-title">${look.name}</span><span class="outfit-subtitle">${type.en}</span></button>`;
    }).join('');
  }
  function renderState() {
    const state = game.state;
    const look = byId.get(state.current);
    const character = characterById.get(look.character);
    const stage = $('#stage');
    stage.dataset.background = state.background;
    stage.setAttribute('aria-busy', String(Boolean(state.pending)));
    const ready = imageCache.get(state.current)?.ready;
    if (ready && $('#doll').getAttribute('src') !== look.image) $('#doll').src = look.image;
    $('#doll').alt = `${character.name} · ${look.name} · 同人重绘`;
    $('#doll').hidden = !ready;
    $('#stage-en').textContent = character.en;
    $('#stage-name').textContent = character.name;
    $('#stage-look').textContent = look.name;
    $('#stage-number').textContent = `${String(characters.indexOf(character) + 1).padStart(2, '0')} / 05`;
    $('#loading').hidden = !state.pending;
    $('#loading').textContent = ready ? '正在换上新造型…' : '正在打开月光衣橱…';
    $('#retry').hidden = !state.error;
    $('#error-message').hidden = !state.error;
    $('#error-message').textContent = state.error;
    $('#undo').disabled = !state.history.length && !state.pending;
    $('#download').disabled = !ready || Boolean(state.pending);
    $('#save').disabled = !ready || Boolean(state.pending);
    $('#scene-caption').textContent = scenes.find(scene => scene.id === state.background).name;
    $('#saved-count').textContent = state.saved.length;
    document.querySelectorAll('[data-scene]').forEach(button => {
      const selected = button.dataset.scene === state.background;
      button.classList.toggle('active', selected); button.setAttribute('aria-pressed', selected);
    });
    document.querySelectorAll('[data-look]').forEach(button => {
      button.classList.toggle('active', button.dataset.look === state.current);
      button.classList.toggle('pending', button.dataset.look === state.pending);
      button.setAttribute('aria-pressed', button.dataset.look === state.current);
    });
    if ($('#collection-dialog').open) renderCollection();
  }
  function openDialog(dialog) { dialog.showModal(); document.body.style.overflow = 'hidden'; }
  function closeDialog(dialog) { dialog.close(); }
  function renderCollection() {
    $('#collection-items').innerHTML = game.state.saved.length ? game.state.saved.map((item, i) => {
      const look = byId.get(item.current);
      const character = characterById.get(look.character);
      const scene = scenes.find(scene => scene.id === item.background);
      return `<article class="saved-card"><button data-restore="${i}" style="background:${scene.color}" aria-label="恢复${character.name}的${look.name}"><img src="${look.thumb}" alt="" width="180" height="240" loading="lazy"><p>${character.name} · ${look.name}</p><small>${scene.name}</small></button><button class="delete-saved" data-delete="${i}" aria-label="移除此收藏">×</button></article>`;
    }).join('') : '<p class="empty">还没有收藏的月光时刻。<br>在换装室选好造型，点击「收藏造型」。</p>';
  }
  function loadCatalog() {
    if (window.MoonCatalog) return Promise.resolve(window.MoonCatalog);
    if (catalogPromise) return catalogPromise;
    catalogPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(fail, 15000);
      function fail() { clearTimeout(timeout); script.remove(); catalogPromise = null; reject(Error('图鉴加载失败')); }
      script.src = 'catalog-data.js';
      script.onload = () => { clearTimeout(timeout); if (window.MoonCatalog) resolve(window.MoonCatalog); else fail(); };
      script.onerror = fail;
      document.head.appendChild(script);
    });
    return catalogPromise;
  }
  async function showCatalog() {
    if (!$('#catalog-dialog').open) openDialog($('#catalog-dialog'));
    $('#catalog-items').innerHTML = '<p class="empty">正在打开服装档案…</p>';
    try { await loadCatalog(); renderCatalog(); }
    catch (_) { $('#catalog-items').innerHTML = '<div class="catalog-error">图鉴没有加载成功，请检查网络。<br><button id="retry-catalog">重新加载</button></div>'; }
  }
  function renderCatalog() {
    if (!window.MoonCatalog) return;
    const query = $('#catalog-search').value.trim().toLowerCase();
    const status = $('#catalog-status').value;
    const ready = new Map(looks.filter(look => look.catalogId).map(look => [look.catalogId, look]));
    const records = window.MoonCatalog.filter(record => {
      const matchesQuery = [record.角色, record.服装, record.版本, record.分类].some(value => value.toLowerCase().includes(query));
      return matchesQuery && (status === 'all' || (status === 'ready' && ready.has(record.id)) || (status === 'pending' && !ready.has(record.id)));
    });
    $('#catalog-summary').textContent = `显示 ${records.length} / 114 条研究记录 · 29 条已有对应同人造型，另有 1 款日常原创搭配`;
    $('#catalog-items').innerHTML = records.length ? records.map(record => {
      const look = ready.get(record.id);
      const url = /^https:\/\//.test(record.出处) ? record.出处 : '#';
      return `<article class="catalog-card"><header><small>${escape(record.id)} · ${escape(record.角色)}</small><span class="badge ${look ? 'ready' : ''}">${look ? '可试穿同人版' : record.状态 === '关联项' ? '关联记录' : '待制作'}</span></header><h3>${escape(record.服装)}</h3><p>${escape(record.版本)}</p><p>研究状态：${escape(record.状态)}${look ? ' · 图片为 AI 重绘' : ''}</p><footer><a href="${escape(url)}" target="_blank" rel="noopener noreferrer">查看资料 ↗</a>${look ? `<button data-catalog-look="${look.id}">试穿造型 →</button>` : ''}</footer></article>`;
    }).join('') : '<p class="empty">没有找到匹配的服装，请换个关键词。</p>';
  }
  async function download() {
    const button = $('#download');
    if (button.disabled) return;
    button.disabled = true;
    try {
      const look = byId.get(game.state.current);
      const character = characterById.get(look.character);
      const scene = scenes.find(scene => scene.id === game.state.background);
      const image = await loadImage(look.id);
      const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 1400;
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 650, 1400);
      gradient.addColorStop(0, scene.top); gradient.addColorStop(1, scene.bottom);
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1000, 1400);
      ctx.strokeStyle = '#ffffff99'; ctx.lineWidth = 2; ctx.strokeRect(28, 28, 944, 1344);
      ctx.beginPath(); ctx.arc(500, 440, 280, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(500, 440, 300, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = scene.id === 'night' ? '#f7ecdf' : '#aa8b6a';
      ctx.font = '22px Georgia'; ctx.fillText('MOONLIGHT ATELIER', 65, 85);
      ctx.font = '44px Georgia'; ctx.fillText('✦', 105, 285); ctx.fillText('✧', 830, 490);
      const scale = Math.min(850 / image.naturalWidth, 1070 / image.naturalHeight);
      const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
      ctx.drawImage(image, (1000 - width) / 2, 115 + 1070 - height, width, height);
      ctx.fillStyle = scene.id === 'night' ? '#fcf4e8' : '#665248';
      ctx.font = '46px "Microsoft YaHei", sans-serif'; ctx.fillText(character.name, 70, 1255);
      ctx.font = '23px "Microsoft YaHei", sans-serif'; ctx.fillText(look.name, 70, 1301);
      ctx.font = '18px "Microsoft YaHei", sans-serif'; ctx.fillText('月光衣橱 · 美少女战士同人重绘', 70, 1344);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw Error('export unavailable');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `月光衣橱-${character.name}-${look.name}.png`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      toast('图片已生成；手机可在下载记录中查看。');
    } catch (_) { toast('图片保存失败，请重试或使用浏览器截图。'); }
    finally { renderState(); }
  }
  $('#characters').addEventListener('click', event => {
    const button = event.target.closest('[data-character]'); if (!button) return;
    activeCharacter = button.dataset.character;
    const currentType = byId.get(game.state.pending || game.state.current).type;
    renderCharacters(); renderOutfits(); wear(`${activeCharacter}-${currentType}`);
  });
  $('#filters').addEventListener('click', event => {
    const button = event.target.closest('[data-filter]'); if (!button) return;
    filter = button.dataset.filter; renderFilters(); renderOutfits();
  });
  $('#outfits').addEventListener('click', event => { const button = event.target.closest('[data-look]'); if (button) wear(button.dataset.look); });
  $('#backgrounds').innerHTML = scenes.map(scene => `<button class="scene" data-scene="${scene.id}" style="--swatch:${scene.color}" aria-label="${scene.name}" title="${scene.name}" aria-pressed="${scene.id === 'moon'}"></button>`).join('');
  $('#backgrounds').addEventListener('click', event => { const button = event.target.closest('[data-scene]'); if (button) game.setBackground(button.dataset.scene); });
  $('#undo').onclick = () => { game.undo(); activeCharacter = byId.get(game.state.current).character; renderCharacters(); renderOutfits(); };
  $('#random').onclick = () => {
    const candidates = looks.filter(look => look.character === activeCharacter && look.id !== game.state.current);
    const look = candidates[Math.floor(Math.random() * candidates.length)];
    filter = 'all'; renderFilters(); renderOutfits(); wear(look.id);
  };
  $('#save').onclick = () => {
    const result = game.save();
    toast(result === 'saved' ? '已收藏这个月光时刻 ♡' : result === 'duplicate' ? '这个造型已经在收藏里啦。' : '浏览器未允许保存收藏，请检查隐私设置。');
  };
  $('#download').onclick = download;
  $('#retry').onclick = () => wear(lastAttempt);
  $('#wardrobe-nav').onclick = () => $('.workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#collection-nav').onclick = () => { renderCollection(); openDialog($('#collection-dialog')); };
  $('#collection-items').addEventListener('click', async event => {
    const remove = event.target.closest('[data-delete]');
    if (remove) { if (!game.removeSaved(Number(remove.dataset.delete))) toast('浏览器无法保存修改，请重试。'); return; }
    const restore = event.target.closest('[data-restore]'); if (!restore) return;
    const saved = game.state.saved[Number(restore.dataset.restore)];
    activeCharacter = byId.get(saved.current).character; filter = 'all';
    renderCharacters(); renderFilters(); renderOutfits(); closeDialog($('#collection-dialog'));
    await wear(saved.current, { background: saved.background });
  });
  $('#catalog-nav').onclick = $('#catalog-link').onclick = showCatalog;
  $('#catalog-search').addEventListener('input', renderCatalog);
  $('#catalog-status').addEventListener('change', renderCatalog);
  $('#catalog-items').addEventListener('click', event => {
    if (event.target.closest('#retry-catalog')) { showCatalog(); return; }
    const button = event.target.closest('[data-catalog-look]'); if (!button) return;
    const look = byId.get(button.dataset.catalogLook);
    activeCharacter = look.character; filter = 'all'; renderCharacters(); renderFilters(); renderOutfits();
    closeDialog($('#catalog-dialog')); wear(look.id); $('.workspace').scrollIntoView({ block: 'start' });
  });
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('[data-close]').onclick = () => closeDialog(dialog);
    dialog.addEventListener('close', () => { document.body.style.overflow = ''; });
    dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog(dialog); } });
  });
  renderCharacters(); renderFilters(); renderOutfits(); wear(looks[0].id);
})();
