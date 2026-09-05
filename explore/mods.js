/* mods.js
   Loads mods.json and renders a searchable, paginated list of mods.
   Each mod has an id (used for anchors), name, description, stats, slot and dosh.
   This file points to /explore/mods.json.
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
      const res = await fetch('/explore/mods.json');
      mods = await res.json();
    }catch(e){
      console.error('Failed to load /explore/mods.json', e);
      mods = [];
    }
    filtered = mods.slice();
    render();
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

      const price = document.createElement('div');
      price.className = 'weapon-price';
      price.style.marginLeft = 'auto';
      price.style.fontWeight = '700';
      if(typeof m.dosh === 'number') price.textContent = 'Dosh: ' + Number(m.dosh).toLocaleString();
      title.appendChild(price);

      const desc = document.createElement('div');
      desc.className = 'weapon-desc';
      desc.textContent = m.description || '';

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

      main.appendChild(title);
      main.appendChild(desc);
      main.appendChild(statsWrap);
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
      el.style.boxShadow = '0 0 0 3px rgba(255,43,43,0.18)';
      setTimeout(()=> el.style.boxShadow = '', 1600);
    }
  }

  function applySearch(){
    const q = (searchEl.value || '').trim().toLowerCase();
    filtered = !q ? mods.slice() : mods.filter(m => ((m.name||'') + ' ' + (m.description||'') + ' ' + JSON.stringify(m.stats || '')).toLowerCase().includes(q));
    page = 1;
    render();
  }

  searchEl.addEventListener('input', applySearch);
  perPageEl.addEventListener('change', ()=>{ page = 1; render(); });
  prevBtn.addEventListener('click', ()=>{ if(page>1){ page--; render(); } });
  nextBtn.addEventListener('click', ()=>{ page++; render(); });

  load();
})();
