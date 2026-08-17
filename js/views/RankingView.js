/**
 * ============================================================================
 * GestARClimAS - RankingView.js
 * View: Quadro de Líderes por Pasta de Escola (Laudo mais Recente)
 * e Comparador Analítico Pericial Avançado de Laudos Lado a Lado (ODS 13)
 * ============================================================================
 */

class RankingView {
  constructor() {
    this.chartCompare = null;
    this.modal = document.getElementById('rankingModal');
    this.todosLaudosCache = [];
    this.bindSearchFilters();
  }

  bindSearchFilters() {
    const searchA = document.getElementById('compareSearchA');
    const searchB = document.getElementById('compareSearchB');

    if (searchA) {
      searchA.addEventListener('input', (e) => {
        this.filtrarOpcoes('A', e.target.value);
      });
    }

    if (searchB) {
      searchB.addEventListener('input', (e) => {
        this.filtrarOpcoes('B', e.target.value);
      });
    }
  }

  /**
   * Filtra em tempo real as opções da caixa de seleção A ou B (Inicia sem pré-seleção automática)
   */
  filtrarOpcoes(selecao, termo) {
    const select = document.getElementById(`compareSelect${selecao}`);
    if (!select || !this.todosLaudosCache) return;

    const termoNorm = (termo || '').toLowerCase().trim();
    const laudosFiltrados = (this.todosLaudosCache || []).filter(l => {
      if (!l || !l.escola) return false;
      const nome = (l.escola.nome || '').toLowerCase();
      const cidade = (l.escola.cidade || '').toLowerCase();
      const bairro = (l.escola.bairro || '').toLowerCase();
      const rua = (l.escola.rua || '').toLowerCase();
      const avaliador = (l.escola.avaliador || '').toLowerCase();
      return nome.includes(termoNorm) || cidade.includes(termoNorm) || bairro.includes(termoNorm) || rua.includes(termoNorm) || avaliador.includes(termoNorm);
    });

    select.innerHTML = '';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = `Selecione a instituição ${selecao === 'A' ? '1' : '2'}...`;
    defaultOpt.selected = true;
    select.appendChild(defaultOpt);

    if (laudosFiltrados.length === 0) {
      const optNone = document.createElement('option');
      optNone.value = '';
      optNone.disabled = true;
      optNone.textContent = 'Nenhuma instituição encontrada...';
      select.appendChild(optNone);
      return;
    }

    laudosFiltrados.forEach((laudo) => {
      const score = laudo.diagnostico?.scoreGeral || 0;
      const opt = document.createElement('option');
      opt.value = laudo.id;
      opt.textContent = `🏫 ${laudo.escola.nome || 'Escola'} (${laudo.escola.cidade || 'MA'} - ${laudo.escola.bairro || 'Centro'}) — Score: ${score}% [${laudo.escola.data || 'Data'}]`;
      select.appendChild(opt);
    });
  }

  /**
   * Renderiza a tabela do Ranking de Escolas baseado no ÚLTIMO LAUDO emitido por pasta
   */
  renderRanking(pastasEscolas, todosLaudos) {
    const tableBody = document.getElementById('rankingTableBody');
    this.todosLaudosCache = todosLaudos || [];

    if (!tableBody) return;

    if (!pastasEscolas || pastasEscolas.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--neutral-500); font-size: 0.9rem;">
            🏫 Nenhuma escola avaliada ainda no sistema.<br/>
            <span style="font-size: 0.8rem; color: var(--neutral-400);">Realize o primeiro diagnóstico escolar para liderar o ranking!</span>
          </td>
        </tr>
      `;
      const selectA = document.getElementById('compareSelectA');
      const selectB = document.getElementById('compareSelectB');
      if (selectA) selectA.innerHTML = '<option value="">Nenhum laudo disponível</option>';
      if (selectB) selectB.innerHTML = '<option value="">Nenhum laudo disponível</option>';
      this.compararLaudos(this.todosLaudosCache);
      return;
    }

    // Ordena decrescente pelo score do laudo mais recente da pasta
    const rankingOrdenado = [...pastasEscolas].sort((a, b) => {
      const scoreA = a.ultimoLaudo?.diagnostico?.scoreGeral || 0;
      const scoreB = b.ultimoLaudo?.diagnostico?.scoreGeral || 0;
      return scoreB - scoreA;
    });

    tableBody.innerHTML = '';
    rankingOrdenado.forEach((pasta, index) => {
      const laudo = pasta.ultimoLaudo;
      if (!laudo) return;
      const esc = laudo.escola || pasta;
      const score = laudo.diagnostico?.scoreGeral || 0;
      const corBadge = score >= 80 ? 'badge-excelente' : (score >= 50 ? 'badge-moderado' : 'badge-critico');
      
      let rankMedal = `#${index + 1}`;
      if (index === 0) rankMedal = '🥇 1º';
      else if (index === 1) rankMedal = '🥈 2º';
      else if (index === 2) rankMedal = '🥉 3º';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 800; font-size: 0.95rem; color: var(--neutral-800); text-align: center;">${rankMedal}</td>
        <td>
          <div style="font-weight: 700; color: var(--neutral-900); font-size: 0.9rem;">📁 ${esc.nome || pasta.nome}</div>
          <div style="font-size: 0.75rem; color: var(--neutral-500);">${(pasta.laudos || []).length} laudo(s) arquivado(s) na pasta</div>
        </td>
        <td style="font-size: 0.825rem; color: var(--neutral-700);">
          <div><strong>${esc.cidade || pasta.cidade} - ${esc.estado || pasta.estado}</strong></div>
          <div style="font-size: 0.75rem; color: var(--neutral-500);">${esc.bairro || 'Centro'} ${esc.rua ? `• ${esc.rua}` : ''} ${esc.cep ? `(CEP: ${esc.cep})` : ''}</div>
        </td>
        <td style="font-size: 0.8rem; color: var(--neutral-600);">${esc.turno || '-'}</td>
        <td style="font-size: 0.78rem; color: var(--neutral-500);">${esc.data || '-'}</td>
        <td style="text-align: center;">
          <span class="table-score-pill ${corBadge}">${score}%</span>
        </td>
        <td style="text-align: center;">
          <button class="btn btn-outline btn-sm" onclick="gestarclimasApp.abrirLaudoDoRanking('${laudo.id}')">
            Ver Laudo
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Reseta barras de busca
    const searchA = document.getElementById('compareSearchA');
    const searchB = document.getElementById('compareSearchB');
    if (searchA) searchA.value = '';
    if (searchB) searchB.value = '';

    // Popula seletores A e B zerados por padrão
    this.filtrarOpcoes('A', '');
    this.filtrarOpcoes('B', '');

    // Mantém o comparador zerado até seleção manual
    this.compararLaudos(this.todosLaudosCache);
  }

  /**
   * Executa e renderiza a comparação analítica completa entre dois laudos
   */
  compararLaudos(listaLaudos) {
    const idA = document.getElementById('compareSelectA')?.value;
    const idB = document.getElementById('compareSelectB')?.value;
    const containerComparacao = document.getElementById('comparisonResultsContainer');

    if (!containerComparacao) return;

    // Se qualquer um não estiver selecionado, exibe estado vazio/zerado com layout convidativo
    if (!idA || !idB || !(listaLaudos && listaLaudos.length > 0)) {
      containerComparacao.innerHTML = `
        <div class="comparison-empty-placeholder">
          <div class="empty-placeholder-icon">⚖️</div>
          <h4>Comparador Pericial Aguardando Seleção</h4>
          <p>
            Selecione a <strong>Instituição 1</strong> e a <strong>Instituição 2</strong> nos campos acima para gerar o comparativo executivo completo, deltas de emissões, radar comparativo e matriz diferencial dos 16 quesitos.
          </p>
        </div>
      `;
      return;
    }

    const laudoA = listaLaudos.find(l => l.id === idA);
    const laudoB = listaLaudos.find(l => l.id === idB);

    if (!laudoA || !laudoB || !laudoA.diagnostico || !laudoB.diagnostico) return;

    const dA = laudoA.diagnostico;
    const dB = laudoB.diagnostico;

    const scoreA = dA.scoreGeral || 0;
    const scoreB = dB.scoreGeral || 0;
    const deltaGeral = scoreA - scoreB;

    const mesmaEscola = (laudoA.escola?.nome || '').toLowerCase() === (laudoB.escola?.nome || '').toLowerCase();

    // Indicadores ecológicos
    const indA = dA.indicadores || {};
    const indB = dB.indicadores || {};

    const carbonA = indA.pegadaCarbonoEstimada || 80;
    const carbonB = indB.pegadaCarbonoEstimada || 80;
    const deltaCarbon = carbonA - carbonB;

    const waterA = indA.potencialEconomiaAguaM3 || 25;
    const waterB = indB.potencialEconomiaAguaM3 || 25;
    const deltaWater = waterA - waterB;

    const treesA = indA.mudasRecomendadas || 15;
    const treesB = indB.mudasRecomendadas || 15;
    const deltaTrees = treesA - treesB;

    const statsA = dA.estatisticasRespostas || { critico: 0, moderado: 0, excelente: 0 };
    const statsB = dB.estatisticasRespostas || { critico: 0, moderado: 0, excelente: 0 };

    containerComparacao.innerHTML = `
      ${mesmaEscola ? `
        <div class="comparison-evolution-banner">
          <span style="font-size: 1.2rem;">📈</span>
          <div>
            <strong>Comparação Evolutiva Temporal da Mesma Instituição:</strong>
            <span>${laudoA.escola.nome} (${laudoA.escola.cidade || 'MA'})</span>
          </div>
        </div>
      ` : ''}

      <!-- Header dos Dois Hero Cards Comparativos -->
      <div class="comparison-hero-grid">
        <!-- Coluna Instituição 1 -->
        <div class="comparison-hero-card school-1">
          <div class="comparison-hero-tag school-1-tag">Instituição 1</div>
          <h3 class="comparison-hero-title">${laudoA.escola?.nome || 'Instituição 1'}</h3>
          <p class="comparison-hero-location">
            📍 ${laudoA.escola?.cidade || 'Município'} - ${laudoA.escola?.estado || 'UF'} • ${laudoA.escola?.bairro || 'Centro'}
          </p>

          <div class="comparison-score-row">
            <div class="comparison-big-score school-1-score">${scoreA}%</div>
            <div class="comparison-score-details">
              <span class="comparison-badge ${dA.corBadge || 'badge-moderado'}">${dA.classificacao}</span>
              <span class="comparison-meta-date">📅 Data: ${laudoA.escola?.data || '-'}</span>
              <span class="comparison-meta-eval">👤 Avaliador: ${laudoA.userName || laudoA.escola?.avaliador || '-'}</span>
            </div>
          </div>
        </div>

        <!-- Coluna Instituição 2 -->
        <div class="comparison-hero-card school-2">
          <div class="comparison-hero-tag school-2-tag">Instituição 2</div>
          <h3 class="comparison-hero-title">${laudoB.escola?.nome || 'Instituição 2'}</h3>
          <p class="comparison-hero-location">
            📍 ${laudoB.escola?.cidade || 'Município'} - ${laudoB.escola?.estado || 'UF'} • ${laudoB.escola?.bairro || 'Centro'}
          </p>

          <div class="comparison-score-row">
            <div class="comparison-big-score school-2-score">${scoreB}%</div>
            <div class="comparison-score-details">
              <span class="comparison-badge ${dB.corBadge || 'badge-moderado'}">${dB.classificacao}</span>
              <span class="comparison-meta-date">📅 Data: ${laudoB.escola?.data || '-'}</span>
              <span class="comparison-meta-eval">👤 Avaliador: ${laudoB.userName || laudoB.escola?.avaliador || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumo do Delta Geral de Resiliência -->
      <div class="comparison-delta-banner ${deltaGeral > 0 ? 'win-1' : (deltaGeral < 0 ? 'win-2' : 'draw')}">
        <div class="delta-banner-icon">${deltaGeral > 0 ? '🏆' : (deltaGeral < 0 ? '🏆' : '⚖️')}</div>
        <div class="delta-banner-text">
          ${deltaGeral > 0 
            ? `<strong>${laudoA.escola.nome}</strong> apresenta <strong>+${deltaGeral} pontos percentuais</strong> a mais de Resiliência Climática que <strong>${laudoB.escola.nome}</strong>.`
            : (deltaGeral < 0 
              ? `<strong>${laudoB.escola.nome}</strong> apresenta <strong>+${Math.abs(deltaGeral)} pontos percentuais</strong> a mais de Resiliência Climática que <strong>${laudoA.escola.nome}</strong>.`
              : `Ambas as instituições possuem <strong>índices equivalentes de resiliência (${scoreA}%)</strong>.`
            )}
        </div>
      </div>

      <!-- Grade de 4 KPIs Comparativos -->
      <div class="comparison-kpi-grid">
        <div class="comp-kpi-card">
          <div class="comp-kpi-icon">🌍</div>
          <div class="comp-kpi-info">
            <span class="comp-kpi-label">Pegada de Carbono</span>
            <div class="comp-kpi-values">
              <span class="val-1">${carbonA} kg</span>
              <span class="val-vs">vs</span>
              <span class="val-2">${carbonB} kg</span>
            </div>
            <span class="comp-kpi-sub">CO₂ per capita anual (Menor é melhor)</span>
          </div>
        </div>

        <div class="comp-kpi-card">
          <div class="comp-kpi-icon">💧</div>
          <div class="comp-kpi-info">
            <span class="comp-kpi-label">Economia Hídrica</span>
            <div class="comp-kpi-values">
              <span class="val-1">${waterA} m³</span>
              <span class="val-vs">vs</span>
              <span class="val-2">${waterB} m³</span>
            </div>
            <span class="comp-kpi-sub">Potencial mensal de redução de água</span>
          </div>
        </div>

        <div class="comp-kpi-card">
          <div class="comp-kpi-icon">🌳</div>
          <div class="comp-kpi-info">
            <span class="comp-kpi-label">Compensação Florestal</span>
            <div class="comp-kpi-values">
              <span class="val-1">${treesA} mudas</span>
              <span class="val-vs">vs</span>
              <span class="val-2">${treesB} mudas</span>
            </div>
            <span class="comp-kpi-sub">Mudas para neutralização de impactos</span>
          </div>
        </div>

        <div class="comp-kpi-card">
          <div class="comp-kpi-icon">🚨</div>
          <div class="comp-kpi-info">
            <span class="comp-kpi-label">Vulnerabilidades Críticas</span>
            <div class="comp-kpi-values">
              <span class="val-1">${statsA.critico || 0} críticas</span>
              <span class="val-vs">vs</span>
              <span class="val-2">${statsB.critico || 0} críticas</span>
            </div>
            <span class="comp-kpi-sub">Quesitos em nível de alerta vermelho</span>
          </div>
        </div>
      </div>

      <!-- Radar Comparativo dos 4 Pilares da Resiliência -->
      <div class="comparison-chart-card">
        <div class="chart-card-header-wrap">
          <h4>Radar Comparativo dos 4 Pilares da Resiliência</h4>
          <p>Comparação vetorial sobreposta das 4 dimensões estratégicas</p>
        </div>
        <div class="chart-compare-canvas-holder">
          <canvas id="chartCompareRadar"></canvas>
        </div>
      </div>

      <!-- Tabela Comparativa dos 4 Pilares com Barras de Progresso -->
      <div class="comparison-section-card">
        <div class="chart-card-header-wrap">
          <h4>Desempenho Comparativo por Dimensão</h4>
          <p>Pontuação dimensional detalhada e cálculo de deltas percentuais</p>
        </div>

        <div class="table-responsive">
          <table class="tech-matrix-table">
            <thead>
              <tr>
                <th>Dimensão Técnica Avaliada</th>
                <th style="text-align: center; width: 160px;">${laudoA.escola?.nome || 'Instituição 1'}</th>
                <th style="text-align: center; width: 160px;">${laudoB.escola?.nome || 'Instituição 2'}</th>
                <th style="text-align: center; width: 180px;">Diferença (Delta)</th>
              </tr>
            </thead>
            <tbody>
              ${this.gerarLinhasComparativasDimensoes(dA, dB, laudoA.escola?.nome, laudoB.escola?.nome)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Matriz Diferencial dos 16 Quesitos Lado a Lado -->
      <div class="comparison-section-card">
        <div class="chart-card-header-wrap">
          <h4>Matriz Diferencial dos 16 Quesitos Lado a Lado</h4>
          <p>Auditoria item a item comparando o status de cada escola e vantagens comparativas</p>
        </div>

        <div class="table-responsive">
          <table class="tech-matrix-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">Item</th>
                <th>Critério & Indicador Avaliado</th>
                <th style="text-align: center; width: 140px;">${laudoA.escola?.nome || 'Instituição 1'}</th>
                <th style="text-align: center; width: 140px;">${laudoB.escola?.nome || 'Instituição 2'}</th>
                <th style="text-align: center; width: 160px;">Vantagem Pericial</th>
              </tr>
            </thead>
            <tbody>
              ${this.gerarLinhasComparativasQuestoes(dA, dB)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Renderiza Gráfico Radar Comparativo
    setTimeout(() => {
      this.renderRadarComparativo(laudoA, laudoB);
    }, 60);
  }

  gerarLinhasComparativasDimensoes(dA, dB, nomeA = 'Inst. 1', nomeB = 'Inst. 2') {
    const dimensoesConfig = [
      { key: 'riscosDesastres', nome: '1. Riscos de Desastres, Drenagem & Chuvas' },
      { key: 'consumoHidrico', nome: '2. Eficiência Hídrica & Reaproveitamento' },
      { key: 'areasVerdes', nome: '3. Conforto Bioclimático & Áreas Verdes' },
      { key: 'residuos', nome: '4. Gestão de Resíduos & Ação Climática (ODS 13)' }
    ];

    const dimA = dA.dimensoes || {};
    const dimB = dB.dimensoes || {};

    return dimensoesConfig.map(d => {
      const scoreDimA = dimA[d.key]?.score !== undefined ? dimA[d.key].score : 0;
      const scoreDimB = dimB[d.key]?.score !== undefined ? dimB[d.key].score : 0;
      const delta = scoreDimA - scoreDimB;

      let deltaBadge = '';
      if (delta > 0) {
        deltaBadge = `<span class="delta-pill win-1">+${delta}% (Inst. 1 superior)</span>`;
      } else if (delta < 0) {
        deltaBadge = `<span class="delta-pill win-2">+${Math.abs(delta)}% (Inst. 2 superior)</span>`;
      } else {
        deltaBadge = `<span class="delta-pill draw">Equivalentes (0%)</span>`;
      }

      return `
        <tr>
          <td>
            <div style="font-weight: 800; color: var(--neutral-900); font-size: 0.875rem;">${d.nome}</div>
          </td>
          <td style="text-align: center;">
            <div style="font-weight: 800; font-size: 0.9rem; color: #059669;">${scoreDimA}%</div>
            <div class="comp-mini-bar-track">
              <div class="comp-mini-bar-fill bar-1" style="width: ${scoreDimA}%;"></div>
            </div>
          </td>
          <td style="text-align: center;">
            <div style="font-weight: 800; font-size: 0.9rem; color: #0e7490;">${scoreDimB}%</div>
            <div class="comp-mini-bar-track">
              <div class="comp-mini-bar-fill bar-2" style="width: ${scoreDimB}%;"></div>
            </div>
          </td>
          <td style="text-align: center;">
            ${deltaBadge}
          </td>
        </tr>
      `;
    }).join('');
  }

  gerarLinhasComparativasQuestoes(dA, dB) {
    const listA = dA.detalhamentoQuestoes || [];
    const listB = dB.detalhamentoQuestoes || [];

    const mapB = new Map();
    listB.forEach(item => mapB.set(item.id || `p${item.num}`, item));

    return listA.map(itemA => {
      const idQ = itemA.id || `p${itemA.num}`;
      const itemB = mapB.get(idQ) || { status: 'moderado', statusTexto: 'Moderado', pontos: 5 };

      const ptsA = itemA.pontos !== undefined ? itemA.pontos : (itemA.status === 'excelente' ? 10 : (itemA.status === 'moderado' ? 5 : 0));
      const ptsB = itemB.pontos !== undefined ? itemB.pontos : (itemB.status === 'excelente' ? 10 : (itemB.status === 'moderado' ? 5 : 0));

      const badgeA = itemA.status === 'excelente' ? 'badge-excelente' : (itemA.status === 'moderado' ? 'badge-moderado' : 'badge-critico');
      const badgeB = itemB.status === 'excelente' ? 'badge-excelente' : (itemB.status === 'moderado' ? 'badge-moderado' : 'badge-critico');

      let vantagem = '';
      if (ptsA > ptsB) {
        vantagem = `<span class="delta-pill win-1">🟢 Inst. 1 (+${ptsA - ptsB} pts)</span>`;
      } else if (ptsB > ptsA) {
        vantagem = `<span class="delta-pill win-2">🔵 Inst. 2 (+${ptsB - ptsA} pts)</span>`;
      } else {
        vantagem = `<span class="delta-pill draw">⚪ Empate</span>`;
      }

      return `
        <tr>
          <td style="font-weight: 800; color: var(--neutral-500); text-align: center;">Q${itemA.num}</td>
          <td>
            <div style="font-weight: 700; color: var(--neutral-900); font-size: 0.85rem;">${itemA.titulo}</div>
            <div style="font-size: 0.72rem; color: var(--primary-700); font-weight: 600;">${itemA.pilar}</div>
          </td>
          <td style="text-align: center;">
            <span class="option-badge ${badgeA}">${itemA.statusTexto} (${ptsA}p)</span>
          </td>
          <td style="text-align: center;">
            <span class="option-badge ${badgeB}">${itemB.statusTexto} (${ptsB}p)</span>
          </td>
          <td style="text-align: center;">
            ${vantagem}
          </td>
        </tr>
      `;
    }).join('');
  }

  renderRadarComparativo(laudoA, laudoB) {
    const canvas = document.getElementById('chartCompareRadar');
    if (!canvas) return;

    if (this.chartCompare) {
      this.chartCompare.destroy();
      this.chartCompare = null;
    }

    const labels = [
      '1. Riscos & Chuvas',
      '2. Eficiência Hídrica',
      '3. Áreas Verdes & Clima',
      '4. Resíduos & ODS 13'
    ];

    const dA = laudoA.diagnostico?.dimensoes || {};
    const dB = laudoB.diagnostico?.dimensoes || {};

    const dataA = [
      dA.riscosDesastres?.score || 0,
      dA.consumoHidrico?.score || 0,
      dA.areasVerdes?.score || 0,
      dA.residuos?.score || 0
    ];

    const dataB = [
      dB.riscosDesastres?.score || 0,
      dB.consumoHidrico?.score || 0,
      dB.areasVerdes?.score || 0,
      dB.residuos?.score || 0
    ];

    this.chartCompare = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [
          {
            label: laudoA.escola?.nome || 'Instituição 1',
            data: dataA,
            backgroundColor: 'rgba(16, 185, 129, 0.25)',
            borderColor: '#059669',
            borderWidth: 2.5,
            pointBackgroundColor: '#047857',
            pointBorderColor: '#fff',
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: laudoB.escola?.nome || 'Instituição 2',
            data: dataB,
            backgroundColor: 'rgba(14, 116, 144, 0.25)',
            borderColor: '#0e7490',
            borderWidth: 2.5,
            pointBackgroundColor: '#083344',
            pointBorderColor: '#fff',
            pointRadius: 5,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 25,
              backdropColor: 'transparent',
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 10 },
              callback: (v) => `${v}%`
            },
            pointLabels: {
              font: { family: "'Plus Jakarta Sans', sans-serif", weight: '700', size: 11 },
              color: '#334155'
            },
            grid: { color: 'rgba(203, 213, 225, 0.6)' },
            angleLines: { color: 'rgba(203, 213, 225, 0.6)' }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 14,
              font: { family: "'Plus Jakarta Sans', sans-serif", weight: '700', size: 12 },
              color: '#1e293b'
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}%`
            }
          }
        }
      }
    });
  }
}

// Disponibiliza no escopo global
window.RankingView = RankingView;
