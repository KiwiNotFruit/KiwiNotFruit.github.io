/* mods.js
   Loads mods.json and renders a searchable, paginated list of mods.
   Each mod has an id (used for anchors), name, description, stats, slot and dosh, and optional passive abilities.
   This file now points to the canonical /explore/mods.json so both the weapons page and mods page share the same source.
*/
(() => {
  const listEl = document.getElementById('list');
  const searchEl = document.getElementById('search');
  const perPageEl = document.getElementById('perPage');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');

  let mods = [];
  let filtered = [];
  let page = 1;

  async function load(){
    try{
      // Fetch the canonical mods file from /explore/mods.json
      const res = await fetch('/explore/mods.json');
      mods = await res.json();
    }catch(e){
      console.error('Failed to load /explore/mods.json', e);
      mods = [];
    }
    filtered = mods.slice();
    render();
    // If there's a hash in the URL, scroll to it
    if(location.hash){
      const id = location.hash.substring(1);
      setTimeout(()=> scrollToId(id), 250);
    }
  }

  function render(){
    const perPage = parseInt(perPageEl.value,10) || 10;
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / perPage));
    if(page>pages) page = pages;
    const start = (page-1)*perPage;
    const end = start + perPage;
    const slice = filtered.slice(start, end);

    listEl.innerHTML = '';
    if(slice.length === 0){
      listEl.innerHTML = '<p>No mods found.</p>';
    }

    for(const m of slice){
      const card = document.createElement('article');
      card.className = 'weapon-card';
      card.id = m.id || '';

      const main = document.createElement('div');
      main.className = 'weapon-main';

      const title = document.createElement('div');
      title.className = 'weapon-title';
      const h2 = document.createElement('h2');
      h2.textContent = m.name;
      title.appendChild(h2);

      // Dosh display
      const price = document.createElement('div');
      price.className = 'weapon-price';
      price.style.marginLeft = 'auto';
      price.style.fontWeight = '700';
      price.style.color = '#0b5aa8';
      if(typeof m.dosh === 'number') price.textContent = 'Dosh: ' + Number(m.dosh).toLocaleString();
      title.appendChild(price);

      const desc = document.createElement('div');
      desc.className = 'weapon-desc';
      desc.textContent = m.description || '';

      // Stats
      const statsWrap = document.createElement('div');
      statsWrap.className = 'stats';
      if(m.stats){
        for(const [k,v] of Object.entries(m.stats)){
          const s = document.createElement('span');
          s.className = 'stat';
          s.textContent = `${k}: ${v}`;
          statsWrap.appendChild(s);
        }
      }

      // Passive abilities
      const passiveWrap = document.createElement('div');
      if(Array.isArray(m.passives) && m.passives.length){
        const label = document.createElement('div');
        label.className = 'small-link';
        label.textContent = 'Passive abilities:';
        passiveWrap.appendChild(label);
        for(const p of m.passives){
          const pDiv = document.createElement('div');
          pDiv.style.marginTop = '6px';
          pDiv.innerHTML = `<strong>${escapeHtml(p.name)}</strong><div style=\"color:#555;\">${escapeHtml(p.description)}</div>`;
          passiveWrap.appendChild(pDiv);
        }
      }

      main.appendChild(title);
      main.appendChild(desc);
      main.appendChild(statsWrap);
      main.appendChild(passiveWrap);

      card.appendChild(main);

      listEl.appendChild(card);
    }

    pageInfo.textContent = `Page ${page} of ${pages} (${total} mods)`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= pages;
  }

  function scrollToId(id){
    if(!id) return;
    const el = document.getElementById(id);
    if(el){
      el.scrollIntoView({behavior:'smooth', block:'start'});
      // briefly highlight
      el.style.boxShadow = '0 0 0 3px rgba(21,101,192,0.12)';
      setTimeout(()=> el.style.boxShadow = '', 1600);
    }
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>\\"]/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c] || c));
  }

  function applySearch(){
    const q = (searchEl.value || '').trim().toLowerCase();
    if(!q){
      filtered = mods.slice();
    }else{
      filtered = mods.filter(m => ((m.name||'') + ' ' + (m.description||'') + ' ' + (m.passives ? m.passives.map(p=>p.name + ' ' + p.description).join(' ') : '')).toLowerCase().includes(q));
    }
    page = 1;
    render();
  }

  // Events
  searchEl.addEventListener('input', ()=>{ applySearch(); });
  perPageEl.addEventListener('change', ()=>{ page = 1; render(); });
  prevBtn.addEventListener('click', ()=>{ if(page>1){ page--; render(); } });
  nextBtn.addEventListener('click', ()=>{ page++; render(); });

  // Load
  load();
})();
