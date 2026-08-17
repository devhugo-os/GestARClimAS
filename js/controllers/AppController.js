/**
 * ============================================================================
 * GestARClimAS - AppController.js
 * Controller Principal: Orquestra Models, Views, Detecção de Alterações,
 * Histórico Local em Pastas, Ranking de Escolas, Comparador e Edição Rápida
 * ============================================================================
 */

class AppController {
  constructor() {
    this.diagnosticModel = new DiagnosticModel();
    this.formView = new FormView();
    this.resultsView = new ResultsView();
    this.rankingView = new RankingView();
    this.storageKey = 'gestarclimas_user_diagnostics';
    this.ultimoDiagnostico = null;
    this.snapshotOriginal = null;
    this.isEditing = false;
  }

  async init() {
    window.gestarclimasApp = this;
    // 1. Vincula todos os eventos de cliques e modais IMEDIATAMENTE no primeiro frame
    this.bindEvents();

    // 2. Inicializa o formulário e localização em background
    try {
      await this.formView.init();
    } catch (e) {
      console.warn('[GestARClimAS] Inicialização do formulário:', e);
    }

    console.log('[GestARClimAS] Aplicação inicializada com sucesso.');
  }

  abrirRanking() {
    try {
      const escolas = this.obterEscolasAgrupadas();
      const historico = this.obterHistorico();
      this.rankingView.renderRanking(escolas, historico);
      this.rankingView.open();
    } catch (e) {
      console.error('[GestARClimAS] Erro ao abrir ranking:', e);
      const m = document.getElementById('rankingModal');
      if (m) m.classList.add('open');
    }
  }

  abrirHistorico() {
    try {
      this.renderHistoryModal();
      const modalHist = document.getElementById('historyModal');
      if (modalHist) modalHist.classList.add('open');
    } catch (e) {
      console.error('[GestARClimAS] Erro ao abrir histórico:', e);
      const m = document.getElementById('historyModal');
      if (m) m.classList.add('open');
    }
  }

  bindEvents() {
    // Botão Iniciar / Próxima Etapa
    const btnNext = document.getElementById('btnNextStep');
    if (btnNext) btnNext.addEventListener('click', () => this.avancarEtapa());

    // Submissão Final do Diagnóstico
    const btnFinish = document.getElementById('btnFinishDiagnostic');
    if (btnFinish) btnFinish.addEventListener('click', () => this.processarDiagnostico());

    // Botões de Ação na Tela de Laudo / Resultados
    const btnEdit = document.getElementById('btnEditResponses');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => this.iniciarRevisaoRespostas());
    }

    const btnNew = document.getElementById('btnNewDiagnostic');
    if (btnNew) {
      btnNew.addEventListener('click', () => {
        if (confirm('Deseja iniciar um novo diagnóstico ambiental escolar do zero?')) {
          this.ultimoDiagnostico = null;
          this.snapshotOriginal = null;
          this.isEditing = false;
          this.formView.resetForm();
        }
      });
    }

    const btnExportJSON = document.getElementById('btnExportSingleJSON');
    if (btnExportJSON) {
      btnExportJSON.addEventListener('click', () => this.exportarJSON());
    }

    // Modal de Edição Rápida dos Dados da Escola
    const btnQuickEdit = document.getElementById('btnQuickEditSchool');
    const modalQuickEdit = document.getElementById('quickEditSchoolModal');
    const btnCloseQuick = document.getElementById('btnCloseQuickEdit');
    const btnCancelQuick = document.getElementById('btnCancelQuickEdit');
    const btnSaveQuick = document.getElementById('btnSaveQuickEdit');

    if (btnQuickEdit) {
      btnQuickEdit.addEventListener('click', () => this.abrirModalEdicaoRapida());
    }

    if (btnCloseQuick) {
      btnCloseQuick.addEventListener('click', () => modalQuickEdit?.classList.remove('open'));
    }

    if (btnCancelQuick) {
      btnCancelQuick.addEventListener('click', () => modalQuickEdit?.classList.remove('open'));
    }

    if (btnSaveQuick) {
      btnSaveQuick.addEventListener('click', () => this.salvarEdicaoRapida());
    }

    if (modalQuickEdit) {
      modalQuickEdit.addEventListener('click', (e) => {
        if (e.target === modalQuickEdit) modalQuickEdit.classList.remove('open');
      });
    }

    // Modal de Histórico em Pastas
    const btnOpenHist = document.getElementById('btnOpenHistory');
    const btnCloseHist = document.getElementById('btnCloseHistory');
    const btnClearAllHist = document.getElementById('btnClearAllHistory');
    const modalHist = document.getElementById('historyModal');

    if (btnOpenHist) {
      btnOpenHist.addEventListener('click', (e) => {
        e.preventDefault();
        this.abrirHistorico();
      });
    }

    if (btnCloseHist) {
      btnCloseHist.addEventListener('click', () => {
        modalHist?.classList.remove('open');
      });
    }

    if (btnClearAllHist) {
      btnClearAllHist.addEventListener('click', () => this.limparTodoHistorico());
    }

    if (modalHist) {
      modalHist.addEventListener('click', (e) => {
        if (e.target === modalHist) modalHist.classList.remove('open');
      });
    }

    // Modal de Aviso de Informações Pendentes
    this.setupPendingModalEvents();

    // Modal de Ranking & Comparador de Laudos
    const btnOpenRanking = document.getElementById('btnOpenRanking');
    const btnCloseRanking = document.getElementById('btnCloseRanking');
    const modalRanking = document.getElementById('rankingModal');

    if (btnOpenRanking) {
      btnOpenRanking.addEventListener('click', (e) => {
        e.preventDefault();
        this.abrirRanking();
      });
    }

    if (btnCloseRanking) {
      btnCloseRanking.addEventListener('click', () => {
        this.rankingView.close();
      });
    }

    if (modalRanking) {
      modalRanking.addEventListener('click', (e) => {
        if (e.target === modalRanking) this.rankingView.close();
      });
    }

    const selectA = document.getElementById('compareSelectA');
    const selectB = document.getElementById('compareSelectB');
    if (selectA) {
      selectA.addEventListener('change', () => {
        this.rankingView.compararLaudos(this.obterHistorico());
      });
    }
    if (selectB) {
      selectB.addEventListener('change', () => {
        this.rankingView.compararLaudos(this.obterHistorico());
      });
    }
  }

  setupPendingModalEvents() {
    const modal = document.getElementById('pendingFieldsModal');
    const btnClose = document.getElementById('btnClosePendingModal');
    const btnOk = document.getElementById('btnOkPendingModal');

    const fechar = () => {
      if (modal) modal.classList.remove('open');
    };

    if (btnClose) btnClose.addEventListener('click', fechar);
    if (btnOk) btnOk.addEventListener('click', fechar);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) fechar();
      });
    }
  }

  abrirModalEdicaoRapida() {
    if (!this.ultimoDiagnostico) return;

    const modal = document.getElementById('quickEditSchoolModal');
    const inputNome = document.getElementById('qeSchoolName');
    const inputAval = document.getElementById('qeEvaluatorName');
    const selectShift = document.getElementById('qeSchoolShift');
    const inputBairro = document.getElementById('qeSchoolNeighborhood');
    const inputRua = document.getElementById('qeSchoolStreet');

    if (inputNome) inputNome.value = this.ultimoDiagnostico.escola.nome || '';
    if (inputAval) inputAval.value = this.ultimoDiagnostico.escola.avaliador || '';
    if (selectShift) selectShift.value = this.ultimoDiagnostico.escola.turno || 'Matutino e Vespertino';
    if (inputBairro) inputBairro.value = this.ultimoDiagnostico.escola.bairro || '';
    if (inputRua) inputRua.value = this.ultimoDiagnostico.escola.rua || '';

    if (modal) modal.classList.add('open');
  }

  salvarEdicaoRapida() {
    if (!this.ultimoDiagnostico) return;

    const inputNome = document.getElementById('qeSchoolName');
    const inputAval = document.getElementById('qeEvaluatorName');
    const selectShift = document.getElementById('qeSchoolShift');
    const inputBairro = document.getElementById('qeSchoolNeighborhood');
    const inputRua = document.getElementById('qeSchoolStreet');

    const novoNome = (inputNome?.value || '').trim();
    const novoAval = (inputAval?.value || '').trim();
    const novoShift = selectShift?.value || this.ultimoDiagnostico.escola.turno;
    const novoBairro = (inputBairro?.value || '').trim() || this.ultimoDiagnostico.escola.bairro;
    const novaRua = (inputRua?.value || '').trim() || this.ultimoDiagnostico.escola.rua;

    if (!novoNome || !novoAval) {
      this.showToast('Por favor, preencha o nome da escola e do avaliador.', 'error');
      return;
    }

    this.ultimoDiagnostico.escola.nome = novoNome;
    this.ultimoDiagnostico.escola.avaliador = novoAval;
    this.ultimoDiagnostico.escola.turno = novoShift;
    this.ultimoDiagnostico.escola.bairro = novoBairro;
    this.ultimoDiagnostico.escola.rua = novaRua;
    this.ultimoDiagnostico.escola.dataAtualizacao = new Date().toLocaleString('pt-BR');
    this.ultimoDiagnostico.schoolKey = `${novoNome}_${this.ultimoDiagnostico.escola.cidade}_${this.ultimoDiagnostico.escola.estado}`.toLowerCase().replace(/\s+/g, '_');

    this.atualizarNoHistorico(this.ultimoDiagnostico);
    this.resultsView.renderResults(this.ultimoDiagnostico);

    const modal = document.getElementById('quickEditSchoolModal');
    if (modal) modal.classList.remove('open');

    this.showToast('Informações da instituição atualizadas no laudo!', 'success');
  }

  exibirAvisoPendencias(titulo, mensagem, campos) {
    const modal = document.getElementById('pendingFieldsModal');
    const containerLista = document.getElementById('pendingFieldsList');

    if (modal && containerLista) {
      containerLista.innerHTML = campos.map((c, i) => `<div style="margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.5rem;"><span style="color: #dc2626; font-weight: 800;">${i + 1}. ❌</span> <span>${c}</span></div>`).join('');
      modal.classList.add('open');
    } else {
      this.showToast(`Informações pendentes: ${campos.join(', ')}`, 'error');
    }
  }

  avancarEtapa() {
    const validacao = this.formView.validateStep(this.formView.currentStep);
    if (!validacao.isValid) {
      this.exibirAvisoPendencias(
        'Informações Pendentes',
        'Por favor, preencha os campos obrigatórios para avançar:',
        validacao.missingFields
      );
      return;
    }

    if (this.formView.currentStep < this.formView.totalSteps - 1) {
      this.formView.goToStep(this.formView.currentStep + 1);
    }
  }

  voltarEtapa() {
    if (this.formView.currentStep > 0) {
      this.formView.goToStep(this.formView.currentStep - 1);
    }
  }

  iniciarRevisaoRespostas() {
    if (!this.ultimoDiagnostico) return;

    this.isEditing = true;
    this.snapshotOriginal = JSON.stringify({
      escola: {
        nome: this.ultimoDiagnostico.escola.nome,
        estado: this.ultimoDiagnostico.escola.estado,
        cidade: this.ultimoDiagnostico.escola.cidade,
        bairro: this.ultimoDiagnostico.escola.bairro,
        rua: this.ultimoDiagnostico.escola.rua,
        avaliador: this.ultimoDiagnostico.escola.avaliador,
        turno: this.ultimoDiagnostico.escola.turno
      },
      respostas: this.ultimoDiagnostico.respostas
    });

    this.formView.setFormData(this.ultimoDiagnostico);
    this.resultsView.hide();
    document.getElementById('stepperContainer').style.display = 'block';
    document.getElementById('diagnosticForm').style.display = 'block';
    this.formView.goToStep(1);
    this.showToast('Modo de revisão ativado. Altere as respostas necessárias e conclua o diagnóstico.', 'info');
  }

  async processarDiagnostico() {
    if (!this.formView.validateStep(this.formView.currentStep)) {
      this.showToast('Por favor, responda a todas as perguntas desta etapa antes de finalizar.', 'error');
      return;
    }

    const formData = this.formView.getFormData();
    const diagnostico = this.diagnosticModel.calcularDiagnostico(formData.respostas);

    const schoolKey = `${formData.escola.nome}_${formData.escola.cidade}_${formData.escola.estado}`.toLowerCase().replace(/\s+/g, '_');

    if (this.isEditing && this.ultimoDiagnostico) {
      const snapshotAtual = JSON.stringify({
        escola: {
          nome: formData.escola.nome,
          estado: formData.escola.estado,
          cidade: formData.escola.cidade,
          bairro: formData.escola.bairro,
          rua: formData.escola.rua,
          avaliador: formData.escola.avaliador,
          turno: formData.escola.turno
        },
        respostas: formData.respostas
      });

      if (this.snapshotOriginal === snapshotAtual) {
        this.isEditing = false;
        this.resultsView.renderResults(this.ultimoDiagnostico);
        this.showToast('Nenhuma resposta foi alterada. Laudo mantido inalterado.', 'info');
        return;
      }

      this.ultimoDiagnostico.escola = formData.escola;
      this.ultimoDiagnostico.respostas = formData.respostas;
      this.ultimoDiagnostico.diagnostico = diagnostico;
      this.ultimoDiagnostico.schoolKey = schoolKey;
      this.ultimoDiagnostico.escola.dataAtualizacao = new Date().toLocaleString('pt-BR');
      
      this.atualizarNoHistorico(this.ultimoDiagnostico);
      this.isEditing = false;
      this.resultsView.renderResults(this.ultimoDiagnostico);
      this.showToast('Laudo atualizado com sucesso!', 'success');
    } else {
      const historico = this.obterHistorico();
      const laudoExistenteIdentico = historico.find(h => {
        const k = h.schoolKey || `${h.escola.nome}_${h.escola.cidade}_${h.escola.estado}`.toLowerCase().replace(/\s+/g, '_');
        return k === schoolKey && JSON.stringify(h.respostas) === JSON.stringify(formData.respostas);
      });

      if (laudoExistenteIdentico) {
        this.ultimoDiagnostico = laudoExistenteIdentico;
        this.resultsView.renderResults(laudoExistenteIdentico);
        this.showToast('Laudo idêntico já cadastrado na pasta desta escola.', 'info');
        return;
      }

      this.ultimoDiagnostico = {
        id: `DIAG_${Date.now()}`,
        schoolKey,
        ...formData,
        diagnostico
      };

      this.salvarNoHistorico(this.ultimoDiagnostico);
      this.formView.setupSchoolDatabaseSelector();
      this.resultsView.renderResults(this.ultimoDiagnostico);
      this.showToast('Novo laudo emitido e organizado na pasta da escola!', 'success');
    }
  }

  obterHistorico() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Agrupa os laudos salvos por Pasta de Escola
   */
  obterEscolasAgrupadas() {
    const historico = this.obterHistorico();
    const grupos = {};

    historico.forEach(item => {
      if (!item) return;
      const esc = item.escola || {};
      const nome = (esc.nome || 'Escola sem Nome').trim();
      const cidade = (esc.cidade || 'Açailândia').trim();
      const estado = (esc.estado || 'MA').trim();
      const key = `${nome}___${cidade}___${estado}`.toLowerCase();

      if (!grupos[key]) {
        grupos[key] = {
          key,
          nome,
          cidade,
          estado,
          bairro: esc.bairro || 'Centro',
          rua: esc.rua || '',
          laudos: []
        };
      }
      grupos[key].laudos.push(item);
    });

    const lista = Object.values(grupos);
    lista.forEach(g => {
      g.laudos.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
      g.ultimoLaudo = g.laudos[0] || null;
    });

    return lista;
  }

  salvarNoHistorico(item) {
    try {
      let historico = this.obterHistorico();
      historico.unshift(item);
      if (historico.length > 100) historico = historico.slice(0, 100);
      localStorage.setItem(this.storageKey, JSON.stringify(historico));
    } catch (e) {
      console.warn('Erro ao gravar no histórico:', e);
    }
  }

  atualizarNoHistorico(itemAtualizado) {
    try {
      let historico = this.obterHistorico();
      const idx = historico.findIndex(h => h.id === itemAtualizado.id);
      if (idx !== -1) {
        historico[idx] = itemAtualizado;
      } else {
        historico.unshift(itemAtualizado);
      }
      localStorage.setItem(this.storageKey, JSON.stringify(historico));
    } catch (e) {
      console.warn('Erro ao atualizar histórico:', e);
    }
  }

  removerDoHistorico(id) {
    if (!confirm('Deseja excluir este laudo pericial?')) return;

    try {
      let historico = this.obterHistorico();
      historico = historico.filter(h => h.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(historico));
      this.formView.setupSchoolDatabaseSelector();
      this.renderHistoryModal();
      this.showToast('Laudo excluído com sucesso.', 'info');
    } catch (e) {
      console.warn('Erro ao remover laudo:', e);
    }
  }

  excluirPastaEscola(schoolKey) {
    if (!confirm('Deseja EXCLUIR A PASTA COMPLETA e todos os laudos vinculados a esta escola?')) return;

    try {
      let historico = this.obterHistorico();
      historico = historico.filter(h => {
        const k = `${h.escola?.nome}___${h.escola?.cidade}___${h.escola?.estado}`.toLowerCase();
        return k !== schoolKey;
      });
      localStorage.setItem(this.storageKey, JSON.stringify(historico));
      this.formView.setupSchoolDatabaseSelector();
      this.renderHistoryModal();
      this.showToast('Pasta da escola e seus laudos foram excluídos.', 'success');
    } catch (e) {
      console.warn('Erro ao excluir pasta da escola:', e);
    }
  }

  limparTodoHistorico() {
    const historico = this.obterHistorico();
    if (historico.length === 0) {
      this.showToast('O histórico já está vazio.', 'info');
      return;
    }

    if (confirm(`Tem certeza que deseja APAGAR TODOS os ${historico.length} laudos gravados em todas as pastas?`)) {
      localStorage.removeItem(this.storageKey);
      this.formView.setupSchoolDatabaseSelector();
      this.renderHistoryModal();
      this.showToast('Histórico completamente limpo.', 'success');
    }
  }

  /**
   * Renderiza o Modal de Histórico Organizado em Pastas de Escolas (Accordion)
   */
  renderHistoryModal() {
    const container = document.getElementById('historyListContainer');
    if (!container) return;

    const pastas = this.obterEscolasAgrupadas();
    if (pastas.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: var(--neutral-500);">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem;">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
          </svg>
          <p>Nenhuma pasta de escola cadastrada no histórico.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    pastas.forEach((pasta, index) => {
      const scoreUltimo = pasta.ultimoLaudo?.diagnostico?.scoreGeral || 0;
      const corBadge = scoreUltimo >= 80 ? 'badge-excelente' : (scoreUltimo >= 50 ? 'badge-moderado' : 'badge-critico');

      const cardPasta = document.createElement('div');
      cardPasta.className = 'school-folder-card';
      cardPasta.innerHTML = `
        <div class="folder-card-header" onclick="this.parentElement.classList.toggle('expanded')">
          <div class="folder-header-title">
            <span class="folder-icon">📁</span>
            <div>
              <h4>${pasta.nome}</h4>
              <p>${pasta.cidade} - ${pasta.estado} (${pasta.bairro || 'Centro'}) • ${pasta.laudos.length} laudo(s) registrado(s)</p>
            </div>
          </div>
          <div class="folder-header-meta">
            <span class="table-score-pill ${corBadge}">${scoreUltimo}%</span>
            <button class="btn-folder-delete" onclick="event.stopPropagation(); gestarclimasApp.excluirPastaEscola('${pasta.key}')" title="Excluir toda a pasta e laudos">
              🗑️ Excluir Pasta
            </button>
            <span class="folder-chevron">▼</span>
          </div>
        </div>

        <div class="folder-card-body">
          <div class="folder-laudos-list">
            ${pasta.laudos.map((l, lIdx) => `
              <div class="folder-laudo-item">
                <div class="folder-laudo-info">
                  <span class="laudo-num">#${lIdx + 1}</span>
                  <div>
                    <div style="font-weight: 700; color: var(--neutral-800); font-size: 0.875rem;">
                      ${l.diagnostico?.classificacao || 'Laudo Ambiental'} • ${l.diagnostico?.scoreGeral || 0}%
                    </div>
                    <div style="font-size: 0.75rem; color: var(--neutral-500);">
                      Emitido em: ${l.escola?.data || '-'} • Avaliador: <strong>${l.escola?.avaliador || 'Não informado'}</strong> • Turno: ${l.escola?.turno || '-'}
                    </div>
                  </div>
                </div>
                <div class="folder-laudo-actions">
                  <button class="btn btn-outline btn-sm" onclick="gestarclimasApp.carregarDoHistorico('${l.id}')">
                    Abrir Laudo
                  </button>
                  <button class="btn-delete-item" onclick="gestarclimasApp.removerDoHistorico('${l.id}')" title="Excluir este laudo">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      if (index === 0) cardPasta.classList.add('expanded');
      container.appendChild(cardPasta);
    });
  }

  carregarDoHistorico(id) {
    const historico = this.obterHistorico();
    const item = historico.find(h => h.id === id);
    if (item) {
      this.ultimoDiagnostico = item;
      document.getElementById('historyModal')?.classList.remove('open');
      this.resultsView.renderResults(item);
      this.showToast(`Laudo de "${item.escola.nome}" aberto!`, 'success');
    }
  }

  abrirLaudoDoRanking(id) {
    const historico = this.obterHistorico();
    const item = historico.find(h => h.id === id);
    if (item) {
      this.ultimoDiagnostico = item;
      this.rankingView.close();
      this.resultsView.renderResults(item);
      this.showToast(`Laudo de "${item.escola.nome}" aberto!`, 'success');
    }
  }

  exportarJSON() {
    if (!this.ultimoDiagnostico) return;
    const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.ultimoDiagnostico, null, 2));
    const a = document.createElement('a');
    a.href = str;
    a.download = `Laudo_GestARClimAS_${(this.ultimoDiagnostico.escola.nome || 'Escola').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    a.remove();
    this.showToast('Arquivo JSON exportado com sucesso!', 'success');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Disponibiliza no escopo global
window.AppController = AppController;
