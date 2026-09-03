/* weapons.js
   Simple, framework-free script to load weapons.json, render cards, support search (name-only), pagination, and popovers.
   Edit weapons.json to add your weapons. Images are referenced by filename and expected to live in ../assets/images/weapons/.
*/
(() => {
  const listEl = document.getElementById('list');
  const searchEl = document.getElementById('search');
  const perPageEl = document.getElementById('perPage');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');
  const popover = document.getElementById('popover');

  let weapons = [];
  let filtered = [];
  let page = 1;
  let perPage = parseInt(perPageEl.value,10) || 10;

  async function load(){
    try{
      const res = await fetch('weapons.json');
      weapons = await res.json();
    }catch(e){
      console.error('Failed to load weapons.json', e);
      weapons = [];
    }
    filtered = weapons.slice();
    render();
  }

  function render(){
    perPage = parseInt(perPageEl.value,10) || 10;
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

    for(const w of slice){
      const card = document.createElement('article');
      card.className = 'weapon-card';

      const imgWrap = document.createElement('div');
      imgWrap.className = 'weapon-image';
      const img = document.createElement('img');
      img.alt = w.name + ' image';
      // Images expected in ../assets/images/weapons/<filename>
      img.src = w.image ? '../assets/images/weapons/' + w.image : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-family="Arial" font-size="20">No image</text></svg>';
      imgWrap.appendChild(img);

      const main = document.createElement('div');
      main.className = 'weapon-main';

      const title = document.createElement('div');
      title.className = 'weapon-title';
      const h2 = document.createElement('h2');
      h2.textContent = w.name;
      title.appendChild(h2);

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

        for(const m of w.mods){
          const mi = document.createElement('span');
          mi.className = 'mod-item';

          // Use a link if provided, otherwise plain text
          if(m.link){
            const a = document.createElement('a');
            a.href = m.link;
            a.textContent = m.name;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            // Hover/click for popover
            a.addEventListener('mouseenter', (ev)=> showPopoverForMod(m, ev));
            a.addEventListener('mouseleave', hidePopover);
            a.addEventListener('click', (ev)=>{
              // allow navigation but also show popover on click for touch users
              showPopoverForMod(m, ev);
              // let normal link behavior proceed
            });
            mi.appendChild(a);
          }else{
            const span = document.createElement('span');
            span.textContent = m.name;
            span.addEventListener('mouseenter', (ev)=> showPopoverForMod(m, ev));
            span.addEventListener('mouseleave', hidePopover);
            span.addEventListener('click', (ev)=> showPopoverForMod(m, ev));
            mi.appendChild(span);
          }

          if(m.short){
            const short = document.createElement('span');
            short.className = 'mod-stats';
            short.textContent = m.short;
            mi.appendChild(short);
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
    }

    pageInfo.textContent = `Page ${page} of ${pages} (${total} weapons)`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= pages;
  }

  function showPopoverForMod(mod, ev){
    const html = buildPopoverHtml(mod);
    popover.innerHTML = html;
    popover.classList.add('show');
    popover.setAttribute('aria-hidden','false');

    // Position popover near the mouse if available; otherwise center
    const x = ev.clientX || (window.innerWidth/2);
    const y = ev.clientY || (window.innerHeight/2);
    // Keep inside viewport
    const pad = 12;
    const rect = popover.getBoundingClientRect();
    let left = x + 12;
    let top = y + 12;
    if(left + rect.width + pad > window.innerWidth) left = x - rect.width - 12;
    if(top + rect.height + pad > window.innerHeight) top = y - rect.height - 12;
    popover.style.left = Math.max(pad, left) + 'px';
    popover.style.top = Math.max(pad, top) + 'px';
  }

  function buildPopoverHtml(mod){
    const statsHtml = mod.stats ? Object.entries(mod.stats).map(([k,v])=> `<div><strong>${k}:</strong> ${v}</div>`).join('') : '';
    const linkHtml = mod.link ? `<div style="margin-top:8px"><a href=\"${mod.link}\" target=\"_blank\">Open link</a></div>` : '';
    return `<div><strong>${escapeHtml(mod.name)}</strong><div style="margin-top:6px;color:${'#555'}">${escapeHtml(mod.description||'')}</div><div style="margin-top:8px">${statsHtml}</div>${linkHtml}</div>`;
  }

  function hidePopover(){
    popover.classList.remove('show');
    popover.setAttribute('aria-hidden','true');
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>\"]/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c] || c));
  }

  // Search by name only (case-insensitive)
  function applySearch(){
    const q = (searchEl.value || '').trim().toLowerCase();
    if(!q){
      filtered = weapons.slice();
    }else{
      filtered = weapons.filter(w => (w.name||'').toLowerCase().includes(q));
    }
    page = 1;
    render();
  }

  // Events
  searchEl.addEventListener('input', ()=>{ applySearch(); });
  perPageEl.addEventListener('change', ()=>{ page = 1; render(); });
  prevBtn.addEventListener('click', ()=>{ if(page>1){ page--; render(); } });
  nextBtn.addEventListener('click', ()=>{ page++; render(); });

  // Hide popover on scroll/click elsewhere
  window.addEventListener('click', (ev)=>{
    // hide if click is outside popover
    if(!popover.contains(ev.target)) hidePopover();
  });
  window.addEventListener('scroll', hidePopover, {passive:true});
  window.addEventListener('resize', hidePopover);

  // Load
  load();
})();
