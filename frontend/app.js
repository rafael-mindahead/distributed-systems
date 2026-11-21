/* Distributed Lab — console de observabilidade
   Dados reais: GET PHP /dashboard e /produtos; GET Go /api/v1/stats.
   Requisições por segundo são calculadas apenas pela diferença entre
   contadores consecutivos observados nesta aba. */
(() => {
  'use strict';

  const host = window.location.hostname || 'localhost';
  const PHP_API = 'http://' + host + ':8000';
  const GO_API = 'http://' + host + ':8080/api/v1';
  const POLL_INTERVAL = 2000;
  const TIMEOUT = 6000;
  const MAX_SAMPLES = 24;

  const el = (id) => document.getElementById(id);
  const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const clock = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const state = {
    dashboard: null,
    products: [],
    go: null,
    previousGo: null,
    samples: [],
    refreshing: false,
    phpStatus: 'loading',
    goStatus: 'loading',
    toastTimer: null,
    pendingDelete: null
  };

  async function getJson(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
      if (!response.ok) {
        let detail = '';
        try {
          const payload = await response.json();
          detail = payload?.error || payload?.erro || payload?.message || '';
        } catch (_) { /* O servidor também pode enviar texto. */ }
        throw new Error(detail || 'HTTP ' + response.status);
      }
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Tempo limite excedido');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function write(id, value) { el(id).textContent = String(value); }

  function formatInteger(value) {
    return integer.format(Number(value) || 0);
  }

  function formatMoney(value) {
    return money.format(Number(value) || 0);
  }

  function make(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = String(content);
    return node;
  }

  function renderDashboard(data) {
    if (!data || !data.resumo || !Array.isArray(data.por_produto)) {
      throw new Error('Formato inesperado de /dashboard');
    }
    state.dashboard = data;
    write('totalSales', formatInteger(data.resumo.total_vendas));
    write('totalRevenue', formatMoney(data.resumo.receita_total));
    renderRanking(data.por_produto);
  }

  function renderRanking(products) {
    const container = el('rankingList');
    const top = products
      .map((p) => ({ name: String(p.nome ?? 'Produto'), amount: Math.max(0, Number(p.total_qtd) || 0) }))
      .filter((p) => p.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    if (!top.length) {
      container.replaceChildren(make('p', 'empty-small', 'Nenhuma unidade vendida até o momento.'));
      return;
    }

    const max = top[0].amount || 1;
    const fragment = document.createDocumentFragment();
    for (const item of top) {
      const row = make('div', 'ranking-row');
      const meta = make('div', 'ranking-meta');
      const name = make('span', 'ranking-name', item.name);
      name.title = item.name;
      const count = make('span', 'ranking-number', formatInteger(item.amount) + ' un.');
      const track = make('div', 'ranking-track');
      const fill = make('div', 'ranking-fill');
      fill.style.width = (item.amount / max * 100).toFixed(2) + '%';
      track.appendChild(fill);
      meta.append(name, count);
      row.append(meta, track);
      fragment.appendChild(row);
    }
    container.replaceChildren(fragment);
  }

  function processGoStats(data) {
    const success = Number(data?.sucesso);
    const errors = Number(data?.erros);
    if (!Number.isSafeInteger(success) || success < 0 || !Number.isSafeInteger(errors) || errors < 0) {
      throw new Error('Formato inesperado de /api/v1/stats');
    }

    state.go = { success, errors };
    write('goSuccess', formatInteger(success));
    write('goErrors', formatInteger(errors));

    const now = performance.now();
    const previous = state.previousGo;
    if (previous) {
      if (success < previous.success || errors < previous.errors) {
        // Reinício do processo Go: nunca transformar o reset em rajada falsa.
        state.samples = [];
        write('sampleRate', '— req/s');
      } else {
        const elapsed = Math.max((now - previous.at) / 1000, 0.001);
        const newSuccess = success - previous.success;
        const newErrors = errors - previous.errors;
        state.samples.push({ success: newSuccess, errors: newErrors, elapsed });
        if (state.samples.length > MAX_SAMPLES) state.samples.shift();
        const rate = (newSuccess + newErrors) / elapsed;
        el('sampleRate').replaceChildren(document.createTextNode(rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' req/s '));
        el('sampleRate').appendChild(make('small', '', 'na última leitura'));
      }
    }
    state.previousGo = { success, errors, at: now };
    renderActivity();
  }

  function renderActivity() {
    const container = el('activityBars');
    const samples = state.samples;
    const maximum = Math.max(1, ...samples.map((s) => s.success + s.errors));
    const hasActivity = samples.some((s) => s.success + s.errors > 0);
    const fragment = document.createDocumentFragment();

    for (const sample of samples) {
      const total = sample.success + sample.errors;
      const column = make('div', 'activity-column');
      const stack = make('div', 'activity-stack');
      const percent = total === 0 ? 0 : Math.max(2, total / maximum * 100);
      stack.style.height = percent.toFixed(2) + '%';
      if (!total) stack.style.minHeight = '0';

      const failure = make('div', 'activity-error');
      const success = make('div', 'activity-success');
      failure.style.height = (total ? sample.errors / total * 100 : 0) + '%';
      success.style.height = (total ? sample.success / total * 100 : 0) + '%';
      stack.append(failure, success);
      column.title = formatInteger(sample.success) + ' sucessos, ' + formatInteger(sample.errors) + ' falhas em ' + sample.elapsed.toFixed(1) + 's';
      column.appendChild(stack);
      fragment.appendChild(column);
    }
    container.replaceChildren(fragment);

    const empty = el('activityEmpty');
    empty.hidden = hasActivity;
    if (!hasActivity && samples.length) empty.textContent = 'Sem novas requisições nesta sessão.';
    container.setAttribute('aria-label', hasActivity
      ? 'Histórico com ' + samples.length + ' amostras, de ' + formatInteger(samples.reduce((sum, s) => sum + s.success, 0)) + ' sucessos e ' + formatInteger(samples.reduce((sum, s) => sum + s.errors, 0)) + ' falhas desde a abertura da aba.'
      : 'Nenhuma atividade de requisições observada nesta aba.');
  }

  function normalize(value) {
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function renderProducts() {
    const tbody = el('productTable');
    const term = normalize(el('searchProduct').value.trim());
    const filtered = state.products.filter((p) => normalize(p.nome).includes(term) || String(p.id).includes(term));

    const count = formatInteger(state.products.length) + (state.products.length === 1 ? ' produto' : ' produtos');
    write('productCount', term ? count + ' · ' + formatInteger(filtered.length) + ' encontrados' : count);

    if (!filtered.length) {
      const tr = make('tr');
      const td = make('td', 'table-placeholder', term ? 'Nenhum produto encontrado.' : 'O catálogo está vazio.');
      td.colSpan = 4;
      tr.appendChild(td);
      tbody.replaceChildren(tr);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const p of filtered) {
      const row = make('tr');
      const nameTd = make('td');
      const name = make('span', 'product-name', p.nome);
      name.title = p.nome;
      nameTd.append(name, make('span', 'product-id', '#' + p.id));
      const priceTd = make('td', '', formatMoney(p.preco));
      const stockTd = make('td', '', formatInteger(p.estoque));
      const actionTd = make('td');
      const del = make('button', 'delete-button');
      del.type = 'button';
      del.title = 'Excluir ' + p.nome;
      del.setAttribute('aria-label', 'Excluir produto ' + p.nome);
      del.dataset.id = String(p.id);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#i-trash');
      svg.appendChild(use);
      del.appendChild(svg);
      actionTd.appendChild(del);
      row.append(nameTd, priceTd, stockTd, actionTd);
      fragment.appendChild(row);
    }
    tbody.replaceChildren(fragment);
  }

  function setConnection(id, status, label) {
    const node = el(id);
    node.classList.toggle('is-online', status === 'online');
    node.classList.toggle('is-offline', status === 'offline');
    node.lastChild.textContent = ' ' + label;
  }

  function updateHealth() {
    const php = state.phpStatus;
    const go = state.goStatus;
    const card = el('healthCard');
    card.classList.remove('is-online', 'is-partial', 'is-offline');

    if (php === 'online' && go === 'online') {
      card.classList.add('is-online');
      write('healthValue', 'APIs operacionais');
      write('healthText', 'Go e PHP responderam à última consulta');
    } else if (php === 'offline' && go === 'offline') {
      card.classList.add('is-offline');
      write('healthValue', 'Serviços indisponíveis');
      write('healthText', 'Verifique os processos nas portas 8080 e 8000');
    } else {
      card.classList.add('is-partial');
      write('healthValue', 'Atenção às conexões');
      write('healthText', 'Uma ou mais consultas não foram concluídas');
    }
  }

  function updateConnectionLabels() {
    setConnection('goConnection', state.goStatus, state.goStatus === 'online' ? 'Respondendo' : 'Indisponível');
    setConnection('phpConnection', state.phpStatus, state.phpStatus === 'online' ? 'Respondendo' : 'Indisponível');
    updateHealth();
  }

  async function refresh() {
    if (state.refreshing) return;
    state.refreshing = true;
    el('refreshBtn').disabled = true;
    const results = await Promise.allSettled([
      getJson(PHP_API + '/dashboard'),
      getJson(PHP_API + '/produtos'),
      getJson(GO_API + '/stats')
    ]);

    let dashboardOk = false;
    let productsOk = false;
    let goOk = false;

    if (results[0].status === 'fulfilled') {
      try { renderDashboard(results[0].value); dashboardOk = true; }
      catch (error) { console.error('Dashboard:', error); }
    }
    if (results[1].status === 'fulfilled') {
      if (Array.isArray(results[1].value)) {
        state.products = results[1].value;
        renderProducts();
        productsOk = true;
      } else {
        console.error('Produtos: resposta inesperada');
      }
    }
    if (results[2].status === 'fulfilled') {
      try { processGoStats(results[2].value); goOk = true; }
      catch (error) { console.error('Go:', error); }
    }
    state.phpStatus = dashboardOk && productsOk ? 'online' : 'offline';
    state.goStatus = goOk ? 'online' : 'offline';
    updateConnectionLabels();

    if (!productsOk && !state.products.length) {
      const row = make('tr');
      const td = make('td', 'table-placeholder', 'Não foi possível consultar o catálogo PHP.');
      td.colSpan = 4;
      row.appendChild(td);
      el('productTable').replaceChildren(row);
      write('productCount', 'Catálogo indisponível');
    }
    if (!dashboardOk && !state.dashboard) {
      el('rankingList').replaceChildren(make('p', 'empty-small', 'Dados indisponíveis. Verifique a API PHP.'));
    }
    if (dashboardOk || productsOk || goOk) {
      write('lastSync', 'Última leitura ' + clock.format(new Date()));
    } else {
      write('lastSync', 'Sem conexão com as APIs');
    }
    state.refreshing = false;
    el('refreshBtn').disabled = false;
  }

  function notify(message, isError = false) {
    const toast = el('toast');
    if (state.toastTimer) clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.classList.toggle('is-error', isError);
    toast.classList.add('is-visible');
    state.toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 4000);
  }

  el('productForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const nome = el('productName').value.trim();
    const preco = Number(el('productPrice').value);
    const estoque = Number(el('productStock').value);
    if (!nome || !Number.isFinite(preco) || preco < 0 || !Number.isSafeInteger(estoque) || estoque < 0) {
      notify('Preencha nome, preço e estoque válidos.', true);
      return;
    }

    const submit = el('submitProduct');
    submit.disabled = true;
    try {
      await getJson(PHP_API + '/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, preco, estoque })
      });
      form.reset();
      notify('Produto adicionado ao catálogo.');
      await refresh();
    } catch (error) {
      notify('Não foi possível cadastrar: ' + error.message, true);
    } finally {
      submit.disabled = false;
    }
  });

  el('productTable').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-id]');
    if (!button) return;
    const product = state.products.find((p) => String(p.id) === button.dataset.id);
    if (!product) return;
    state.pendingDelete = product;
    write('deleteDescription', 'O produto “' + product.nome + '” será excluído do catálogo. Essa operação não pode ser desfeita.');
    el('deleteDialog').showModal();
  });

  el('cancelDelete').addEventListener('click', () => el('deleteDialog').close());
  el('deleteDialog').addEventListener('close', () => { state.pendingDelete = null; });
  el('confirmDelete').addEventListener('click', async () => {
    const product = state.pendingDelete;
    if (!product) return;
    const button = el('confirmDelete');
    button.disabled = true;
    try {
      await getJson(PHP_API + '/produtos/' + encodeURIComponent(product.id), { method: 'DELETE' });
      el('deleteDialog').close();
      notify('Produto removido do catálogo.');
      await refresh();
    } catch (error) {
      el('deleteDialog').close();
      notify('Não foi possível excluir: ' + error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  el('searchProduct').addEventListener('input', renderProducts);
  el('refreshBtn').addEventListener('click', refresh);
  const navLinks = document.querySelectorAll('.nav-item');
  navLinks.forEach((link) => link.addEventListener('click', () => {
    navLinks.forEach((item) => {
      item.classList.toggle('is-active', item === link);
      if (item === link) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }));

  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, POLL_INTERVAL);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
