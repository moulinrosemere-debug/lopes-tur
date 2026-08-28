(function(){
  const STORAGE_KEY = 'lopesTurData';
  const state = load();
  let editing = { type: null, id: null };
  let currentView = 'dashboard';
  let currentPeriod = 'month';

  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');

  function load(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e){}
    return { income: [], expenses: [], settings: { driverName: '', vehicleName: '' } };
  }
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
  function fmtMoney(v){ return (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function fmtDate(d){ return d.split('-').reverse().join('/'); }
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function todayStr(){ return new Date().toISOString().slice(0,10); }
  function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(()=>toastEl.classList.remove('show'), 2200);
  }

  const CATEGORIES = ['Combustível','Manutenção','IPVA','Seguro','Estacionamento','Pedágio','Lavagem','Multas','Outros'];
  const PLATFORMS = ['Uber','99','Particular','Outro'];

  function within(dateStr, period){
    if (period === 'all') return true;
    const d = new Date(dateStr+'T00:00:00');
    const now = new Date();
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'week'){
      const start = new Date(now); start.setDate(now.getDate()-7);
      return d >= start && d <= now;
    }
    if (period === 'month') return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth();
    return true;
  }

  function render(){
    document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active', b.dataset.view===currentView));
    if (currentView === 'dashboard') renderDashboard();
    else if (currentView === 'income') renderIncome();
    else if (currentView === 'expense') renderExpense();
    else if (currentView === 'reports') renderReports();
    else if (currentView === 'settings') renderSettings();
  }

  function periodSelectorHtml(){
    const labels = { today:'Hoje', week:'7 dias', month:'Mês', all:'Tudo' };
    return `<div class="period-selector">${Object.keys(labels).map(p=>`<button class="chip ${p===currentPeriod?'active':''}" data-period="${p}">${labels[p]}</button>`).join('')}</div>`;
  }

  function renderDashboard(){
    const inc = state.income.filter(e=>within(e.date,currentPeriod));
    const exp = state.expenses.filter(e=>within(e.date,currentPeriod));
    const totalInc = inc.reduce((s,e)=>s+e.amount,0);
    const totalExp = exp.reduce((s,e)=>s+e.amount,0);
    const net = totalInc-totalExp;
    const merged = [...inc.map(e=>({...e,kind:'income'})), ...exp.map(e=>({...e,kind:'expense'}))]
      .sort((a,b)=>b.date.localeCompare(a.date)).slice(0,15);

    app.innerHTML = `
      ${periodSelectorHtml()}
      <div class="cards">
        <div class="card card-income"><h3>Ganhos</h3><div class="value">${fmtMoney(totalInc)}</div></div>
        <div class="card card-expense"><h3>Gastos</h3><div class="value">${fmtMoney(totalExp)}</div></div>
        <div class="card card-net ${net<0?'negative':''}"><h3>Lucro líquido</h3><div class="value">${fmtMoney(net)}</div></div>
      </div>
      <h2 class="section-title">Últimos lançamentos</h2>
      <div class="list">
        ${merged.length ? merged.map(itemRow).join('') : '<p class="empty">Nenhum lançamento neste período.</p>'}
      </div>
    `;
    bindPeriodChips();
    bindRowActions();
  }

  function itemRow(e){
    const isIncome = e.kind === 'income';
    const label = isIncome ? (e.platform||'Ganho') : e.category;
    return `<div class="row-item">
      <div class="row-main">
        <span class="row-dot ${isIncome?'dot-income':'dot-expense'}"></span>
        <div>
          <div class="row-title">${escapeHtml(label)}</div>
          <div class="row-sub">${fmtDate(e.date)}${e.notes?' · '+escapeHtml(e.notes):''}</div>
        </div>
      </div>
      <div class="row-end">
        <span class="row-value ${isIncome?'positive':'negative'}">${isIncome?'+':'-'} ${fmtMoney(e.amount)}</span>
        <button class="icon-btn" data-action="edit" data-kind="${e.kind}" data-id="${e.id}" title="Editar">✎</button>
        <button class="icon-btn danger" data-action="delete" data-kind="${e.kind}" data-id="${e.id}" title="Excluir">🗑</button>
      </div>
    </div>`;
  }

  function bindPeriodChips(){
    document.querySelectorAll('.chip').forEach(chip=>{
      chip.addEventListener('click', ()=>{ currentPeriod = chip.dataset.period; render(); });
    });
  }

  function bindRowActions(){
    document.querySelectorAll('[data-action="edit"]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const {kind, id} = btn.dataset;
        currentView = kind;
        editing = { type: kind, id };
        render();
      });
    });
    document.querySelectorAll('[data-action="delete"]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const {kind, id} = btn.dataset;
        if (!confirm('Excluir este lançamento?')) return;
        if (kind === 'income') state.income = state.income.filter(e=>e.id!==id);
        else state.expenses = state.expenses.filter(e=>e.id!==id);
        save();
        toast('Excluído.');
        render();
      });
    });
  }

  function renderIncome(){
    const list = [...state.income].sort((a,b)=>b.date.localeCompare(a.date));
    const editItem = editing.type==='income' ? state.income.find(e=>e.id===editing.id) : null;
    app.innerHTML = `
      <h2 class="section-title">${editItem?'Editar ganho':'Novo ganho'}</h2>
      <form id="incomeForm" class="form-card">
        <label>Data
          <input type="date" name="date" required value="${editItem?editItem.date:todayStr()}" />
        </label>
        <label>Plataforma
          <select name="platform">${PLATFORMS.map(p=>`<option ${editItem&&editItem.platform===p?'selected':''}>${p}</option>`).join('')}</select>
        </label>
        <label>Valor (R$)
          <input type="number" step="0.01" min="0" name="amount" required value="${editItem?editItem.amount:''}" placeholder="0,00" />
        </label>
        <div class="field-row">
          <label>Corridas
            <input type="number" min="0" step="1" name="trips" value="${editItem&&editItem.trips!=null?editItem.trips:''}" placeholder="opcional" />
          </label>
          <label>KM rodado
            <input type="number" min="0" step="0.1" name="km" value="${editItem&&editItem.km!=null?editItem.km:''}" placeholder="opcional" />
          </label>
        </div>
        <label>Observações
          <textarea name="notes" placeholder="opcional">${editItem?escapeHtml(editItem.notes||''):''}</textarea>
        </label>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${editItem?'Salvar alterações':'Adicionar ganho'}</button>
          ${editItem?'<button type="button" id="cancelEdit" class="btn btn-secondary">Cancelar</button>':''}
        </div>
      </form>
      <h2 class="section-title">Histórico de ganhos</h2>
      <div class="list">
        ${list.length ? list.map(e=>itemRow({...e, kind:'income'})).join('') : '<p class="empty">Nenhum ganho registrado.</p>'}
      </div>
    `;
    document.getElementById('incomeForm').addEventListener('submit', onIncomeSubmit);
    const cancelBtn = document.getElementById('cancelEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', ()=>{ editing={type:null,id:null}; render(); });
    bindRowActions();
  }

  function onIncomeSubmit(ev){
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const amount = parseFloat(fd.get('amount'));
    if (isNaN(amount) || amount < 0) { toast('Informe um valor válido.'); return; }
    const entry = {
      id: editing.type==='income' && editing.id ? editing.id : uid(),
      date: fd.get('date'),
      platform: fd.get('platform'),
      amount,
      trips: fd.get('trips') ? parseInt(fd.get('trips'),10) : null,
      km: fd.get('km') ? parseFloat(fd.get('km')) : null,
      notes: (fd.get('notes')||'').trim()
    };
    if (editing.type==='income' && editing.id){
      const idx = state.income.findIndex(e=>e.id===editing.id);
      state.income[idx] = entry;
      toast('Ganho atualizado.');
    } else {
      state.income.push(entry);
      toast('Ganho adicionado.');
    }
    editing = {type:null,id:null};
    save();
    render();
  }

  function renderExpense(){
    const list = [...state.expenses].sort((a,b)=>b.date.localeCompare(a.date));
    const editItem = editing.type==='expense' ? state.expenses.find(e=>e.id===editing.id) : null;
    const cat = editItem ? editItem.category : CATEGORIES[0];
    app.innerHTML = `
      <h2 class="section-title">${editItem?'Editar gasto':'Novo gasto'}</h2>
      <form id="expenseForm" class="form-card">
        <label>Data
          <input type="date" name="date" required value="${editItem?editItem.date:todayStr()}" />
        </label>
        <label>Categoria
          <select name="category" id="expenseCategory">${CATEGORIES.map(c=>`<option ${cat===c?'selected':''}>${c}</option>`).join('')}</select>
        </label>
        <label>Valor (R$)
          <input type="number" step="0.01" min="0" name="amount" required value="${editItem?editItem.amount:''}" placeholder="0,00" />
        </label>
        <div class="field-row" id="fuelFields" style="display:${cat==='Combustível'?'grid':'none'}">
          <label>Litros
            <input type="number" min="0" step="0.01" name="liters" value="${editItem&&editItem.liters!=null?editItem.liters:''}" placeholder="opcional" />
          </label>
          <label>Odômetro (km)
            <input type="number" min="0" step="1" name="odometer" value="${editItem&&editItem.odometer!=null?editItem.odometer:''}" placeholder="opcional" />
          </label>
        </div>
        <label>Observações
          <textarea name="notes" placeholder="opcional">${editItem?escapeHtml(editItem.notes||''):''}</textarea>
        </label>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${editItem?'Salvar alterações':'Adicionar gasto'}</button>
          ${editItem?'<button type="button" id="cancelEdit" class="btn btn-secondary">Cancelar</button>':''}
        </div>
      </form>
      <h2 class="section-title">Histórico de gastos</h2>
      <div class="list">
        ${list.length ? list.map(e=>itemRow({...e, kind:'expense'})).join('') : '<p class="empty">Nenhum gasto registrado.</p>'}
      </div>
    `;
    document.getElementById('expenseForm').addEventListener('submit', onExpenseSubmit);
    document.getElementById('expenseCategory').addEventListener('change', (e)=>{
      document.getElementById('fuelFields').style.display = e.target.value==='Combustível' ? 'grid' : 'none';
    });
    const cancelBtn = document.getElementById('cancelEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', ()=>{ editing={type:null,id:null}; render(); });
    bindRowActions();
  }

  function onExpenseSubmit(ev){
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const amount = parseFloat(fd.get('amount'));
    if (isNaN(amount) || amount < 0) { toast('Informe um valor válido.'); return; }
    const category = fd.get('category');
    const entry = {
      id: editing.type==='expense' && editing.id ? editing.id : uid(),
      date: fd.get('date'),
      category,
      amount,
      liters: category==='Combustível' && fd.get('liters') ? parseFloat(fd.get('liters')) : null,
      odometer: fd.get('odometer') ? parseFloat(fd.get('odometer')) : null,
      notes: (fd.get('notes')||'').trim()
    };
    if (editing.type==='expense' && editing.id){
      const idx = state.expenses.findIndex(e=>e.id===editing.id);
      state.expenses[idx] = entry;
      toast('Gasto atualizado.');
    } else {
      state.expenses.push(entry);
      toast('Gasto adicionado.');
    }
    editing = {type:null,id:null};
    save();
    render();
  }

  function renderReports(){
    const byMonthIncome = {}, byMonthExpense = {}, byCategory = {}, byPlatform = {};
    state.income.forEach(e=>{
      const m = e.date.slice(0,7);
      byMonthIncome[m] = (byMonthIncome[m]||0)+e.amount;
      byPlatform[e.platform] = (byPlatform[e.platform]||0)+e.amount;
    });
    state.expenses.forEach(e=>{
      const m = e.date.slice(0,7);
      byMonthExpense[m] = (byMonthExpense[m]||0)+e.amount;
      byCategory[e.category] = (byCategory[e.category]||0)+e.amount;
    });
    const months = [...new Set([...Object.keys(byMonthIncome), ...Object.keys(byMonthExpense)])].sort();

    app.innerHTML = `
      <h2 class="section-title">Ganhos x Gastos por mês</h2>
      <canvas id="chartMonth" height="220"></canvas>
      <h2 class="section-title">Gastos por categoria</h2>
      <canvas id="chartCategory" height="220"></canvas>
      <h2 class="section-title">Ganhos por plataforma</h2>
      <canvas id="chartPlatform" height="220"></canvas>
    `;

    if (window.Chart){
      new Chart(document.getElementById('chartMonth'), {
        type: 'bar',
        data: { labels: months, datasets: [
          { label:'Ganhos', data: months.map(m=>byMonthIncome[m]||0), backgroundColor:'#1fae76' },
          { label:'Gastos', data: months.map(m=>byMonthExpense[m]||0), backgroundColor:'#d64545' }
        ]},
        options: { plugins:{legend:{labels:{color:'#1c2b26'}}}, scales:{ x:{ticks:{color:'#5b6b64'}}, y:{ticks:{color:'#5b6b64'}} } }
      });
      new Chart(document.getElementById('chartCategory'), {
        type:'pie',
        data:{ labels:Object.keys(byCategory), datasets:[{data:Object.values(byCategory), backgroundColor:['#116149','#1fae76','#d64545','#f4a340','#4a90d9','#a879e6','#e668b3','#7bc47f','#9aa5b1']}] },
        options:{ plugins:{legend:{labels:{color:'#1c2b26'}}} }
      });
      new Chart(document.getElementById('chartPlatform'), {
        type:'pie',
        data:{ labels:Object.keys(byPlatform), datasets:[{data:Object.values(byPlatform), backgroundColor:['#116149','#1fae76','#f4a340','#4a90d9']}] },
        options:{ plugins:{legend:{labels:{color:'#1c2b26'}}} }
      });
    }
  }

  function renderSettings(){
    app.innerHTML = `
      <h2 class="section-title">Dados do motorista</h2>
      <form id="settingsForm" class="form-card">
        <label>Nome do motorista
          <input type="text" name="driverName" value="${escapeHtml(state.settings.driverName||'')}" placeholder="opcional" />
        </label>
        <label>Veículo
          <input type="text" name="vehicleName" value="${escapeHtml(state.settings.vehicleName||'')}" placeholder="Ex: RAV4 Cross" />
        </label>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
      <h2 class="section-title">Dados</h2>
      <div class="form-card">
        <p>Todos os dados ficam salvos apenas neste navegador.</p>
        <div class="form-actions">
          <button type="button" id="exportBtn2" class="btn btn-secondary">Exportar CSV</button>
          <button type="button" id="clearAllBtn" class="btn btn-danger">Apagar todos os dados</button>
        </div>
      </div>
    `;
    document.getElementById('settingsForm').addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const fd = new FormData(ev.target);
      state.settings.driverName = (fd.get('driverName')||'').trim();
      state.settings.vehicleName = (fd.get('vehicleName')||'').trim();
      save();
      toast('Configurações salvas.');
    });
    document.getElementById('exportBtn2').addEventListener('click', exportCSV);
    document.getElementById('clearAllBtn').addEventListener('click', ()=>{
      if (!confirm('Isso vai apagar todos os ganhos e gastos registrados. Continuar?')) return;
      state.income = [];
      state.expenses = [];
      save();
      toast('Dados apagados.');
      render();
    });
  }

  function exportCSV(){
    const items = [
      ...state.income.map(e=>({type:'Ganho', date:e.date, label:e.platform, amount:e.amount, liters:'', extra:e.km??'', trips:e.trips??'', notes:e.notes||''})),
      ...state.expenses.map(e=>({type:'Gasto', date:e.date, label:e.category, amount:e.amount, liters:e.liters??'', extra:e.odometer??'', trips:'', notes:e.notes||''}))
    ].sort((a,b)=>a.date.localeCompare(b.date));
    const rows = [['Tipo','Data','Categoria/Plataforma','Valor','Litros','Odometro/KM','Corridas','Observacoes']];
    items.forEach(it=>rows.push([it.type, it.date, it.label, it.amount.toFixed(2), it.liters, it.extra, it.trips, it.notes]));
    const csv = rows.map(r=>r.map(f=>`"${String(f).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'lopes-tur-dados.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  document.querySelectorAll('.bottom-nav button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      currentView = btn.dataset.view;
      editing = {type:null,id:null};
      render();
    });
  });
  document.getElementById('exportButton').addEventListener('click', exportCSV);

  render();
})();
