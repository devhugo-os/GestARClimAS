/**
 * ============================================================================
 * GestARClimAS - ResultsView.js
 * View: Tela Final com Laudo Pericial Ampliado, 4 Gráficos Analíticos (Chart.js),
 * Matriz Técnica dos 16 Critérios e Plano de Ação ODS 13
 * ============================================================================
 */

class ResultsView {
  constructor() {
    this.container = document.getElementById('resultsContainer');
    this.chartRadar = null;
    this.chartBar = null;
    this.chartDoughnut = null;
    this.chartEvolution = null;
  }

  init() {
    this.container = document.getElementById('resultsContainer');
  }

  /**
   * Renderiza a tela de resultados completa com laudo, múltiplos gráficos e matriz técnica
   * @param {Object} data Objeto de diagnóstico
   */
  renderResults(data) {
    if (!this.container || !data) return;

    const { escola, diagnostico } = data;

    // 1. Preenche Cabeçalho Executivo da Escola
    document.getElementById('resSchoolTitle').textContent = escola.nome || 'Unidade Escolar';
    
    const ruaParte = escola.rua ? `${escola.rua}, ` : '';
    const bairroParte = escola.bairro ? `${escola.bairro} • ` : '';
    const localidadeStr = `${ruaParte}${bairroParte}${escola.cidade || 'Açailândia'} - ${escola.estado || 'MA'}${escola.cep ? ` (CEP: ${escola.cep})` : ''}`;
    document.getElementById('resSchoolLocation').textContent = localidadeStr;
    document.getElementById('resEvaluatorName').textContent = escola.avaliador || 'Comitê Escolar';
    document.getElementById('resSchoolShift').textContent = escola.turno || 'Matutino e Vespertino';
    document.getElementById('resDiagnosticDate').textContent = escola.data || new Date().toLocaleString('pt-BR');

    // 2. Score Geral e Gauge Circular
    const score = diagnostico.scoreGeral;
    document.getElementById('resScoreNumber').textContent = `${score}%`;

    const badge = document.getElementById('resClassificationBadge');
    badge.textContent = diagnostico.classificacao;
    badge.className = `classification-tag ${diagnostico.corBadge}`;

    const descEl = document.getElementById('resStatusDesc');
    if (descEl) descEl.textContent = diagnostico.descricaoStatus;

    // Animação do Círculo SVG do Gauge
    const circle = document.getElementById('gaugeCircle');
    if (circle) {
      const circumference = 2 * Math.PI * 70;
      circle.style.strokeDasharray = `${circumference}`;
      const offset = circumference - (score / 100) * circumference;
      circle.style.stroke = score >= 80 ? '#10b981' : (score >= 50 ? '#f59e0b' : '#ef4444');
      setTimeout(() => { circle.style.strokeDashoffset = offset; }, 80);
    }

    // 3. Indicadores de Impacto Ecológico Estimado
    const ind = diagnostico.indicadores || {};
    const elCarbono = document.getElementById('resCarbonoVal');
    const elAgua = document.getElementById('resAguaVal');
    const elMudas = document.getElementById('resMudasVal');
    const elProj = document.getElementById('resScoreProjetadoVal');

    if (elCarbono) elCarbono.textContent = `${ind.pegadaCarbonoEstimada || 80} kg CO₂/aluno`;
    if (elAgua) elAgua.textContent = `${ind.potencialEconomiaAguaM3 || 25} m³/mês`;
    if (elMudas) elMudas.textContent = `${ind.mudasRecomendadas || 15} mudas`;
    if (elProj) elProj.textContent = `${diagnostico.scoreProjetadoPosAcao || 90}%`;

    // 4. Renderização dos 4 Gráficos Chart.js
    this.renderCharts(diagnostico);

    // 5. Alertas Críticos & Riscos Imediatos
    const listCrit = document.getElementById('listCritical');
    listCrit.innerHTML = '';
    document.getElementById('countCritical').textContent = `${diagnostico.pontosCriticos.length} Alertas`;
    
    if (diagnostico.pontosCriticos.length === 0) {
      listCrit.innerHTML = `
        <div class="diag-item success">
          <span class="diag-item-icon">✅</span>
          <div><strong>Sem Riscos Críticos Imediatos:</strong> Nenhuma vulnerabilidade emergencial de perigo iminente foi identificada nas instalações inspecionadas.</div>
        </div>
      `;
    } else {
      diagnostico.pontosCriticos.forEach(alert => {
        listCrit.innerHTML += `
          <div class="diag-item critical">
            <span class="diag-item-icon">🚨</span>
            <div><strong>Alerta de Risco:</strong> ${alert}</div>
          </div>
        `;
      });
    }

    // 6. Pontos a Melhorar
    const listWarn = document.getElementById('listWarning');
    listWarn.innerHTML = '';
    document.getElementById('countWarning').textContent = `${diagnostico.pontosMelhorar.length} Itens`;
    
    if (diagnostico.pontosMelhorar.length === 0) {
      listWarn.innerHTML = `
        <div class="diag-item success">
          <span class="diag-item-icon">✨</span>
          <div>Todos os quesitos de infraestrutura e gestão operam em alto nível de eficiência sustentável.</div>
        </div>
      `;
    } else {
      diagnostico.pontosMelhorar.forEach(item => {
        listWarn.innerHTML += `
          <div class="diag-item warning">
            <span class="diag-item-icon">⚠️</span>
            <div>${item}</div>
          </div>
        `;
      });
    }

    // 7. Pontos Fortes
    const listSucc = document.getElementById('listSuccess');
    listSucc.innerHTML = '';
    document.getElementById('countSuccess').textContent = `${diagnostico.pontosFortes.length} Pontos`;
    
    if (diagnostico.pontosFortes.length === 0) {
      listSucc.innerHTML = `
        <div class="diag-item warning">
          <span class="diag-item-icon">ℹ️</span>
          <div>Inicie as intervenções prioritárias recomendadas para estabelecer as primeiras boas práticas escolares.</div>
        </div>
      `;
    } else {
      diagnostico.pontosFortes.forEach(item => {
        listSucc.innerHTML += `
          <div class="diag-item success">
            <span class="diag-item-icon">🌱</span>
            <div>${item}</div>
          </div>
        `;
      });
    }

    // 8. Matriz Técnica dos 16 Critérios Avaliados
    this.renderTechnicalMatrix(diagnostico.detalhamentoQuestoes || []);

    // 9. Plano de Ação Recomendado (ODS 13)
    const listAct = document.getElementById('listActions');
    listAct.innerHTML = '';
    
    if (diagnostico.recomendacoesAcao.length === 0) {
      listAct.innerHTML = `
        <div class="action-card">
          <div class="action-title">Manutenção Preventiva e Conservação Ativa</div>
          <div class="action-impact">A escola já opera em nível de Selo Verde. Mantenha os comitês escolares ativos!</div>
        </div>
      `;
    } else {
      diagnostico.recomendacoesAcao.forEach((rec, idx) => {
        listAct.innerHTML += `
          <div class="action-card">
            <div class="action-top">
              <span class="action-priority ${rec.prioridade}">${rec.textoPrioridade}</span>
              <span style="font-size: 0.75rem; color: var(--neutral-400); font-weight: 700;">${rec.pilar || `Ação #${idx + 1}`}</span>
            </div>
            <div class="action-title">${rec.titulo}</div>
            ${rec.descricao ? `<div class="action-desc">${rec.descricao}</div>` : ''}
            <div class="action-impact">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span><strong>Impacto Esperado:</strong> ${rec.impacto}</span>
            </div>
          </div>
        `;
      });
    }

    // Exibe o container e rola suavemente para o topo
    document.getElementById('stepperContainer').style.display = 'none';
    document.getElementById('diagnosticForm').style.display = 'none';
    this.container.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Renderiza os 4 gráficos analíticos interativos via Chart.js
   */
  renderCharts(diagnostico) {
    if (typeof Chart === 'undefined') return;

    const d = diagnostico.dimensoes;
    const labels = [
      'Riscos & Chuvas',
      'Eficiência Hídrica',
      'Áreas Verdes & Clima',
      'Resíduos & ODS 13'
    ];
    const scores = [
      d.riscosDesastres.score,
      d.consumoHidrico.score,
      d.areasVerdes.score,
      d.residuos.score
    ];

    // 1. Radar de Resiliência
    const canvasRadar = document.getElementById('chartResultRadar');
    if (canvasRadar) {
      if (this.chartRadar) this.chartRadar.destroy();
      const ctx = canvasRadar.getContext('2d');
      this.chartRadar = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Resiliência (%)',
            data: scores,
            backgroundColor: 'rgba(16, 185, 129, 0.25)',
            borderColor: '#059669',
            pointBackgroundColor: '#047857',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#059669',
            borderWidth: 2.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              angleLines: { color: 'rgba(203, 213, 225, 0.6)' },
              grid: { color: 'rgba(203, 213, 225, 0.6)' },
              pointLabels: {
                font: { family: 'Plus Jakarta Sans', size: 11, weight: '700' },
                color: '#334155'
              },
              suggestedMin: 0,
              suggestedMax: 100,
              ticks: {
                backdropColor: 'transparent',
                stepSize: 25,
                font: { size: 9 },
                callback: (v) => `${v}%`
              }
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    }

    // 2. Barra Horizontal por Pilar
    const canvasBar = document.getElementById('chartResultBar');
    if (canvasBar) {
      if (this.chartBar) this.chartBar.destroy();
      const ctx = canvasBar.getContext('2d');
      const cores = scores.map(s => s >= 80 ? '#10b981' : (s >= 50 ? '#f59e0b' : '#ef4444'));

      this.chartBar = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            data: scores,
            backgroundColor: cores,
            borderRadius: 6,
            barThickness: 18
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              beginAtZero: true,
              max: 100,
              grid: { color: 'rgba(226, 232, 240, 0.8)' },
              ticks: {
                font: { family: 'Plus Jakarta Sans', size: 10 },
                callback: (v) => `${v}%`
              }
            },
            y: {
              grid: { display: false },
              ticks: {
                font: { family: 'Plus Jakarta Sans', size: 11, weight: '700' },
                color: '#1e293b'
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: (ctx) => ` Desempenho: ${ctx.raw}%` }
            }
          }
        }
      });
    }

    // 3. Doughnut de Criticidade dos 16 Quesitos
    const canvasDoughnut = document.getElementById('chartResultDoughnut');
    if (canvasDoughnut) {
      if (this.chartDoughnut) this.chartDoughnut.destroy();
      const stats = diagnostico.estatisticasRespostas || { critico: 0, moderado: 0, excelente: 0 };
      const cCritico = Number(stats.critico) || 0;
      const cModerado = Number(stats.moderado) || 0;
      const cExcelente = Number(stats.excelente) || 0;

      const ctx = canvasDoughnut.getContext('2d');

      this.chartDoughnut = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Crítico (0 pts)', 'Moderado (5 pts)', 'Excelente (10 pts)'],
          datasets: [{
            data: [cCritico, cModerado, cExcelente],
            backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                font: { family: 'Plus Jakarta Sans', size: 10, weight: '700' },
                color: '#334155',
                generateLabels: (chart) => {
                  const data = chart.data;
                  return data.labels.map((label, i) => {
                    const val = data.datasets[0].data[i];
                    return {
                      text: `${label}: ${val} item(ns)`,
                      fillStyle: data.datasets[0].backgroundColor[i],
                      strokeStyle: '#fff',
                      lineWidth: 1,
                      hidden: false,
                      index: i
                    };
                  });
                }
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.raw} critério(s) (${Math.round((ctx.raw / 16) * 100)}%)`
              }
            }
          },
          cutout: '60%'
        }
      });
    }

    // 4. Comparativo de Evolução: Atual vs. Projetado Pós-Ação
    const canvasEvolution = document.getElementById('chartResultEvolution');
    if (canvasEvolution) {
      if (this.chartEvolution) this.chartEvolution.destroy();
      const ctx = canvasEvolution.getContext('2d');
      const scoreAtual = diagnostico.scoreGeral;
      const scoreProjetado = diagnostico.scoreProjetadoPosAcao || 90;

      this.chartEvolution = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Diagnóstico Atual', 'Projeção Pós-Intervenções'],
          datasets: [{
            label: 'Índice de Resiliência (%)',
            data: [scoreAtual, scoreProjetado],
            backgroundColor: [
              scoreAtual >= 80 ? '#10b981' : (scoreAtual >= 50 ? '#f59e0b' : '#ef4444'),
              '#059669'
            ],
            borderRadius: 8,
            barThickness: 32
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                font: { family: 'Plus Jakarta Sans', size: 10 },
                callback: (v) => `${v}%`
              }
            },
            x: {
              grid: { display: false },
              ticks: {
                font: { family: 'Plus Jakarta Sans', size: 11, weight: '700' },
                color: '#1e293b'
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: (ctx) => ` Resiliência: ${ctx.raw}%` }
            }
          }
        }
      });
    }
  }

  /**
   * Renderiza a Tabela / Matriz Técnica detalhada dos 16 critérios
   */
  renderTechnicalMatrix(detalhes) {
    const tableBody = document.getElementById('techMatrixTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    detalhes.forEach(item => {
      const tr = document.createElement('tr');
      const badgeCls = item.status === 'excelente' ? 'badge-excelente' : (item.status === 'moderado' ? 'badge-moderado' : 'badge-critico');
      
      tr.innerHTML = `
        <td style="font-weight: 800; color: var(--neutral-500); width: 40px; text-align: center;">#${item.num}</td>
        <td>
          <div style="font-weight: 700; color: var(--neutral-900); font-size: 0.875rem;">${item.titulo}</div>
          <div style="font-size: 0.75rem; color: var(--primary-700); font-weight: 600;">${item.pilar}</div>
        </td>
        <td style="text-align: center;">
          <span class="option-badge ${badgeCls}">${item.statusTexto}</span>
        </td>
        <td style="font-size: 0.825rem; color: var(--neutral-700);">${item.obs}</td>
        <td style="font-size: 0.825rem; color: var(--petrol-900); font-weight: 600;">${item.acao}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  hide() {
    if (this.container) this.container.classList.remove('active');
  }
}

// Disponibiliza no escopo global
window.ResultsView = ResultsView;
