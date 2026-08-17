/**
 * ============================================================================
 * GestARClimAS - RankingView.js
 * View: Quadro de Líderes por Pasta de Escola (Laudo mais Recente)
 * e Comparador de Laudos com Pesquisa em Tempo Real (Zerado por Padrão)
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
      opt.textContent = `${laudo.escola.nome || 'Escola'} (${laudo.escola.cidade || 'MA'} - ${laudo.escola.bairro || 'Centro'}) - ${score}% [${laudo.escola.data || 'Data'}]`;
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
   * Executa e renderiza a comparação analítica entre dois laudos
   */
  compararLaudos(listaLaudos) {
    const idA = document.getElementById('compareSelectA')?.value;
    const idB = document.getElementById('compareSelectB')?.value;
    const containerComparacao = document.getElementById('comparisonResultsContainer');

    if (!containerComparacao) return;

    // Se qualquer um não estiver selecionado, exibe estado vazio/zerado
    if (!idA || !idB || !(listaLaudos && listaLaudos.length > 0)) {
      containerComparacao.innerHTML = `
        <div style="text-align: center; padding: 3rem 1.5rem; background: #ffffff; border: 1.5px dashed var(--neutral-300); border-radius: var(--radius-xl); color: var(--neutral-600);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚖️</div>
          <h4 style="font-weight: 800; color: var(--neutral-800); margin-bottom: 0.25rem;">Comparador Pericial Aguardando Seleção</h4>
          <p style="font-size: 0.85rem; color: var(--neutral-500); max-width: 480px; margin: 0 auto;">
            Selecione manualmente a <strong>Instituição 1</strong> e a <strong>Instituição 2</strong> nas caixas acima para gerar o comparativo técnico lado a lado e o gráfico radar.
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

    const mesmaEscola = (laudoA.escola?.nome || '').toLowerCase() === (laudoB.escola?.nome || '').toLowerCase();

    containerComparacao.innerHTML = `
      ${mesmaEscola ? `
        <div style="background: var(--primary-50); border: 1px solid var(--primary-200); color: var(--primary-900); padding: 0.6rem 1rem; border-radius: var(--radius-md); font-size: 0.825rem; font-weight: 700; margin-bottom: 1rem; text-align: center;">
          📈 Comparação Evolutiva Temporal da mesma instituição: <strong>${laudoA.escola.nome}</strong>
        </div>
      ` : ''}

      <div class="comparison-grid">
        <div class="comparison-column-card col-a">
          <div class="comparison-card-badge">Instituição 1</div>
          <h3>${laudoA.escola?.nome || 'Escola A'}</h3>
          <p class="comparison-card-sub">${laudoA.escola?.cidade || ''} - ${laudoA.escola?.estado || ''} (${laudoA.escola?.bairro || 'Centro'})</p>
          <div class="comparison-score-circle">${dA.scoreGeral}%</div>
          <div class="comparison-class-tag">${dA.classificacao}</div>
          <div class="comparison-meta-line">Avaliador: <strong>${laudoA.userName || laudoA.escola?.avaliador || '-'}</strong></div>
          <div class="comparison-meta-line">Data: ${laudoA.escola?.data || '-'}</div>
        </div>

        <div class="comparison-column-card col-b">
          <div class="comparison-card-badge">Instituição 2</div>
          <h3>${laudoB.escola?.nome || 'Escola B'}</h3>
          <p class="comparison-card-sub">${laudoB.escola?.cidade || ''} - ${laudoB.escola?.estado || ''} (${laudoB.escola?.bairro || 'Centro'})</p>
          <div class="comparison-score-circle">${dB.scoreGeral}%</div>
          <div class="comparison-class-tag">${dB.classificacao}</div>
          <div class="comparison-meta-line">Avaliador: <strong>${laudoB.userName || laudoB.escola?.avaliador || '-'}</strong></div>
          <div class="comparison-meta-line">Data: ${laudoB.escola?.data || '-'}</div>
        </div>
      </div>

      <!-- Tabela Comparativa dos 4 Pilares da Resiliência -->
      <div class="comparison-table-card" style="margin-top: 1.5rem;">
        <h4>Detalhamento Comparativo por Dimensão</h4>
        <div class="table-responsive">
          <table class="tech-matrix-table">
            <thead>
              <tr>
                <th>Dimensão Técnica Avaliada</th>
                <th style="text-align: center;">${laudoA.escola?.nome || 'Escola 1'}</th>
                <th style="text-align: center;">${laudoB.escola?.nome || 'Escola 2'}</th>
                <th style="text-align: center;">Diferença (Delta)</th>
              </tr>
            </thead>
            <tbody>
              ${this.gerarLinhasComparativas(dA, dB)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Gráfico Radar Comparativo -->
      <div class="comparison-chart-card" style="margin-top: 1.5rem; background: #ffffff; padding: 1.5rem; border: 1px solid var(--neutral-200); border-radius: var(--radius-xl);">
        <h4 style="font-weight: 800; font-size: 1rem; color: var(--neutral-900); margin-bottom: 1rem;">Radar Comparativo dos 4 Pilares da Resiliência</h4>
        <div style="max-height: 360px; position: relative;">
          <canvas id="chartCompareRadar"></canvas>
        </div>
      </div>
    `;

    // Renderiza Gráfico Radar Comparativo
    setTimeout(() => {
      this.renderRadarComparativo(laudoA, laudoB);
    }, 50);
  }

  gerarLinhasComparativas(dA, dB) {
    const dimensoes = [
      { key: 'd1_riscos', nome: '1. Riscos de Desastres & Período Chuvoso' },
      { key: 'd2_agua', nome: '2. Consumo Hídrico e Eficiência' },
      { key: 'd3_verde', nome: '3. Áreas Verdes & Microclima' },
      { key: 'd4_residuos', nome: '4. Gestão de Resíduos & Ação Climática (ODS 13)' }
    ];

    return dimensoes.map(d => {
      const pA = dA.dimensoes?.[d.key]?.percentual || 0;
      const pB = dB.dimensoes?.[d.key]?.percentual || 0;
      const delta = pB - pA;
      const deltaBadge = delta > 0 
        ? `<span style="color: #059669; font-weight: 800;">+${delta}% (Inst. 2 superior)</span>`
        : (delta < 0 ? `<span style="color: #dc2626; font-weight: 800;">${delta}% (Inst. 1 superior)</span>` : `<span style="color: var(--neutral-500); font-weight: 700;">Equivalentes (0%)</span>`);

      return `
        <tr>
          <td style="font-weight: 700;">${d.nome}</td>
          <td style="text-align: center; font-weight: 800;">${pA}%</td>
          <td style="text-align: center; font-weight: 800;">${pB}%</td>
          <td style="text-align: center;">${deltaBadge}</td>
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
      'Riscos & Chuvas',
      'Gestão Hídrica',
      'Áreas Verdes',
      'Resíduos & ODS 13'
    ];

    const dA = laudoA.diagnostico?.dimensoes;
    const dB = laudoB.diagnostico?.dimensoes;

    const dataA = [
      dA?.d1_riscos?.percentual || 0,
      dA?.d2_agua?.percentual || 0,
      dA?.d3_verde?.percentual || 0,
      dA?.d4_residuos?.percentual || 0
    ];

    const dataB = [
      dB?.d1_riscos?.percentual || 0,
      dB?.d2_agua?.percentual || 0,
      dB?.d3_verde?.percentual || 0,
      dB?.d4_residuos?.percentual || 0
    ];

    this.chartCompare = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [
          {
            label: laudoA.escola?.nome || 'Instituição 1',
            data: dataA,
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            borderColor: '#10b981',
            borderWidth: 2.5,
            pointBackgroundColor: '#10b981',
            pointRadius: 4
          },
          {
            label: laudoB.escola?.nome || 'Instituição 2',
            data: dataB,
            backgroundColor: 'rgba(14, 165, 233, 0.2)',
            borderColor: '#0ea5e9',
            borderWidth: 2.5,
            pointBackgroundColor: '#0ea5e9',
            pointRadius: 4
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
            ticks: { stepSize: 20, font: { family: "'Plus Jakarta Sans', sans-serif", size: 10 } },
            pointLabels: { font: { family: "'Plus Jakarta Sans', sans-serif", weight: '700', size: 11 } }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: "'Plus Jakarta Sans', sans-serif", weight: '700', size: 12 } }
          }
        }
      }
    });
  }
}

// Disponibiliza no escopo global
window.RankingView = RankingView;
