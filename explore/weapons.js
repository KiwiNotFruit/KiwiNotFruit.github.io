/* weapons.js
   Framework-free script to load weapons.json and mods.json, render cards, support search (name-only), pagination, popovers,
   and client-side mod selection that updates weapon Dosh totals instantly.

   Behavior:
   - Each weapon must have a numeric `dosh` property (base cost).
   - Mods are loaded from mods.json and must include `id`, `slot`, and `dosh`.
   - Clicking a mod toggles selection for that weapon. Only one mod per slot is allowed; selecting a mod will deselect any other selected mod in the same slot.
   - The weapon's displayed Dosh updates immediately: weapon.dosh + sum(selected mods' dosh).
   - Selections are persisted in localStorage so they survive page reloads.
   - Mod info is still available via hover popovers. A small info link opens the mod page in a new tab.
*/
(() => {
  const listEl = document.getElementById('list');
  const searchEl = document.getElementById('search');
  const classLinks = document.querySelectorAll('.class-links a');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');
  const popover = document.getElementById('popover');

  let weapons = [];
  let mods = [];
  let modsById = {};
  let filtered = [];
  let page = 1;
  const perPage = 10;
  let selectedClass = '';

  const STORAGE_KEY = 'weaponModSelections_v1';

  function loadSelections(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveSelections(obj){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }catch(e){}
  }

  async function load(){
    try{
      const [wepRes, modRes] = await Promise.all([
        fetch('weapons.json'),
        fetch('mods.json')
      ]);
      weapons = await wepRes.json();
      mods = await modRes.json();
      modsById = Object.fromEntries((mods||[]).map(m => [m.id, m]));
    }catch(e){
      console.error('Failed to load weapons.json or mods.json', e);
      weapons = [];
      mods = [];
      modsById = {};
    }
    filtered = weapons.slice();
    render();
  }

  function render(){
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / perPage));
    if(page>pages) page = pages;
    const start = (page-1)*perPage;
    const end = start + perPage;
    const slice = filtered.slice(start, end);

    listEl.innerHTML = '';
    if(slice.length === 0){
      listEl.innerHTML = '<p>No weapons found.</p>';
    }

    const selections = loadSelections();

    for(const w of slice){
      const card = document.createElement('article');
      card.className = 'weapon-card';
      card.dataset.weaponId = w.id;

      const imgWrap = document.createElement('div');
      imgWrap.className = 'weapon-image';
      const img = document.createElement('img');
      img.alt = w.name + ' image';
      img.src = w.image ? '../assets/images/weapons/' + w.image : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-family="Arial" font-size="20">No image</text></svg>';
      imgWrap.appendChild(img);

      const main = document.createElement('div');
      main.className = 'weapon-main';

      const title = document.createElement('div');
      title.className = 'weapon-title';
      const h2 = document.createElement('h2');
      h2.textContent = w.name;
      title.appendChild(h2);

      // Price display
      const price = document.createElement('div');
      price.className = 'weapon-price';
      price.style.marginLeft = 'auto';
      price.style.fontWeight = '700';
      price.style.color = '#ff2b2b';
      // initial value set later
      title.appendChild(price);

      const desc = document.createElement('div');
      desc.className = 'weapon-desc';
      desc.textContent = w.description || '';

      // Stats
      const statsWrap = document.createElement('div');
      statsWrap.className = 'stats';
      if(w.stats){
        for(const [k,v] of Object.entries(w.stats)){
          const s = document.createElement('span');
          s.className = 'stat';
          s.textContent = `${k}: ${v}`;
          statsWrap.appendChild(s);
        }
      }

      // Mods
      const modsWrap = document.createElement('div');
      modsWrap.className = 'mods';
      if(Array.isArray(w.mods) && w.mods.length){
        const label = document.createElement('div');
        label.className = 'small-link';
        label.textContent = 'Mods:';
        modsWrap.appendChild(label);

        const currentSelection = Array.isArray(selections[w.id]) ? selections[w.id].slice() : [];

        for(const m of w.mods){
          const mi = document.createElement('span');
          mi.className = 'mod-item';
          mi.tabIndex = 0;
          mi.dataset.modId = m.id || m.name;

          // get full mod data when available
          const modData = modsById[m.id] || m;
          if(modData && modData.slot) mi.dataset.slot = modData.slot;

          // Text label
          const nameSpan = document.createElement('span');
          nameSpan.textContent = m.name || (modData && modData.name) || 'Unknown Mod';
          mi.appendChild(nameSpan);

          // small info link to open mods page (does not toggle selection)
          if(m.link){
            const info = document.createElement('a');
            info.href = m.link;
            info.target = '_blank';
            info.rel = 'noopener noreferrer';
            info.textContent = ' ⓘ';
            info.style.marginLeft = '6px';
            info.style.fontSize = '0.85em';
            info.addEventListener('click', (ev)=>{ ev.stopPropagation(); /* allow opening in new tab */ });
            mi.appendChild(info);
          }

          // hover/click for popover info (mouseenter for desktop, click for touch)
          mi.addEventListener('mouseenter', (ev)=> showPopoverForMod(modData, ev));
          mi.addEventListener('mouseleave', hidePopover);
          mi.addEventListener('click', (ev)=>{
            ev.preventDefault();
            toggleModForWeapon(w.id, mi.dataset.modId, card);
          });
          mi.addEventListener('keydown', (ev)=>{ if(ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggleModForWeapon(w.id, mi.dataset.modId, card); } });

          // show short text if provided
          if(m.short){
            const short = document.createElement('span');
            short.className = 'mod-stats';
            short.textContent = m.short;
            mi.appendChild(short);
          }

          // mark if selected according to saved selections
          if(currentSelection.includes(mi.dataset.modId)){
            mi.classList.add('selected');
          }

          modsWrap.appendChild(mi);
        }
      }

      main.appendChild(title);
      main.appendChild(desc);
      main.appendChild(statsWrap);
      main.appendChild(modsWrap);

      card.appendChild(imgWrap);
      card.appendChild(main);

      listEl.appendChild(card);

      // After appending, update the displayed price based on persisted selection
      updateWeaponPriceDisplay(w, card);
    }

    pageInfo.textContent = `Page ${page} of ${pages} (${total} weapons)`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= pages;
    classLinks.forEach((link) => {
      link.toggleAttribute('aria-current', link.dataset.class === selectedClass);
    });
  }

  function toggleModForWeapon(weaponId, modId, cardEl){
    const selections = loadSelections();
    if(!selections[weaponId]) selections[weaponId] = [];
    const sel = selections[weaponId];

    const mod = modsById[modId] || null;
    const slot = mod && mod.slot ? mod.slot : null;

    // if already selected -> remove
    const idx = sel.indexOf(modId);
    if(idx !== -1){
      sel.splice(idx,1);
      // update DOM
      const el = cardEl.querySelector(`.mod-item[data-mod-id="${cssEscape(modId)}"]`);
      if(el) el.classList.remove('selected');
      saveSelections(selections);
      const weapon = weapons.find(w=>w.id===weaponId);
      if(weapon) updateWeaponPriceDisplay(weapon, cardEl);
      return;
    }

    // enforce one-per-slot: remove any selected mod in same slot
    if(slot){
      for(let i = sel.length-1; i>=0; i--){
        const otherId = sel[i];
        const other = modsById[otherId];
        if(other && other.slot === slot){
          sel.splice(i,1);
          // update DOM to deselect
          const otherEl = cardEl.querySelector(`.mod-item[data-mod-id="${cssEscape(otherId)}"]`);
          if(otherEl) otherEl.classList.remove('selected');
        }
      }
    }

    // add this mod
    sel.push(modId);
    const el = cardEl.querySelector(`.mod-item[data-mod-id="${cssEscape(modId)}"]`);
    if(el) el.classList.add('selected');

    saveSelections(selections);
    const weapon = weapons.find(w=>w.id===weaponId);
    if(weapon) updateWeaponPriceDisplay(weapon, cardEl);
  }

  function updateWeaponPriceDisplay(weapon, cardEl){
    const priceEl = cardEl.querySelector('.weapon-price');
    const selections = loadSelections();
    const sel = Array.isArray(selections[weapon.id]) ? selections[weapon.id] : [];
    let modsTotal = 0;
    for(const id of sel){
      const m = modsById[id];
      if(m && typeof m.dosh === 'number') modsTotal += m.dosh;
    }
    const total = (weapon.dosh || 0) + modsTotal;
    priceEl.textContent = formatDosh(total);
  }

  function formatDosh(n){
    try{ return 'Dosh: ' + Number(n).toLocaleString(); }catch(e){ return 'Dosh: ' + n; }
  }

  // Popover helpers
  function showPopoverForMod(mod, ev){
    if(!mod) return;
    const html = buildPopoverHtml(mod);
    popover.innerHTML = html;
    popover.classList.add('show');
    popover.setAttribute('aria-hidden','false');

    const x = ev.clientX || (window.innerWidth/2);
    const y = ev.clientY || (window.innerHeight/2);
    const pad = 12;
    // Give browser a moment to layout popover
    requestAnimationFrame(()=>{
      const rect = popover.getBoundingClientRect();
      let left = x + 12;
      let top = y + 12;
      if(left + rect.width + pad > window.innerWidth) left = x - rect.width - 12;
      if(top + rect.height + pad > window.innerHeight) top = y - rect.height - 12;
      popover.style.left = Math.max(pad, left) + 'px';
      popover.style.top = Math.max(pad, top) + 'px';
    });
  }

  function buildPopoverHtml(mod){
    const statsHtml = mod.stats ? Object.entries(mod.stats).map(([k,v])=> `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</div>`).join('') : '';
    const linkHtml = mod.id ? `<div style="margin-top:8px"><a href="./mods/#${encodeURIComponent(mod.id)}" target="_blank">Open mod page</a></div>` : '';
    const priceHtml = (typeof mod.dosh === 'number') ? `<div style="margin-top:6px"><strong>Cost:</strong> ${escapeHtml(String(mod.dosh))} dosh</div>` : '';
    return `<div><strong>${escapeHtml(mod.name)}</strong><div style="margin-top:6px;color:#cfcfcf">${escapeHtml(mod.description||'')}</div><div style="margin-top:8px">${statsHtml}</div>${priceHtml}${linkHtml}</div>`;
  }

  function hidePopover(){
    popover.classList.remove('show');
    popover.setAttribute('aria-hidden','true');
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>\"]+/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c] || c));
  }

  // Small utility to escape CSS selector when querySelector by attribute value
  function cssEscape(s){
    return String(s).replace(/(["'\\:\[\]#.])/g,'\\$1');
  }

  // Search by name only (case-insensitive)
  function applySearch(){
    const q = (searchEl.value || '').trim().toLowerCase();
    filtered = weapons.filter((weapon) =>
      (!selectedClass || weapon.class === selectedClass) &&
      (!q || (weapon.name || '').toLowerCase().includes(q))
    );
    page = 1;
    render();
  }

  // Events
  searchEl.addEventListener('input', ()=>{ applySearch(); });
  classLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      selectedClass = link.dataset.class;
      history.replaceState(null, '', link.hash);
      applySearch();
    });
  });
  prevBtn.addEventListener('click', ()=>{ if(page>1){ page--; render(); } });
  nextBtn.addEventListener('click', ()=>{ page++; render(); });

  // Hide popover on scroll/click elsewhere
  window.addEventListener('click', (ev)=>{
    if(!popover.contains(ev.target)) hidePopover();
  });
  window.addEventListener('scroll', hidePopover, {passive:true});
  window.addEventListener('resize', hidePopover);

  // Load
  load();
})();
