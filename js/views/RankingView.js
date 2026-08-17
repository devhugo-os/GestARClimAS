/**
 * ============================================================================
 * GestARClimAS - RankingView.js
 * View: Quadro de Líderes por Pasta de Escola (Laudo mais Recente)
 * e Comparador de Laudos com Pesquisa em Tempo Real (Acesso Total Livre)
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
   * Filtra em tempo real as opções da caixa de seleção A ou B
   * @param {string} selecao 'A' ou 'B'
   * @param {string} termo Texto digitado na barra de pesquisa
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

    if (laudosFiltrados.length === 0) {
      select.innerHTML = '<option value="" disabled selected>Nenhuma instituição encontrada...</option>';
      return;
    }

    laudosFiltrados.forEach((laudo, idx) => {
      const score = laudo.diagnostico?.scoreGeral || 0;
      const opt = document.createElement('option');
      opt.value = laudo.id;
      opt.textContent = `${laudo.escola.nome || 'Escola'} (${laudo.escola.cidade || 'MA'} - ${laudo.escola.bairro || 'Centro'}) - ${score}% [${laudo.escola.data || 'Data'}]`;
      if (idx === 0) opt.selected = true;
      select.appendChild(opt);
    });

    this.compararLaudos(this.todosLaudosCache);
  }

  /**
   * Renderiza a tabela do Ranking de Escolas baseado no ÚLTIMO LAUDO emitido por pasta
   * @param {Array} pastasEscolas Array de escolas agrupadas em pastas
   * @param {Array} todosLaudos Array completo de laudos
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

    // Popula seletores A e B
    this.filtrarOpcoes('A', '');
    this.filtrarOpcoes('B', '');

    const selectB = document.getElementById('compareSelectB');
    if (selectB && selectB.options.length > 1) {
      selectB.selectedIndex = 1;
    }

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

    if (!idA || !idB || !(listaLaudos && listaLaudos.length > 0)) {
      containerComparacao.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--neutral-500); font-size: 0.875rem;">
          Selecione duas instituições acima para gerar a comparação pericial lado a lado.
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
          📈 Comparação Evolutiva Temporal da mesma escola: <strong>${laudoA.escola.nome}</strong>
        </div>
      ` : ''}

      <div class="comparison-grid">
        <div class="comparison-column-card col-a">
          <div class="comp-header">
            <span class="comp-badge school-a">Instituição 1</span>
            <h4>${laudoA.escola.nome || 'Instituição 1'}</h4>
            <p>${laudoA.escola.cidade || ''} - ${laudoA.escola.estado || ''} (${laudoA.escola.bairro || 'Centro'}) • ${laudoA.escola.data || ''}</p>
            <p style="font-size: 0.72rem; color: var(--neutral-500);">Avaliador(a): ${laudoA.escola.avaliador || 'Não informado'} • Turno: ${laudoA.escola.turno || '-'}</p>
            <div class="comp-score-big">${dA.scoreGeral}%</div>
            <div class="classification-tag ${dA.corBadge}" style="font-size: 0.72rem; padding: 0.2rem 0.6rem;">${dA.classificacao}</div>
          </div>
        </div>

        <div class="comparison-chart-box">
          <h4 style="text-align: center; font-size: 0.875rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--neutral-800);">Radar Comparativo dos 4 Pilares</h4>
          <div style="position: relative; width: 100%; height: 210px;">
            <canvas id="chartCompareRadar"></canvas>
          </div>
        </div>

        <div class="comparison-column-card col-b">
          <div class="comp-header">
            <span class="comp-badge school-b">Instituição 2</span>
            <h4>${laudoB.escola.nome || 'Instituição 2'}</h4>
            <p>${laudoB.escola.cidade || ''} - ${laudoB.escola.estado || ''} (${laudoB.escola.bairro || 'Centro'}) • ${laudoB.escola.data || ''}</p>
            <p style="font-size: 0.72rem; color: var(--neutral-500);">Avaliador(a): ${laudoB.escola.avaliador || 'Não informado'} • Turno: ${laudoB.escola.turno || '-'}</p>
            <div class="comp-score-big">${dB.scoreGeral}%</div>
            <div class="classification-tag ${dB.corBadge}" style="font-size: 0.72rem; padding: 0.2rem 0.6rem;">${dB.classificacao}</div>
          </div>
        </div>
      </div>

      <div class="table-responsive" style="margin-top: 1.25rem;">
        <table class="tech-matrix-table">
          <thead>
            <tr>
              <th>Dimensão / Indicador Avaliado</th>
              <th style="text-align: center;">Instituição 1</th>
              <th style="text-align: center;">Instituição 2</th>
              <th style="text-align: center;">Diferença (Delta)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1. Riscos de Desastres & Chuvas</strong></td>
              <td style="text-align: center; font-weight: 800;">${dA.dimensoes?.riscosDesastres?.score || 0}%</td>
              <td style="text-align: center; font-weight: 800;">${dB.dimensoes?.riscosDesastres?.score || 0}%</td>
              <td style="text-align: center;">${this._calcDelta(dA.dimensoes?.riscosDesastres?.score || 0, dB.dimensoes?.riscosDesastres?.score || 0)}</td>
            </tr>
            <tr>
              <td><strong>2. Eficiência Hídrica & Saneamento</strong></td>
              <td style="text-align: center; font-weight: 800;">${dA.dimensoes?.consumoHidrico?.score || 0}%</td>
              <td style="text-align: center; font-weight: 800;">${dB.dimensoes?.consumoHidrico?.score || 0}%</td>
              <td style="text-align: center;">${this._calcDelta(dA.dimensoes?.consumoHidrico?.score || 0, dB.dimensoes?.consumoHidrico?.score || 0)}</td>
            </tr>
            <tr>
              <td><strong>3. Áreas Verdes & Microclima</strong></td>
              <td style="text-align: center; font-weight: 800;">${dA.dimensoes?.areasVerdes?.score || 0}%</td>
              <td style="text-align: center; font-weight: 800;">${dB.dimensoes?.areasVerdes?.score || 0}%</td>
              <td style="text-align: center;">${this._calcDelta(dA.dimensoes?.areasVerdes?.score || 0, dB.dimensoes?.areasVerdes?.score || 0)}</td>
            </tr>
            <tr>
              <td><strong>4. Resíduos & Ação Climática (ODS 13)</strong></td>
              <td style="text-align: center; font-weight: 800;">${dA.dimensoes?.residuos?.score || 0}%</td>
              <td style="text-align: center; font-weight: 800;">${dB.dimensoes?.residuos?.score || 0}%</td>
              <td style="text-align: center;">${this._calcDelta(dA.dimensoes?.residuos?.score || 0, dB.dimensoes?.residuos?.score || 0)}</td>
            </tr>
            <tr>
              <td>🌍 Pegada de Carbono (kg CO₂/aluno)</td>
              <td style="text-align: center;">${dA.indicadores?.pegadaCarbonoEstimada || 0} kg</td>
              <td style="text-align: center;">${dB.indicadores?.pegadaCarbonoEstimada || 0} kg</td>
              <td style="text-align: center;">${((dA.indicadores?.pegadaCarbonoEstimada || 0) - (dB.indicadores?.pegadaCarbonoEstimada || 0))} kg</td>
            </tr>
            <tr>
              <td>💧 Potencial Economia de Água</td>
              <td style="text-align: center;">${dA.indicadores?.potencialEconomiaAguaM3 || 0} m³/mês</td>
              <td style="text-align: center;">${dB.indicadores?.potencialEconomiaAguaM3 || 0} m³/mês</td>
              <td style="text-align: center;">${((dA.indicadores?.potencialEconomiaAguaM3 || 0) - (dB.indicadores?.potencialEconomiaAguaM3 || 0))} m³</td>
            </tr>
            <tr>
              <td>🚨 Total de Alertas Críticos Imediatos</td>
              <td style="text-align: center; font-weight: 800; color: ${(dA.pontosCriticos || []).length > 0 ? 'var(--danger-500)' : 'var(--primary-600)'};">${(dA.pontosCriticos || []).length}</td>
              <td style="text-align: center; font-weight: 800; color: ${(dB.pontosCriticos || []).length > 0 ? 'var(--danger-500)' : 'var(--primary-600)'};">${(dB.pontosCriticos || []).length}</td>
              <td style="text-align: center;">${(dA.pontosCriticos || []).length - (dB.pontosCriticos || []).length}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    // Renderiza o gráfico Radar Comparativo
    setTimeout(() => {
      const canvas = document.getElementById('chartCompareRadar');
      if (canvas && typeof Chart !== 'undefined') {
        if (this.chartCompare) this.chartCompare.destroy();
        const ctx = canvas.getContext('2d');
        this.chartCompare = new Chart(ctx, {
          type: 'radar',
          data: {
            labels: ['Riscos', 'Água', 'Microclima', 'Resíduos'],
            datasets: [
              {
                label: laudoA.escola?.nome || 'Inst 1',
                data: [
                  dA.dimensoes?.riscosDesastres?.score || 0,
                  dA.dimensoes?.consumoHidrico?.score || 0,
                  dA.dimensoes?.areasVerdes?.score || 0,
                  dA.dimensoes?.residuos?.score || 0
                ],
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderColor: '#10b981',
                borderWidth: 2,
                pointBackgroundColor: '#059669'
              },
              {
                label: laudoB.escola?.nome || 'Inst 2',
                data: [
                  dB.dimensoes?.riscosDesastres?.score || 0,
                  dB.dimensoes?.consumoHidrico?.score || 0,
                  dB.dimensoes?.areasVerdes?.score || 0,
                  dB.dimensoes?.residuos?.score || 0
                ],
                backgroundColor: 'rgba(14, 116, 144, 0.2)',
                borderColor: '#0e7490',
                borderWidth: 2,
                pointBackgroundColor: '#083344'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              r: {
                suggestedMin: 0,
                suggestedMax: 100,
                ticks: { display: false },
                pointLabels: { font: { family: 'Plus Jakarta Sans', size: 10, weight: '700' } }
              }
            },
            plugins: {
              legend: {
                position: 'bottom',
                labels: { boxWidth: 10, font: { size: 10, weight: '700' } }
              }
            }
          }
        });
      }
    }, 50);
  }

  _calcDelta(valA, valB) {
    const diff = valA - valB;
    if (diff > 0) return `<span style="color: var(--primary-600); font-weight: 800;">+${diff}%</span>`;
    if (diff < 0) return `<span style="color: var(--danger-600); font-weight: 800;">${diff}%</span>`;
    return `<span style="color: var(--neutral-500); font-weight: 700;">0% (Empate)</span>`;
  }

  open() {
    const m = document.getElementById('rankingModal');
    if (m) m.classList.add('open');
  }

  close() {
    const m = document.getElementById('rankingModal');
    if (m) m.classList.remove('open');
  }
}

// Disponibiliza no escopo global
window.RankingView = RankingView;
