let state = {
    activeTab: 'dashboard',
    selectedMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear(),
    monthlyIncome: 0,
    monthlyExpenses: 0,
    transactions: JSON.parse(localStorage.getItem('finanzcoach_txs')) || [],
    accounts: JSON.parse(localStorage.getItem('finanzcoach_accounts')) || [],
    savingsGoals: JSON.parse(localStorage.getItem('finanzcoach_goals')) || [],
    forecast: {
      initDeposit: 0,
      monthlyContrib: 0,
      returnRate: 7.0,
      years: 15
    }
  };
  
  let charts = {};
  
  document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupEventListeners();
    startLiveClock();
    updateAllViews();
  });
  
  function saveState() {
    localStorage.setItem('finanzcoach_txs', JSON.stringify(state.transactions));
    localStorage.setItem('finanzcoach_accounts', JSON.stringify(state.accounts));
    localStorage.setItem('finanzcoach_goals', JSON.stringify(state.savingsGoals));
  }
  
  function resetAllData() {
    if (confirm("Möchtest du wirklich alle gespeicherten Daten (Transaktionen, Konten, Sparziele) zurücksetzen?")) {
      localStorage.clear();
      state.transactions = [];
      state.accounts = [];
      state.savingsGoals = [];
      state.monthlyIncome = 0;
      state.monthlyExpenses = 0;
      updateAllViews();
    }
  }
  
  function calculateMonthlyTotals() {
    const filtered = state.transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === state.selectedMonth && d.getFullYear() === state.selectedYear;
    });
  
    state.monthlyIncome = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    state.monthlyExpenses = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  }
  
  function setupNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const dashboardTopHeader = document.getElementById('dashboardTopHeader');
  
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
  
        navTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
  
        document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));
        const targetEl = document.getElementById(`view-${targetTab}`);
        if (targetEl) targetEl.classList.add('active');
  
        state.activeTab = targetTab;
        if (dashboardTopHeader) {
          dashboardTopHeader.style.display = targetTab === 'dashboard' ? 'grid' : 'none';
        }
  
        updateAllViews();
      });
    });
  }
  
  function startLiveClock() {
    function updateTime() {
      const now = new Date();
      const days = ['SONNTAG', 'MONTAG', 'DIENSTAG', 'MITTWOCH', 'DONNERSTAG', 'FREITAG', 'SAMSTAG'];
      const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  
      const dayEl = document.getElementById('topDayName');
      const dateEl = document.getElementById('topDateStr');
      const clockEl = document.getElementById('topClockStr');
      const kwEl = document.getElementById('topKwBadge');
  
      if (dayEl) dayEl.innerText = days[now.getDay()];
      if (dateEl) dateEl.innerText = `${now.getDate()}. ${months[now.getMonth()]} ${now.getFullYear()}`;
      if (clockEl) clockEl.innerText = now.toLocaleTimeString('de-DE') + ' Uhr';
      if (kwEl) kwEl.innerText = `KW ${getWeekNumber(now)}`;
  
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysLeft = Math.max(0, lastDay - now.getDate());
      const daysLeftEl = document.getElementById('topDaysRemainingVal');
      if (daysLeftEl) daysLeftEl.innerText = daysLeft;
  
      const monthPct = ((now.getDate() / lastDay) * 100).toFixed(1);
      const monthPctEl = document.getElementById('topMonthPctText');
      const monthBarEl = document.getElementById('topMonthProgressBar');
      if (monthPctEl) monthPctEl.innerText = `${monthPct}%`;
      if (monthBarEl) monthBarEl.style.width = `${monthPct}%`;
    }
  
    updateTime();
    setInterval(updateTime, 1000);
  }
  
  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }
  
  function setupEventListeners() {
    const resetBtn = document.getElementById('resetDataBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetAllData);
  
    const monthSelect = document.getElementById('monatSelectMonth');
    const yearSelect = document.getElementById('monatSelectYear');
  
    if (monthSelect && yearSelect) {
      monthSelect.value = state.selectedMonth;
      const currentY = new Date().getFullYear();
      yearSelect.innerHTML = '';
      for (let y = currentY - 5; y <= currentY + 5; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === state.selectedYear) opt.selected = true;
        yearSelect.appendChild(opt);
      }
  
      monthSelect.addEventListener('change', (e) => {
        state.selectedMonth = parseInt(e.target.value);
        updateAllViews();
      });
      yearSelect.addEventListener('change', (e) => {
        state.selectedYear = parseInt(e.target.value);
        updateAllViews();
      });
    }
  
    // Transaktionen Modal
    const openTxBtn = document.getElementById('openAddTxModalBtn');
    if (openTxBtn) {
      openTxBtn.addEventListener('click', () => {
        document.getElementById('txForm').reset();
        document.getElementById('modalTxDate').value = new Date().toISOString().slice(0, 10);
        document.getElementById('txModal').style.display = 'flex';
      });
    }
    const closeTxBtn = document.getElementById('closeTxModalBtn');
    if (closeTxBtn) {
      closeTxBtn.addEventListener('click', () => { document.getElementById('txModal').style.display = 'none'; });
    }
    const txForm = document.getElementById('txForm');
    if (txForm) txForm.addEventListener('submit', handleTxSubmit);
  
    // Konten Modal
    const openAccBtn = document.getElementById('openAddAccountModalBtn');
    if (openAccBtn) {
      openAccBtn.addEventListener('click', () => {
        document.getElementById('accountForm').reset();
        document.getElementById('accountModal').style.display = 'flex';
      });
    }
    const closeAccBtn = document.getElementById('closeAccountModalBtn');
    if (closeAccBtn) {
      closeAccBtn.addEventListener('click', () => { document.getElementById('accountModal').style.display = 'none'; });
    }
    const accForm = document.getElementById('accountForm');
    if (accForm) accForm.addEventListener('submit', handleAccountSubmit);
  
    // Filter & Search
    const searchInput = document.getElementById('txSearchInput');
    if (searchInput) searchInput.addEventListener('input', renderMonatTable);
    const catFilter = document.getElementById('txCategoryFilter');
    if (catFilter) catFilter.addEventListener('change', renderMonatTable);
  
    // Prognose Sliders
    ['InitDeposit', 'MonthlyContrib', 'ReturnRate', 'Years'].forEach(param => {
      const slider = document.getElementById(`slider${param}`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          if (param === 'InitDeposit') {
            state.forecast.initDeposit = val;
            document.getElementById('valInitDeposit').innerText = `${val.toLocaleString('de-DE')} €`;
          } else if (param === 'MonthlyContrib') {
            state.forecast.monthlyContrib = val;
            document.getElementById('valMonthlyContrib').innerText = `${val.toLocaleString('de-DE')} €`;
          } else if (param === 'ReturnRate') {
            state.forecast.returnRate = val;
            document.getElementById('valReturnRate').innerText = `${val.toFixed(1)} %`;
          } else if (param === 'Years') {
            state.forecast.years = val;
            document.getElementById('valYears').innerText = `${val} Jahre`;
          }
          renderPrognoseCharts();
        });
      }
    });
  
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportPdf);
  }
  
  function updateAllViews() {
    calculateMonthlyTotals();
    renderTopHeaderCards();
    if (state.activeTab === 'dashboard') renderDashboardCharts();
    if (state.activeTab === 'monat') { renderMonatCharts(); renderMonatTable(); }
    if (state.activeTab === 'konten') renderKontenSection();
    if (state.activeTab === 'jahr') { renderJahrChartsAndTable(); }
    if (state.activeTab === 'prognose') renderPrognoseCharts();
    if (state.activeTab === 'sparer') renderSparerSection();
    if (state.activeTab === 'berater') renderBeraterSection();
  }
  
  function renderTopHeaderCards() {
    const remaining = state.monthlyIncome - state.monthlyExpenses;
    const usedPct = state.monthlyIncome > 0 ? ((state.monthlyExpenses / state.monthlyIncome) * 100).toFixed(1) : "0.0";
    const dailyBudget = (remaining / 30).toFixed(2);
  
    const remEl = document.getElementById('topRemainingValue');
    const incEl = document.getElementById('topIncomeBadge');
    const expEl = document.getElementById('topExpenseBadge');
    const pctText = document.getElementById('topBudgetPctText');
    const dailyEl = document.getElementById('topDailyBudgetVal');
    const bar = document.getElementById('topBudgetProgressBar');
  
    if (remEl) remEl.innerText = `${remaining.toLocaleString('de-DE', {minimumFractionDigits: 2})} €`;
    if (incEl) incEl.innerText = `+ ${state.monthlyIncome.toLocaleString('de-DE')} €`;
    if (expEl) expEl.innerText = `- ${state.monthlyExpenses.toLocaleString('de-DE')} €`;
    if (pctText) pctText.innerText = `Budget verbraucht (${usedPct}%)`;
    if (dailyEl) dailyEl.innerText = `Tagesbudget: ${dailyBudget} €/Tag`;
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, parseFloat(usedPct)))}%`;
  }
  
  // DASHBOARD
  function renderDashboardCharts() {
    destroyChart('dashCashflowChart');
    const ctx1 = document.getElementById('dashCashflowChart');
    if (ctx1) {
      charts['dashCashflowChart'] = new Chart(ctx1.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['Aktueller Monat'],
          datasets: [
            { label: 'Einnahmen', data: [state.monthlyIncome], backgroundColor: '#10b981' },
            { label: 'Ausgaben', data: [state.monthlyExpenses], backgroundColor: '#ef4444' }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: '#8b9bb4' } }, y: { ticks: { color: '#8b9bb4' } } } }
      });
    }
  
    destroyChart('dashCategoryChart');
    const ctx2 = document.getElementById('dashCategoryChart');
    if (ctx2) {
      const catTotals = {};
      state.transactions.filter(t => t.type === 'expense').forEach(t => {
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
      });
      const labels = Object.keys(catTotals).length > 0 ? Object.keys(catTotals) : ['Keine Daten'];
      const dataVals = Object.keys(catTotals).length > 0 ? Object.values(catTotals) : [1];
  
      charts['dashCategoryChart'] = new Chart(ctx2.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{ data: dataVals, backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#8b9bb4' } } } }
      });
    }
  
    destroyChart('dashLiquidityChart');
    const ctx3 = document.getElementById('dashLiquidityChart');
    if (ctx3) {
      charts['dashLiquidityChart'] = new Chart(ctx3.getContext('2d'), {
        type: 'line',
        data: {
          labels: Array.from({length: 10}, (_, i) => `Tag ${i*3 + 1}`),
          datasets: [{ label: 'Kapitalverlauf (€)', data: Array(10).fill(state.monthlyIncome - state.monthlyExpenses), fill: true, backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6', tension: 0.3 }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: '#8b9bb4' } }, y: { ticks: { color: '#8b9bb4' } } } }
      });
    }
  }
  
  // MONAT
  function renderMonatCharts() {
    destroyChart('monatBudgetvsActualChart');
    const ctx1 = document.getElementById('monatBudgetvsActualChart');
    if (ctx1) {
      charts['monatBudgetvsActualChart'] = new Chart(ctx1.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['Miete', 'Lebensmittel', 'Freizeit', 'Mobilität'],
          datasets: [{ label: 'Ausgaben', data: [0, 0, 0, 0], backgroundColor: '#3b82f6' }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: '#8b9bb4' } }, y: { ticks: { color: '#8b9bb4' } } } }
      });
    }
  }
  
  function renderMonatTable() {
    const tbody = document.getElementById('transactionTableBody');
    if (!tbody) return;
    const search = document.getElementById('txSearchInput')?.value.toLowerCase() || '';
    const catFilter = document.getElementById('txCategoryFilter')?.value || 'ALL';
  
    tbody.innerHTML = '';
  
    const filtered = state.transactions.filter(t => {
      const d = new Date(t.date);
      const matchMonth = d.getMonth() === state.selectedMonth && d.getFullYear() === state.selectedYear;
      const matchSearch = t.note.toLowerCase().includes(search) || t.category.toLowerCase().includes(search);
      const matchCat = catFilter === 'ALL' || t.category === catFilter;
      return matchMonth && matchSearch && matchCat;
    });
  
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#8b9bb4; padding:20px;">Keine Buchungen im gewählten Monat.</td></tr>`;
      return;
    }
  
    filtered.forEach(tx => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${tx.date}</td>
        <td><span class="badge-dark">${tx.type === 'income' ? 'Einnahme' : 'Ausgabe'}</span></td>
        <td><strong>${tx.category}</strong></td>
        <td>${tx.note || '-'}</td>
        <td style="font-weight:bold; color:${tx.type === 'income' ? '#10b981' : '#ef4444'}">
          ${tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)} €
        </td>
        <td><button onclick="deleteTx(${tx.id})" style="background:none; border:none; color:#ef4444; cursor:pointer;">✕</button></td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  function handleTxSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('modalTxType').value;
    const amount = parseFloat(document.getElementById('modalTxAmount').value);
    const category = document.getElementById('modalTxCategory').value;
    const date = document.getElementById('modalTxDate').value;
    const note = document.getElementById('modalTxNote').value;
  
    if (!isNaN(amount) && amount > 0 && date) {
      state.transactions.unshift({ id: Date.now(), type, amount, category, note, date });
      saveState();
      updateAllViews();
      document.getElementById('txModal').style.display = 'none';
    }
  }
  
  function deleteTx(id) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveState();
    updateAllViews();
  }
  
  // KONTEN
  function handleAccountSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('modalAccName').value;
    const bank = document.getElementById('modalAccBank').value;
    const type = document.getElementById('modalAccType').value;
    const balance = parseFloat(document.getElementById('modalAccBalance').value);
  
    if (!isNaN(balance)) {
      state.accounts.push({ id: Date.now(), name, bank, type, balance });
      saveState();
      updateAllViews();
      document.getElementById('accountModal').style.display = 'none';
    }
  }
  
  function deleteAccount(id) {
    state.accounts = state.accounts.filter(a => a.id !== id);
    saveState();
    updateAllViews();
  }
  
  function renderKontenSection() {
    const tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
  
    let totalNetWorth = 0;
    if (state.accounts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#8b9bb4; padding:20px;">Keine Konten hinterlegt. Füge oben ein Konto hinzu.</td></tr>`;
    }
  
    state.accounts.forEach(acc => {
      totalNetWorth += acc.balance;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${acc.name}</strong></td>
        <td>${acc.bank}</td>
        <td><span class="badge-dark">${acc.type}</span></td>
        <td style="font-weight:bold; color:${acc.balance >= 0 ? '#10b981' : '#ef4444'}">${acc.balance.toLocaleString('de-DE', {minimumFractionDigits: 2})} €</td>
        <td><button onclick="deleteAccount(${acc.id})" style="background:none; border:none; color:#ef4444; cursor:pointer;">✕</button></td>
      `;
      tbody.appendChild(tr);
    });
  
    const netWorthEl = document.getElementById('totalNetWorth');
    if (netWorthEl) netWorthEl.innerText = `${totalNetWorth.toLocaleString('de-DE', {minimumFractionDigits: 2})} €`;
  }
  
  // JAHR
  function renderJahrChartsAndTable() {
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const tbody = document.getElementById('jahrTableBody');
    if (tbody) {
      tbody.innerHTML = '';
      months.forEach((m) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${m} ${state.selectedYear}</td><td>0,00 €</td><td>0,00 €</td><td>0,00 €</td><td>0 %</td>`;
        tbody.appendChild(tr);
      });
    }
  }
  
  // PROGNOSE
  function renderPrognoseCharts() {
    const { initDeposit, monthlyContrib, returnRate, years } = state.forecast;
    const labels = Array.from({length: years}, (_, i) => `Jahr ${i + 1}`);
  
    function calcTrajectory(rate) {
      let balance = initDeposit;
      const r = rate / 100;
      const data = [];
      for (let i = 1; i <= years; i++) {
        balance = (balance + monthlyContrib * 12) * (1 + r);
        data.push(Math.round(balance));
      }
      return data;
    }
  
    destroyChart('prognoseForecastChart');
    const ctx = document.getElementById('prognoseForecastChart');
    if (ctx) {
      charts['prognoseForecastChart'] = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{ label: `Vermögen (${returnRate}%)`, data: calcTrajectory(returnRate), borderColor: '#3b82f6', borderWidth: 3, fill: true, backgroundColor: 'rgba(59, 130, 246, 0.1)' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: '#8b9bb4' } }, y: { ticks: { color: '#8b9bb4' } } } }
      });
    }
  }
  
  // SPARER & BERATER
  function renderSparerSection() {}
  function renderBeraterSection() {}
  
  // PDF EXPORT
  function exportPdf() {
    const loader = document.getElementById('pdfLoadingOverlay');
    if (loader) loader.style.display = 'flex';
  
    const views = document.querySelectorAll('.tab-view');
    views.forEach(v => v.style.display = 'flex');
  
    const element = document.getElementById('pdf-container');
    const opt = {
      margin: 0.2,
      filename: `FinanzCoach_PRO_Bericht_${new Date().toISOString().slice(0,10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: '#0b0f19' },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    };
  
    html2pdf().set(opt).from(element).save().then(() => {
      views.forEach(v => v.style.display = '');
      document.getElementById(`view-${state.activeTab}`).classList.add('active');
      if (loader) loader.style.display = 'none';
    }).catch(() => {
      views.forEach(v => v.style.display = '');
      document.getElementById(`view-${state.activeTab}`).classList.add('active');
      if (loader) loader.style.display = 'none';
    });
  }
  
  function destroyChart(id) {
    if (charts[id]) {
      charts[id].destroy();
      delete charts[id];
    }
  }