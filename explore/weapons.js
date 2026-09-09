/* weapons.js
   Framework-free script to load weapons.json and mods.json, render cards, support class and name search, pagination, popovers,
   and client-side mod selection that updates weapon Dosh totals instantly.

   Behavior:
   - Each weapon must have a numeric `dosh` property (base cost).
   - Mods are loaded from mods.json and must include `id`, `slot`, and `dosh`.
   - Clicking a mod toggles selection for that weapon. Only one mod per slot is allowed; selecting a mod will deselect any other selected mod in the same slot.
   - The weapon's displayed Dosh updates immediately: weapon.dosh + sum(selected mods' dosh).
   - Selections are persisted in localStorage so they survive page reloads.
   - Mod info is still available via hover popovers. A small info link opens the mod page in a new tab.
   - Linked mods are hidden by default behind a per-card "View/Select Mods" toggle which opens a
     category-driven panel (click a category chip to list its mods as "Category: Name").
     Mod categories come from each mod's `category` field in mods.json, so assigning a category
     to a weapon is data-driven: give the mod a category and link it in weapons.json. Category
     chips follow MOD_CATEGORY_ORDER below; an optional per-weapon `modCategories` array in
     weapons.json can override that ordering if ever needed. Selected mods stay visible in a
     compact row under the toggle button, even while the panel is collapsed.
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
  let selectedClass = 'Commando';
  const weaponClasses = new Set(Array.from(classLinks, (link) => link.dataset.class));

  const STORAGE_KEY = 'weaponModSelections_v1';

  // Supported mod categories (see mods.json "category" field). This list also fixes the
  // display order of the category chips: e.g. the X295 Wraith (Commando) lists its linked
  // mods as Ammunition, Barrel, Underbarrel, Sight, Magazine, Internal top-to-bottom.
  const MOD_CATEGORY_ORDER = [
    'Ammunition','Arrow','Barrel','Blade','Coating','Grip','Guard','Internal',
    'Magazine','Pommel','Quiver','Riser','Sight','Underbarrel'
  ];

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
    selectClassFromHash();
    applySearch();
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
      const noImageSrc = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-family="Arial" font-size="20">No image</text></svg>';
      img.src = w.image ? '../assets/images/weapons/' + w.image : noImageSrc;
      img.onerror = function(){ img.onerror = null; img.src = noImageSrc; };
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

      // Primary / Secondary ammo & damage (each fire mode shows its own damage type(s),
      // since primary and secondary can deal different damage types)
      const fireModesWrap = document.createElement('div');
      fireModesWrap.className = 'fire-modes';
      if(w.primary) fireModesWrap.appendChild(buildFireModeEl('Primary Fire Mode', w.primary, true));
      if(w.secondary) fireModesWrap.appendChild(buildFireModeEl('Secondary Fire Mode', w.secondary, false));

      // Mods (hidden by default behind a per-card "View/Select Mods" toggle)
      const modsWrap = document.createElement('div');
      modsWrap.className = 'mods';
      if(Array.isArray(w.mods) && w.mods.length){
        buildWeaponModUI(w, card, modsWrap);
      }

      // Mod bonuses text area (updated when mods are selected/deselected)
      const bonusWrap = document.createElement('div');
      bonusWrap.className = 'mod-bonuses';
      bonusWrap.setAttribute('aria-live','polite');

      main.appendChild(title);
      main.appendChild(desc);
      main.appendChild(fireModesWrap);
      main.appendChild(bonusWrap);
      main.appendChild(modsWrap);

      card.appendChild(imgWrap);
      card.appendChild(main);

      listEl.appendChild(card);

      // After appending, update the displayed price, primary damage type(s), mod
      // bonuses and the selected-mods summary based on persisted selection
      updateWeaponPriceDisplay(w, card);
      updatePrimaryDamageTypesDisplay(w, card);
      updateWeaponModBonuses(w, card);
      renderSelectedModsInline(w, card);
    }

    pageInfo.textContent = `Page ${page} of ${pages} (${total} weapons)`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= pages;
    classLinks.forEach((link) => {
      link.toggleAttribute('aria-current', link.dataset.class === selectedClass);
    });
  }

  // Resolves a mod's category to its canonical (title-cased) name. Unknown or missing
  // categories fall back to "Uncategorized" so the UI still works with incomplete data.
  function canonicalCategoryName(raw){
    const value = String(raw || '').trim();
    if(!value) return 'Uncategorized';
    const known = MOD_CATEGORY_ORDER.find(c => c.toLowerCase() === value.toLowerCase());
    return known || value;
  }

  function getWeaponModId(modRef){
    if(typeof modRef === 'string') return modRef;
    if(modRef && typeof modRef === 'object') return modRef.id || modRef.name || '';
    return '';
  }

  function getWeaponModData(modRef){
    const id = getWeaponModId(modRef);
    if(id && modsById[id]) return modsById[id];
    return (modRef && typeof modRef === 'object') ? modRef : null;
  }

  // Categories available for a weapon, derived from its linked mods (mods.json "category"
  // field) and ordered by MOD_CATEGORY_ORDER (unknown categories sort last, alphabetically).
  // To override the order for a specific weapon, add a "modCategories" array to that
  // weapon's entry in weapons.json.
  function getWeaponModCategories(weapon){
    const present = new Set();
    for(const wm of (weapon.mods || [])){
      const modData = getWeaponModData(wm);
      if(!modData) continue;
      present.add(canonicalCategoryName(modData.category));
    }
    const order = Array.isArray(weapon.modCategories) && weapon.modCategories.length
      ? weapon.modCategories
      : MOD_CATEGORY_ORDER;
    const ordered = order.map(canonicalCategoryName).filter(c => present.has(c));
    const seen = new Set(ordered);
    const extras = Array.from(present).filter(c => !seen.has(c)).sort();
    return ordered.concat(extras);
  }

  // Builds the collapsible mods UI for one weapon card: a toggle button, an always-visible
  // "Selected Mods" summary, and a hidden panel of category chips + per-category mod list.
  function buildWeaponModUI(weapon, card, modsWrap){
    const categories = getWeaponModCategories(weapon);

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'view-mods-btn';
    toggleBtn.textContent = 'View/Select Mods';
    toggleBtn.setAttribute('aria-expanded', 'false');
    modsWrap.appendChild(toggleBtn);

    const selectedWrap = document.createElement('div');
    selectedWrap.className = 'selected-mods-inline';
    modsWrap.appendChild(selectedWrap);

    const panel = document.createElement('div');
    panel.className = 'mods-panel';
    panel.hidden = true;

    const catWrap = document.createElement('div');
    catWrap.className = 'mod-categories';
    catWrap.setAttribute('role', 'group');
    catWrap.setAttribute('aria-label', 'Mod categories');
    panel.appendChild(catWrap);

    const listWrap = document.createElement('div');
    listWrap.className = 'mod-category-list';
    panel.appendChild(listWrap);
    modsWrap.appendChild(panel);

    let activeCategory = null;

    for(const category of categories){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mod-category-btn';
      btn.dataset.category = category;
      btn.textContent = category;
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', ()=>{
        activeCategory = category;
        for(const other of catWrap.querySelectorAll('.mod-category-btn')){
          const isActive = other === btn;
          other.classList.toggle('active', isActive);
          other.setAttribute('aria-pressed', String(isActive));
        }
        renderCategoryMods(weapon, card, listWrap, activeCategory);
      });
      catWrap.appendChild(btn);
    }

    toggleBtn.addEventListener('click', ()=>{
      const opening = panel.hidden;
      panel.hidden = !opening;
      toggleBtn.setAttribute('aria-expanded', String(opening));
      toggleBtn.textContent = opening ? 'Hide Mods' : 'View/Select Mods';
    });
  }

  // Renders the mods belonging to the active category as clickable "Category: Name" items.
  function renderCategoryMods(weapon, card, listWrap, activeCategory){
    listWrap.innerHTML = '';
    if(!activeCategory) return;
    const currentSelection = (() => {
      const sel = loadSelections()[weapon.id];
      return Array.isArray(sel) ? sel : [];
    })();

    for(const m of (weapon.mods || [])){
      const modId = getWeaponModId(m);
      const modData = getWeaponModData(m);
      if(!modId || !modData) continue;
      if(canonicalCategoryName(modData.category) !== activeCategory) continue;
      listWrap.appendChild(buildModItemEl(weapon, card, modId, m, modData, currentSelection));
    }
  }

  function buildModItemEl(weapon, card, modId, m, modData, currentSelection){
    const mi = document.createElement('span');
    mi.className = 'mod-item';
    mi.tabIndex = 0;
    mi.dataset.modId = modId;
    if(modData && modData.slot) mi.dataset.slot = modData.slot;

    // Text label
    const nameSpan = document.createElement('span');
    nameSpan.textContent = `${canonicalCategoryName(modData.category)}: ${m.name || (modData && modData.name) || 'Unknown Mod'}`;
    mi.appendChild(nameSpan);

    // small info link to open mods page (does not toggle selection)
    if(m && typeof m === 'object' && m.link){
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
      toggleModForWeapon(weapon.id, mi.dataset.modId, card);
    });
    mi.addEventListener('keydown', (ev)=>{ if(ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggleModForWeapon(weapon.id, mi.dataset.modId, card); } });

    // show short text if provided
    if(m && typeof m === 'object' && m.short){
      const short = document.createElement('span');
      short.className = 'mod-stats';
      short.textContent = m.short;
      mi.appendChild(short);
    }

    // mark if selected according to saved selections
    if(currentSelection.includes(mi.dataset.modId)){
      mi.classList.add('selected');
    }
    return mi;
  }

  // Compact summary of the weapon's currently selected mods ("Category: Name" pills),
  // kept visible next to the toggle button even while the mods panel is collapsed.
  function renderSelectedModsInline(weapon, cardEl){
    const wrap = cardEl.querySelector('.selected-mods-inline');
    if(!wrap) return;
    wrap.innerHTML = '';
    const sel = loadSelections()[weapon.id];
    if(!Array.isArray(sel) || sel.length === 0) return;

    const label = document.createElement('span');
    label.className = 'small-link';
    label.textContent = 'Mods:';
    wrap.appendChild(label);

    for(const id of sel){
      const m = modsById[id];
      if(!m) continue;
      const tag = document.createElement('span');
      tag.className = 'selected-mod-pill';
      tag.textContent = `${canonicalCategoryName(m.category)}: ${m.name}`;
      wrap.appendChild(tag);
    }
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
      if(weapon){
        updateWeaponPriceDisplay(weapon, cardEl);
        updatePrimaryDamageTypesDisplay(weapon, cardEl);
        updateWeaponModBonuses(weapon, cardEl);
        renderSelectedModsInline(weapon, cardEl);
      }
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
    if(weapon){
      updateWeaponPriceDisplay(weapon, cardEl);
      updatePrimaryDamageTypesDisplay(weapon, cardEl);
      updateWeaponModBonuses(weapon, cardEl);
      renderSelectedModsInline(weapon, cardEl);
    }
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

  const FIRE_MODE_STAT_GROUPS = [
    {
      className: 'fire-mode-key-stats',
      fields: [['Damage', 'damage'], ['Magazine', 'magazine'], ['Capacity', 'capacity']]
    },
    {
      className: 'fire-mode-detail-stats',
      fields: [
         ['Reload Speed', 'reloadSpeed'],
         ['Fire Rate', 'fireRate'],
         ['Recoil Avg', 'recoilAvg'],
         ['Accuracy', 'Accuracy'],
         ['Penetration', 'penetration'],
         ['Stumble Power', 'StumblePower'],
         ['Stun Power', 'StunPower'],
         ['Toxic Power', 'ToxicPower'],
         ['Bleed Power', 'BleedPower'],
         ['Burn Power', 'BurnPower'],
         ['Burn Power (Ground Effect)', 'BurnPower_GroundEffect'],
         ['Corrosive Power', 'CorrosivePower'],
         ['Confuse Power', 'ConfusePower'],
         ['Enfeeble Power', 'EnfeeblePower'],
         ['Freeze Power', 'FreezePower'],
         ['Healing', 'Healing'],
         ['Knock Back', 'KnockBack'],
         ['Knockdown Power', 'KnockdownPower'],
         ['Panic Power', 'PanicPower'],
         ['Penetration Power', 'PenetrationPower'],
         ['Shock Power', 'ShockPower'],
         ['Slow Power', 'SlowPower'],
      ]
    }
  ];

  function buildFireModeEl(label, mode, isPrimary){
    const wrap = document.createElement('div');
    wrap.className = 'fire-mode';
    wrap.dataset.role = isPrimary ? 'primary' : 'secondary';
    const head = document.createElement('div');
    head.className = 'fire-mode-label';
    head.textContent = label;
    wrap.appendChild(head);

    // Damage type(s) for this fire mode, shown right under the Primary/Secondary
    // label since primary and secondary can deal different damage types. Only the
    // primary damage type(s) can change when certain mods (e.g. an ammunition mod)
    // are selected, so this wrap is targeted directly by updatePrimaryDamageTypesDisplay.
    const damageTypesWrap = document.createElement('div');
    damageTypesWrap.className = 'fire-mode-damage-types';
    renderDamageTypeBadges(damageTypesWrap, mode.damageTypes);
    wrap.appendChild(damageTypesWrap);

    const stats = document.createElement('div');
    stats.className = 'fire-mode-stats';
    for(const group of FIRE_MODE_STAT_GROUPS){
      const groupEl = document.createElement('div');
      groupEl.className = group.className;
      for(const [label, field] of group.fields){
        const stat = document.createElement('span');
        stat.className = 'fire-mode-stat';
        const value = mode[field];
        stat.textContent = `${label}: ${value === undefined || value === null || value === '' ? '—' : value}`;
        groupEl.appendChild(stat);
      }
      stats.appendChild(groupEl);
    }
    wrap.appendChild(stats);
    return wrap;
  }

  // Builds damage type badges (with icon hooks) into the given container.
  function renderDamageTypeBadges(container, damageTypes){
    container.innerHTML = '';
    if(!Array.isArray(damageTypes) || !damageTypes.length) return;
    const dtLabel = document.createElement('span');
    dtLabel.className = 'damage-types-label';
    dtLabel.textContent = 'Damage Types:';
    container.appendChild(dtLabel);
    for(const dt of damageTypes){
      const badge = document.createElement('span');
      badge.className = 'damage-type';
      badge.dataset.damageType = dt;
      // Icon hook: add an empty icon span so an icon can be attached later via CSS/JS per damage type
      const icon = document.createElement('span');
      icon.className = 'damage-type-icon';
      icon.setAttribute('aria-hidden','true');
      badge.appendChild(icon);
      const txt = document.createElement('span');
      txt.className = 'damage-type-name';
      txt.textContent = dt;
      badge.appendChild(txt);
      container.appendChild(badge);
    }
  }

  // Re-renders the primary fire mode's damage type badges based on the currently
  // selected mods. Only the primary damage type(s) can be changed by a mod (e.g. an
  // ammunition mod); the secondary damage type is always the weapon's own data and
  // is never affected by mod selection.
  function updatePrimaryDamageTypesDisplay(weapon, cardEl){
    if(!weapon.primary) return;
    const wrap = cardEl.querySelector('.fire-mode[data-role="primary"] .fire-mode-damage-types');
    if(!wrap) return;

    const selections = loadSelections();
    const sel = Array.isArray(selections[weapon.id]) ? selections[weapon.id] : [];

    // Last selected mod that overrides primary damage types wins.
    let damageTypes = weapon.primary.damageTypes;
    for(const id of sel){
      const m = modsById[id];
      if(m && Array.isArray(m.primaryDamageTypes) && m.primaryDamageTypes.length){
        damageTypes = m.primaryDamageTypes;
      }
    }
    renderDamageTypeBadges(wrap, damageTypes);
  }

  // Renders the combined bonus text of all selected mods at the bottom of a weapon card.
  function updateWeaponModBonuses(weapon, cardEl){
    const bonusEl = cardEl.querySelector('.mod-bonuses');
    if(!bonusEl) return;
    const selections = loadSelections();
    const sel = Array.isArray(selections[weapon.id]) ? selections[weapon.id] : [];
    bonusEl.innerHTML = '';
    const bonuses = [];
    for(const id of sel){
      const m = modsById[id];
      if(m && m.stats){
        for(const [k,v] of Object.entries(m.stats)){
          bonuses.push(`${k} ${v}`);
        }
      }
    }
    if(bonuses.length === 0){
      bonusEl.classList.remove('has-bonuses');
      return;
    }
    const label = document.createElement('span');
    label.className = 'mod-bonuses-label';
    label.textContent = 'Mod Bonuses: ';
    bonusEl.appendChild(label);
    const text = document.createElement('span');
    text.className = 'mod-bonuses-text';
    text.textContent = bonuses.join(', ');
    bonusEl.appendChild(text);
    bonusEl.classList.add('has-bonuses');
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

  // Filter by selected class and name (case-insensitive)
  function applySearch(){
    const q = (searchEl.value || '').trim().toLowerCase();
    filtered = weapons.filter((weapon) =>
      (!selectedClass || weapon.class === selectedClass) &&
      (!q || (weapon.name || '').toLowerCase().includes(q))
    );
    page = 1;
    render();
  }

  function selectClassFromHash(){
    const className = new URLSearchParams(location.hash.slice(1)).get('class');
    selectedClass = weaponClasses.has(className) ? className : 'Commando';
  }

  // Events
  searchEl.addEventListener('input', ()=>{ applySearch(); });
  classLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      history.replaceState(null, '', link.hash);
      selectClassFromHash();
      applySearch();
    });
  });
  window.addEventListener('hashchange', () => {
    selectClassFromHash();
    applySearch();
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
