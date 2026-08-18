/**
 * ============================================================================
 * GestARClimAS - ResultsView.js
 * View: Tela Final com Laudo Pericial Ampliado, 4 Gráficos Analíticos (Chart.js),
 * Painel de Alertas Diagnósticos, Matriz Técnica dos 16 Critérios e Plano de Ação ODS 13
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
   * Renderiza a tela de resultados completa com laudo executivo, múltiplos gráficos e matriz técnica
   * @param {Object} data Objeto de diagnóstico contendo { escola, diagnostico }
   */
  renderResults(data) {
    if (!data) return;
    this.container = document.getElementById('resultsContainer') || this.container;
    if (!this.container) return;

    let { escola = {}, diagnostico = {} } = data;

    // Auto-reidratação pericial completa: Se o laudo foi salvo de forma simplificada, recalcula a matriz dos 16 quesitos
    if (!diagnostico.detalhamentoQuestoes || !Array.isArray(diagnostico.detalhamentoQuestoes) || diagnostico.detalhamentoQuestoes.length === 0) {
      if (typeof DiagnosticModel !== 'undefined') {
        const model = new DiagnosticModel();
        const fullDiag = model.calcularDiagnostico(diagnostico.respostas || {}, escola);
        diagnostico = {
          ...fullDiag,
          ...diagnostico,
          detalhamentoQuestoes: fullDiag.detalhamentoQuestoes,
          recomendacoesAcao: fullDiag.recomendacoesAcao,
          pontosCriticos: fullDiag.pontosCriticos,
          pontosMelhorar: fullDiag.pontosMelhorar,
          pontosFortes: fullDiag.pontosFortes,
          indicadores: fullDiag.indicadores
        };
      }
    }

    // 1. Preenche Cabeçalho Executivo da Escola
    const elSchoolName = document.getElementById('repSchoolName');
    if (elSchoolName) elSchoolName.textContent = escola.nome || 'Instituição de Ensino';

    const ruaParte = escola.rua ? `${escola.rua}, ` : '';
    const bairroParte = escola.bairro ? `${escola.bairro} • ` : '';
    const localidadeStr = `${ruaParte}${bairroParte}${escola.cidade || 'Município'} - ${escola.estado || 'UF'}${escola.cep ? ` (CEP: ${escola.cep})` : ''}`;
    
    const elSchoolMeta = document.getElementById('repSchoolMeta');
    if (elSchoolMeta) {
      const dataFormatada = escola.data || new Date().toLocaleString('pt-BR');
      elSchoolMeta.innerHTML = `<img src="assets/icons/location.svg" class="icon-img-sm" alt="" /> ${localidadeStr} • <img src="assets/icons/calendar.svg" class="icon-img-sm" alt="" /> Emitido em ${dataFormatada}`;
    }

    // 2. Metadados do Laudo
    const elEvaluator = document.getElementById('repEvaluator');
    if (elEvaluator) elEvaluator.textContent = escola.avaliador || 'Comitê Escolar';

    const elShift = document.getElementById('repShift');
    if (elShift) elShift.textContent = escola.turno || 'Matutino e Vespertino';

    const elLocation = document.getElementById('repLocation');
    if (elLocation) elLocation.textContent = localidadeStr;

    const elClassification = document.getElementById('repClassification');
    if (elClassification) elClassification.textContent = diagnostico.classificacao || 'Resiliência Avaliada';

    // 3. Score Geral e Badge
    const score = diagnostico.scoreGeral !== undefined ? diagnostico.scoreGeral : 0;
    const elScoreGeral = document.getElementById('repScoreGeral');
    if (elScoreGeral) elScoreGeral.textContent = `${score}%`;

    const elScoreBadge = document.getElementById('repScoreBadge');
    if (elScoreBadge) {
      elScoreBadge.textContent = diagnostico.classificacao || 'Nível de Resiliência';
      elScoreBadge.className = `report-score-badge ${diagnostico.corBadge || ''}`;
      if (score >= 80) {
        elScoreBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
        elScoreBadge.style.color = '#10b981';
      } else if (score >= 50) {
        elScoreBadge.style.backgroundColor = 'rgba(245, 158, 11, 0.2)';
        elScoreBadge.style.color = '#f59e0b';
      } else {
        elScoreBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
        elScoreBadge.style.color = '#ef4444';
      }
    }

    // 4. Parecer Técnico Descritivo
    const elDesc = document.getElementById('repStatusDesc');
    if (elDesc) {
      elDesc.textContent = diagnostico.descricaoStatus || 'Diagnóstico ambiental emitido com base na ponderação pericial dos 16 critérios da matriz GestARClimAS.';
    }

    // 5. Alertas Críticos, Pontos a Melhorar e Fortalezas
    this.renderDiagnosticInsights(diagnostico);

    // 6. Indicadores de Impacto Ecológico Estimado
    const ind = diagnostico.indicadores || {};
    const elCarbon = document.getElementById('kpiCarbon');
    if (elCarbon) elCarbon.textContent = `${ind.pegadaCarbonoEstimada !== undefined ? ind.pegadaCarbonoEstimada : 80} kg CO₂`;

    const elWater = document.getElementById('kpiWater');
    if (elWater) elWater.textContent = `${ind.potencialEconomiaAguaM3 !== undefined ? ind.potencialEconomiaAguaM3 : 25} m³`;

    const elTrees = document.getElementById('kpiTrees');
    if (elTrees) elTrees.textContent = `${ind.mudasRecomendadas !== undefined ? ind.mudasRecomendadas : 15} mudas`;

    const elPotential = document.getElementById('kpiPotential');
    if (elPotential) {
      const scoreProjetado = diagnostico.scoreProjetadoPosAcao || 90;
      const ganho = Math.max(0, scoreProjetado - score);
      elPotential.textContent = `+${ganho} pts (${scoreProjetado}%)`;
    }

    // 7. Renderização dos 4 Gráficos Chart.js
    this.renderCharts(diagnostico);

    // 8. Matriz Técnica dos 16 Critérios Avaliados
    this.renderTechnicalMatrix(diagnostico.detalhamentoQuestoes || []);

    // 9. Plano de Ação Estratégico ODS 13
    this.renderActionPlan(diagnostico.recomendacoesAcao || []);

    // 10. Oculta o formulário/stepper e exibe o container do Laudo
    const stepper = document.getElementById('stepperContainer');
    const form = document.getElementById('diagnosticForm');
    if (stepper) stepper.style.display = 'none';
    if (form) form.style.display = 'none';

    this.container.style.display = 'block';
    this.container.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Renderiza os cards estruturados de Alertas Críticos, Pontos de Atenção e Fortalezas
   */
  renderDiagnosticInsights(diagnostico) {
    const listCrit = document.getElementById('listCritical');
    const listWarn = document.getElementById('listWarning');
    const listSucc = document.getElementById('listSuccess');
    const countCrit = document.getElementById('countCritical');
    const countWarn = document.getElementById('countWarning');
    const countSucc = document.getElementById('countSuccess');

    let criticos = Array.isArray(diagnostico.pontosCriticos) ? [...diagnostico.pontosCriticos] : [];
    let avisos = Array.isArray(diagnostico.pontosMelhorar) ? [...diagnostico.pontosMelhorar] : [];
    let fortes = Array.isArray(diagnostico.pontosFortes) ? [...diagnostico.pontosFortes] : [];

    // Fallback pericial: assegura que qualquer quesito respondido como 'critico' seja listado
    if (diagnostico.detalhamentoQuestoes && Array.isArray(diagnostico.detalhamentoQuestoes)) {
      diagnostico.detalhamentoQuestoes.forEach(item => {
        if (item.status === 'critico') {
          const textoCurto = `${item.titulo}: ${item.obs || item.acao || 'Vulnerabilidade estrutural crítica detectada.'}`;
          const jaExiste = criticos.some(c => c.toLowerCase().includes((item.titulo || '').toLowerCase().substring(0, 15)));
          if (!jaExiste) {
            criticos.push(textoCurto);
          }
        }
      });
    }

    if (countCrit) countCrit.textContent = `${criticos.length} ${criticos.length === 1 ? 'Alerta' : 'Alertas'}`;
    if (countWarn) countWarn.textContent = `${avisos.length} ${avisos.length === 1 ? 'Item' : 'Itens'}`;
    if (countSucc) countSucc.textContent = `${fortes.length} ${fortes.length === 1 ? 'Ponto' : 'Pontos'}`;

    // 1. Alertas Críticos
    if (listCrit) {
      listCrit.innerHTML = '';
      if (criticos.length === 0) {
        listCrit.innerHTML = `
          <div class="diag-item-card safe">
            <span class="diag-item-icon"><img src="assets/icons/check.svg" class="icon-img" alt="" /></span>
            <div class="diag-item-text">
              <strong>Sem Riscos Críticos Imediatos</strong>
              <p>Nenhuma vulnerabilidade emergencial ou risco físico iminente foi detectado nas instalações inspecionadas.</p>
            </div>
          </div>
        `;
      } else {
        criticos.forEach(alert => {
          listCrit.innerHTML += `
            <div class="diag-item-card critical">
              <span class="diag-item-icon"><img src="assets/icons/alert.svg" class="icon-img" alt="" /></span>
              <div class="diag-item-text">
                <strong>Alerta de Risco Climático / Físico</strong>
                <p>${alert}</p>
              </div>
            </div>
          `;
        });
      }
    }

    // 2. Pontos a Melhorar
    if (listWarn) {
      listWarn.innerHTML = '';
      if (avisos.length === 0) {
        listWarn.innerHTML = `
          <div class="diag-item-card safe">
            <span class="diag-item-icon"><img src="assets/icons/check.svg" class="icon-img" alt="" /></span>
            <div class="diag-item-text">
              <strong>Eficiência Plena</strong>
              <p>Todos os setores operam em alto padrão técnico de conservação e sustentabilidade.</p>
            </div>
          </div>
        `;
      } else {
        avisos.forEach(item => {
          listWarn.innerHTML += `
            <div class="diag-item-card warning">
              <span class="diag-item-icon"><img src="assets/icons/alert.svg" class="icon-img" alt="" /></span>
              <div class="diag-item-text">
                <strong>Oportunidade de Melhoria</strong>
                <p>${item}</p>
              </div>
            </div>
          `;
        });
      }
    }

    // 3. Pontos Fortes
    if (listSucc) {
      listSucc.innerHTML = '';
      if (fortes.length === 0) {
        listSucc.innerHTML = `
          <div class="diag-item-card info">
            <span class="diag-item-icon"><img src="assets/icons/info.svg" class="icon-img" alt="" /></span>
            <div class="diag-item-text">
              <strong>Início das Boas Práticas</strong>
              <p>Inicie a execução das ações prioritárias para consolidar as primeiras fortalezas sustentáveis da escola.</p>
            </div>
          </div>
        `;
      } else {
        fortes.forEach(item => {
          listSucc.innerHTML += `
            <div class="diag-item-card success">
              <span class="diag-item-icon"><img src="assets/icons/plant.svg" class="icon-img" alt="" /></span>
              <div class="diag-item-text">
                <strong>Boa Prática Consolidada</strong>
                <p>${item}</p>
              </div>
            </div>
          `;
        });
      }
    }
  }

  /**
   * Renderiza os 4 gráficos analíticos interativos via Chart.js
   */
  renderCharts(diagnostico) {
    if (typeof Chart === 'undefined' || !diagnostico) return;

    const d = diagnostico.dimensoes || {
      riscosDesastres: { score: 50 },
      consumoHidrico: { score: 50 },
      areasVerdes: { score: 50 },
      residuos: { score: 50 }
    };

    const s0 = d.riscosDesastres?.score || 0;
    const s1 = d.consumoHidrico?.score || 0;
    const s2 = d.areasVerdes?.score || 0;
    const s3 = d.residuos?.score || 0;

    const labels = [
      '1. Riscos & Chuvas',
      '2. Eficiência Hídrica',
      '3. Áreas Verdes & Clima',
      '4. Resíduos & ODS 13'
    ];
    const radarLabels = [
      ['1. Riscos & Chuvas', `${s0}%`],
      ['2. Eficiência Hídrica', `${s1}%`],
      ['3. Áreas Verdes & Clima', `${s2}%`],
      ['4. Resíduos & ODS 13', `${s3}%`]
    ];
    const scores = [s0, s1, s2, s3];

    // 1. Radar dos 4 Pilares da Resiliência (Transparência Máxima & Visualização Cristalina)
    const canvasRadar = document.getElementById('chartResultRadar');
    if (canvasRadar) {
      if (this.chartRadar) this.chartRadar.destroy();
      const ctx = canvasRadar.getContext('2d');
      this.chartRadar = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: radarLabels,
          datasets: [{
            label: 'Resiliência Alcançada',
            data: scores,
            backgroundColor: 'rgba(16, 185, 129, 0.24)',
            borderColor: '#059669',
            borderWidth: 3,
            pointBackgroundColor: '#047857',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2.5,
            pointRadius: 6,
            pointHoverRadius: 9,
            pointHoverBackgroundColor: '#10b981',
            pointHoverBorderColor: '#ffffff',
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              min: 0,
              max: 100,
              angleLines: {
                color: 'rgba(148, 163, 184, 0.4)',
                lineWidth: 1.5
              },
              grid: {
                color: 'rgba(148, 163, 184, 0.3)',
                lineWidth: 1
              },
              pointLabels: {
                font: { family: "'Plus Jakarta Sans', sans-serif", size: 11.5, weight: '800' },
                color: '#0f172a',
                padding: 6
              },
              ticks: {
                stepSize: 25,
                display: true,
                font: { family: "'Plus Jakarta Sans', sans-serif", size: 9, weight: '700' },
                color: '#475569',
                backdropColor: 'rgba(255, 255, 255, 0.85)',
                backdropPadding: 3,
                callback: (v) => `${v}%`
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.94)',
              titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '800' },
              bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                title: (items) => {
                  const item = items[0];
                  return Array.isArray(item.label) ? item.label[0] : item.label;
                },
                label: (ctx) => ` Resiliência do Pilar: ${ctx.raw}%`
              }
            }
          }
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
            barThickness: 20
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
      const scoreAtual = diagnostico.scoreGeral || 0;
      const scoreProjetado = diagnostico.scoreProjetadoPosAcao || 90;

      this.chartEvolution = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Diagnóstico Atual', 'Projeção Pós-Ação'],
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
      const pontosNum = item.status === 'excelente' ? '10 pts' : (item.status === 'moderado' ? '5 pts' : '0 pts');
      
      tr.innerHTML = `
        <td style="font-weight: 800; color: var(--neutral-500); width: 55px; text-align: center;">Q${item.num}</td>
        <td>
          <div style="font-weight: 700; color: var(--neutral-900); font-size: 0.875rem;">${item.titulo}</div>
          <div style="font-size: 0.75rem; color: var(--primary-700); font-weight: 600; margin-top: 2px;">${item.pilar}</div>
        </td>
        <td style="text-align: center; width: 140px;">
          <span class="option-badge ${badgeCls}">${item.statusTexto}</span>
        </td>
        <td style="text-align: center; font-weight: 800; font-size: 0.85rem; color: var(--neutral-800); width: 85px;">
          ${pontosNum}
        </td>
        <td style="font-size: 0.825rem; color: var(--petrol-900); font-weight: 600; line-height: 1.4;">${item.acao || item.obs || '-'}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  /**
   * Renderiza os cards do Plano de Ação Estratégico
   */
  renderActionPlan(recomendacoes) {
    const container = document.getElementById('actionPlanTimeline');
    if (!container) return;

    container.innerHTML = '';
    if (!recomendacoes || recomendacoes.length === 0) {
      container.innerHTML = `
        <div class="action-card">
          <div class="action-title">Manutenção Preventiva e Conservação Ativa</div>
          <div class="action-impact">A instituição opera em nível exemplar de Resiliência Climática (Selo Verde). Mantenha os comitês escolares e manutenções preventivas ativas!</div>
        </div>
      `;
      return;
    }

    recomendacoes.forEach((rec, idx) => {
      const card = document.createElement('div');
      card.className = 'action-card';
      card.innerHTML = `
        <div class="action-top">
          <span class="action-priority ${rec.prioridade || 'prio-alta'}">${rec.textoPrioridade || 'Prioridade Alta'}</span>
          <span style="font-size: 0.75rem; color: var(--neutral-500); font-weight: 700;">${rec.pilar || `Ação #${idx + 1}`}</span>
        </div>
        <div class="action-title">${rec.titulo}</div>
        ${rec.descricao ? `<div class="action-desc">${rec.descricao}</div>` : ''}
        <div class="action-impact">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span><strong>Impacto Esperado:</strong> ${rec.impacto || 'Melhoria na resiliência escolar'}</span>
        </div>
      `;
      container.appendChild(card);
    });
  }

  hide() {
    this.container = document.getElementById('resultsContainer') || this.container;
    if (this.container) {
      this.container.style.display = 'none';
      this.container.classList.remove('active');
    }
  }

  hide() {
    this.container = document.getElementById('resultsContainer') || this.container;
    if (this.container) {
      this.container.style.display = 'none';
      this.container.classList.remove('active');
    }
  }
}

// Disponibiliza no escopo global
window.ResultsView = ResultsView;
