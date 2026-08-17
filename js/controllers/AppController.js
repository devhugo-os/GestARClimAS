/**
 * ============================================================================
 * GestARClimAS - AppController.js
 * Controller Principal: Orquestra o Fluxo do Sistema, Navegação entre Abas,
 * Validação sem Duplicações, Sincronização em Tempo Real e Persistência Blindada
 * ============================================================================
 */

class AppController {
  constructor() {
    this.diagnosticModel = new DiagnosticModel();
    this.authService = new AuthService();
    this.databaseService = new DatabaseService();
    this.formView = new FormView();
    this.resultsView = new ResultsView();
    this.rankingView = new RankingView();
    this.homeView = new HomeView(this.authService, this.databaseService);
    this.authView = new AuthView(this.authService);

    this.ultimoDiagnostico = null;
    this.snapshotOriginal = null;
    this.isEditing = false;
    this.abaAtiva = 'home';
  }

  async init() {
    // 1. Verificação de Autenticação Obrigatória
    if (!this.authService.estaAutenticado()) {
      window.location.replace('login.html');
      return;
    }

    this.atualizarHeaderUsuario();

    // 2. Inicialização das Views e Componentes
    try {
      await this.formView.init(() => {});
    } catch (e) {
      console.warn('[AppController] FormView init:', e);
    }

    try {
      if (typeof this.resultsView.init === 'function') {
        this.resultsView.init();
      }
    } catch (e) {
      console.warn('[AppController] ResultsView init:', e);
    }

    try {
      if (typeof this.authView.init === 'function') {
        this.authView.init();
      }
    } catch (e) {
      console.warn('[AppController] AuthView init:', e);
    }

    this.setupCustomConfirmEvents();
    this.setupPendingModalEvents();
    this.setupDeleteAccountModalEvents();
    this.bindGlobalEvents();

    // 3. Renderiza a aba inicial (Home Page)
    await this.homeView.renderHome((destTab) => this.navegarParaAba(destTab));
    this.navegarParaAba('home');
  }

  /**
   * Alterna a visibilidade do menu dropdown do usuário no Header
   */
  toggleUserDropdown() {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) {
      menu.classList.toggle('open');
    }
  }

  /**
   * Realiza logout do usuário autenticado
   */
  async fazerLogout() {
    const ok = await this.abrirConfirmacao({
      titulo: 'Sair da Plataforma',
      mensagem: 'Deseja realmente encerrar sua sessão no GestARClimAS?',
      icone: '🚪',
      btnTexto: 'Sim, Sair',
      btnClasse: 'btn-secondary'
    });
    if (ok) {
      this.authService.logout();
      window.location.replace('login.html');
    }
  }

  /**
   * Atualiza as informações do usuário autenticado no Header/Navbar
   */
  atualizarHeaderUsuario() {
    const user = this.authService.obterUsuarioAtual();
    if (!user) return;

    const navPhoto = document.getElementById('navUserAvatar') || document.getElementById('navUserAvatarImg');
    const navName = document.getElementById('navUserName') || document.getElementById('navUserNameDisplay');
    const dropPhoto = document.getElementById('dropdownUserAvatar') || document.getElementById('dropdownUserAvatarImg');
    const dropName = document.getElementById('userDropdownFullName') || document.getElementById('dropdownUserNameDisplay');
    const dropEmail = document.getElementById('userDropdownEmail') || document.getElementById('dropdownUserEmailDisplay');

    if (navPhoto && user.fotoBase64) navPhoto.src = user.fotoBase64;
    if (navName && user.nome) navName.textContent = user.nome;
    if (dropPhoto && user.fotoBase64) dropPhoto.src = user.fotoBase64;
    if (dropName && user.nome) dropName.textContent = user.nome;
    if (dropEmail && user.email) dropEmail.textContent = user.email;

    this.formView.preencherAvaliadorAutenticado();
  }

  /**
   * Transição e navegação fluida entre abas principais
   */
  navegarParaAba(tabId) {
    this.abaAtiva = tabId;

    // Atualiza botões da Navbar
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Oculta todas as seções de abas
    document.querySelectorAll('.app-tab-pane, .tab-content').forEach(tab => {
      tab.classList.remove('active');
    });

    // Mapeamento normalizado de IDs de seção
    const tabMap = {
      'home': 'tabHome',
      'diagnostic': 'tabDiagnostic',
      'ranking': 'tabRanking',
      'history': 'tabHistory',
      'profile': 'tabProfile'
    };

    const targetId = tabMap[tabId] || `tab-${tabId}` || `tab${tabId}`;
    const target = document.getElementById(targetId) || document.getElementById(`tab-${tabId}`);
    if (target) {
      target.classList.add('active');
    }

    // Fecha dropdown se estiver aberto
    const menu = document.getElementById('userDropdownMenu');
    if (menu) menu.classList.remove('open');

    // Ações específicas ao abrir cada aba
    if (tabId === 'home') {
      this.homeView.renderHome((destTab) => this.navegarParaAba(destTab));
    } else if (tabId === 'history') {
      this.renderHistoryTab();
    } else if (tabId === 'ranking') {
      this.databaseService.obterEscolasAgrupadas().then(escolas => {
        this.databaseService.obterTodosLaudos().then(todos => {
          this.rankingView.renderRanking(escolas, todos);
        });
      });
    } else if (tabId === 'profile') {
      this.authView.renderProfileTab();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  abrirRanking() {
    this.navegarParaAba('ranking');
  }

  abrirHistorico() {
    this.navegarParaAba('history');
  }

  /**
   * Vincula todos os eventos de cliques, formulários e atalhos sem duplicações
   */
  bindGlobalEvents() {
    // Cliques nas abas da Navbar
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const tab = btn.dataset.tab;
        if (tab) this.navegarParaAba(tab);
      };
    });

    // Cliques diretos nos cartões de módulos da Home
    const cardNovo = document.getElementById('homeCardNovoLaudo');
    const cardRank = document.getElementById('homeCardRanking');
    const cardHist = document.getElementById('homeCardHistorico');
    const cardPerf = document.getElementById('homeCardPerfil');

    if (cardNovo) cardNovo.onclick = () => this.navegarParaAba('diagnostic');
    if (cardRank) cardRank.onclick = () => this.navegarParaAba('ranking');
    if (cardHist) cardHist.onclick = () => this.navegarParaAba('history');
    if (cardPerf) cardPerf.onclick = () => this.navegarParaAba('profile');

    // Dropdown do usuário no Header
    const toggleBtn = document.getElementById('btnUserMenuToggle');
    const menu = document.getElementById('userDropdownMenu');
    if (toggleBtn && menu) {
      toggleBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleUserDropdown();
      };
    }

    document.onclick = (e) => {
      if (menu && toggleBtn && !toggleBtn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
      }
    };

    // Botões de navegação de etapas do formulário (sem listeners duplicados)
    document.querySelectorAll('.btnNextStep').forEach(b => {
      b.onclick = (e) => {
        e.preventDefault();
        this.avancarEtapa();
      };
    });

    document.querySelectorAll('.btnPrevStep').forEach(b => {
      b.onclick = (e) => {
        e.preventDefault();
        this.voltarEtapa();
      };
    });

    const btnFinish = document.getElementById('btnFinishDiagnostic');
    if (btnFinish) {
      btnFinish.onclick = (e) => {
        e.preventDefault();
        this.processarDiagnostico();
      };
    }

    const btnEdit = document.getElementById('btnEditResponses');
    if (btnEdit) btnEdit.onclick = () => this.iniciarRevisaoRespostas();

    const btnNew = document.getElementById('btnNewDiagnostic');
    if (btnNew) {
      btnNew.onclick = async () => {
        const ok = await this.abrirConfirmacao({
          titulo: 'Iniciar Novo Diagnóstico',
          mensagem: 'Deseja iniciar um novo diagnóstico pericial? Os campos do formulário serão reiniciados para uma nova avaliação.',
          icone: '📋',
          btnTexto: 'Iniciar Diagnóstico',
          btnClasse: 'btn-primary'
        });
        if (ok) {
          this.ultimoDiagnostico = null;
          this.snapshotOriginal = null;
          this.isEditing = false;
          this.formView.resetForm();
          this.formView.preencherAvaliadorAutenticado();
          this.resultsView.hide();
          document.getElementById('stepperContainer').style.display = 'block';
          document.getElementById('diagnosticForm').style.display = 'block';
          this.formView.goToStep(0);
          this.navegarParaAba('diagnostic');
        }
      };
    }

    const btnExportJSON = document.getElementById('btnExportSingleJSON');
    if (btnExportJSON) {
      btnExportJSON.onclick = () => this.exportarJSON();
    }

    // Modal de Edição Rápida
    const btnQuickEdit = document.getElementById('btnQuickEditSchool');
    const modalQuickEdit = document.getElementById('quickEditSchoolModal');
    const btnCloseQuick = document.getElementById('btnCloseQuickEdit');
    const btnCancelQuick = document.getElementById('btnCancelQuickEdit');
    const btnSaveQuick = document.getElementById('btnSaveQuickEdit');

    if (btnQuickEdit) btnQuickEdit.onclick = () => this.abrirModalEdicaoRapida();
    if (btnCloseQuick) btnCloseQuick.onclick = () => modalQuickEdit?.classList.remove('open');
    if (btnCancelQuick) btnCancelQuick.onclick = () => modalQuickEdit?.classList.remove('open');
    if (btnSaveQuick) btnSaveQuick.onclick = () => this.salvarEdicaoRapida();

    // Limpar Todo Histórico
    const btnClearAll = document.getElementById('btnClearAllHistory');
    if (btnClearAll) {
      btnClearAll.onclick = () => this.limparTodoHistorico();
    }

    // Comparador Lado a Lado
    const selectA = document.getElementById('compareSelectA');
    const selectB = document.getElementById('compareSelectB');
    if (selectA) {
      selectA.onchange = async () => {
        const todos = await this.databaseService.obterTodosLaudos();
        this.rankingView.compararLaudos(todos);
      };
    }
    if (selectB) {
      selectB.onchange = async () => {
        const todos = await this.databaseService.obterTodosLaudos();
        this.rankingView.compararLaudos(todos);
      };
    }
  }

  setupPendingModalEvents() {
    const modal = document.getElementById('pendingFieldsModal');
    const btnClose = document.getElementById('btnClosePendingModal');
    const btnOk = document.getElementById('btnOkPendingModal');

    const fechar = () => {
      if (modal) modal.classList.remove('open');
    };

    if (btnClose) btnClose.onclick = fechar;
    if (btnOk) btnOk.onclick = fechar;
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) fechar();
      };
    }
  }

  setupCustomConfirmEvents() {
    const modal = document.getElementById('appCustomConfirmModal');
    const btnClose = document.getElementById('btnCloseCustomConfirm');
    if (btnClose && modal) {
      btnClose.onclick = () => modal.classList.remove('open');
    }
  }

  setupDeleteAccountModalEvents() {
    const modal = document.getElementById('modalDeleteAccountConfirm');
    const btnClose = document.getElementById('btnCloseDeleteModal');
    const btnCancel = document.getElementById('btnCancelDeleteAccount');
    const fechar = () => {
      if (modal) modal.classList.remove('open');
    };
    if (btnClose) btnClose.onclick = fechar;
    if (btnCancel) btnCancel.onclick = fechar;
  }

  /**
   * Modal Especial de Exclusão de Conta com Confirmação Obrigatória por Digitação do E-mail
   */
  abrirModalExclusaoConta(emailConta) {
    return new Promise((resolve) => {
      const modal = document.getElementById('modalDeleteAccountConfirm');
      const spanEmail = document.getElementById('deleteAccountTargetEmail');
      const inputEmail = document.getElementById('deleteAccountInputConfirm');
      const btnConfirm = document.getElementById('btnConfirmDeleteAccount');
      const btnCancel = document.getElementById('btnCancelDeleteAccount');

      if (!modal) {
        const promptInput = prompt(`Para confirmar a exclusão permanente, digite exatamente seu e-mail (${emailConta}):`);
        resolve(promptInput && promptInput.trim().toLowerCase() === emailConta.toLowerCase());
        return;
      }

      if (spanEmail) spanEmail.textContent = emailConta;
      if (inputEmail) inputEmail.value = '';

      modal.classList.add('open');
      if (inputEmail) inputEmail.focus();

      const cleanup = () => {
        modal.classList.remove('open');
        btnConfirm.onclick = null;
        btnCancel.onclick = null;
      };

      btnConfirm.onclick = () => {
        const digitado = (inputEmail?.value || '').trim().toLowerCase();
        if (digitado !== emailConta.toLowerCase()) {
          this.showToast('O e-mail digitado não confere com o da sua conta.', 'error');
          return;
        }
        cleanup();
        resolve(true);
      };

      btnCancel.onclick = () => {
        cleanup();
        resolve(false);
      };
    });
  }

  /**
   * Sistema Universal de Confirmações e Alertas Estilizados
   */
  abrirConfirmacao({ titulo = 'Confirmação', mensagem = '', icone = '❓', btnTexto = 'Confirmar', btnClasse = 'btn-primary' }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('appCustomConfirmModal');
      const elIcone = document.getElementById('appConfirmIcon');
      const elTitulo = document.getElementById('appConfirmTitle');
      const elMsg = document.getElementById('appConfirmMessage');
      const btnOk = document.getElementById('appConfirmBtnOk');
      const btnCancel = document.getElementById('appConfirmBtnCancel');

      if (!modal) {
        resolve(confirm(mensagem.replace(/<[^>]*>?/gm, '')));
        return;
      }

      if (elIcone) elIcone.textContent = icone;
      if (elTitulo) elTitulo.textContent = titulo;
      if (elMsg) elMsg.innerHTML = mensagem;
      if (btnOk) {
        btnOk.textContent = btnTexto;
        btnOk.className = `btn ${btnClasse}`;
      }

      modal.classList.add('open');

      const cleanup = () => {
        modal.classList.remove('open');
        btnOk.onclick = null;
        btnCancel.onclick = null;
      };

      btnOk.onclick = () => {
        cleanup();
        resolve(true);
      };

      btnCancel.onclick = () => {
        cleanup();
        resolve(false);
      };
    });
  }

  abrirModalEdicaoRapida() {
    if (!this.ultimoDiagnostico) return;

    const modal = document.getElementById('quickEditSchoolModal');
    const inputNome = document.getElementById('qeSchoolName');
    const inputInep = document.getElementById('qeSchoolInep');
    const inputAval = document.getElementById('qeEvaluatorName');
    const selectShift = document.getElementById('qeSchoolShift');
    const inputBairro = document.getElementById('qeSchoolNeighborhood');
    const inputRua = document.getElementById('qeSchoolStreet');

    if (inputNome) inputNome.value = this.ultimoDiagnostico.escola.nome || '';
    if (inputInep) inputInep.value = this.ultimoDiagnostico.escola.inep || '';
    if (inputAval) inputAval.value = this.ultimoDiagnostico.escola.avaliador || '';
    if (selectShift) selectShift.value = this.ultimoDiagnostico.escola.turno || 'Matutino e Vespertino';
    if (inputBairro) inputBairro.value = this.ultimoDiagnostico.escola.bairro || '';
    if (inputRua) inputRua.value = this.ultimoDiagnostico.escola.rua || '';

    if (modal) modal.classList.add('open');
  }

  async salvarEdicaoRapida() {
    if (!this.ultimoDiagnostico) return;

    const inputNome = document.getElementById('qeSchoolName');
    const inputInep = document.getElementById('qeSchoolInep');
    const inputAval = document.getElementById('qeEvaluatorName');
    const selectShift = document.getElementById('qeSchoolShift');
    const inputBairro = document.getElementById('qeSchoolNeighborhood');
    const inputRua = document.getElementById('qeSchoolStreet');

    const novoNome = (inputNome?.value || '').trim();
    const novoInep = (inputInep?.value || '').replace(/\D/g, '');
    const novoAval = (inputAval?.value || '').trim();
    const novoShift = selectShift?.value || this.ultimoDiagnostico.escola.turno;
    const novoBairro = (inputBairro?.value || '').trim() || this.ultimoDiagnostico.escola.bairro;
    const novaRua = (inputRua?.value || '').trim() || this.ultimoDiagnostico.escola.rua;

    if (!novoNome || !novoAval) {
      this.showToast('Por favor, preencha o nome da escola e do avaliador.', 'error');
      return;
    }

    if (novoInep.length !== 8) {
      this.showToast('O Código INEP deve conter exatamente 8 dígitos.', 'error');
      return;
    }

    this.ultimoDiagnostico.escola.nome = novoNome;
    this.ultimoDiagnostico.escola.inep = novoInep;
    this.ultimoDiagnostico.escola.avaliador = novoAval;
    this.ultimoDiagnostico.escola.turno = novoShift;
    this.ultimoDiagnostico.escola.bairro = novoBairro;
    this.ultimoDiagnostico.escola.rua = novaRua;
    this.ultimoDiagnostico.schoolKey = `${novoNome}_${this.ultimoDiagnostico.escola.cidade}_${this.ultimoDiagnostico.escola.estado}`.toLowerCase().replace(/\s+/g, '_');

    await this.databaseService.atualizarLaudo(this.ultimoDiagnostico);
    this.resultsView.renderResults(this.ultimoDiagnostico);

    const modal = document.getElementById('quickEditSchoolModal');
    if (modal) modal.classList.remove('open');

    this.showToast('Informações da instituição atualizadas no laudo!', 'success');
  }

  exibirAvisoPendencias(titulo, mensagem, campos) {
    const modal = document.getElementById('pendingFieldsModal');
    const containerLista = document.getElementById('pendingFieldsList');

    if (modal && containerLista) {
      containerLista.innerHTML = campos.map((c, i) => `
        <div style="margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.5rem;">
          <span style="color: #dc2626; font-weight: 800;">${i + 1}. ❌</span> 
          <span>${c}</span>
        </div>
      `).join('');
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
      escola: this.ultimoDiagnostico.escola,
      respostas: this.ultimoDiagnostico.respostas
    });

    this.formView.setFormData(this.ultimoDiagnostico);
    this.resultsView.hide();
    document.getElementById('stepperContainer').style.display = 'block';
    document.getElementById('diagnosticForm').style.display = 'block';
    this.formView.goToStep(1);
    this.navegarParaAba('diagnostic');

    this.showToast('Modo de revisão ativo. Altere as respostas e clique em Gerar Laudo para reprocessar.', 'info');
  }

  async processarDiagnostico() {
    const validacao = this.formView.validateStep(4);
    if (!validacao.isValid) {
      this.exibirAvisoPendencias(
        'Perguntas Não Respondidas',
        'Por favor, responda a todas as 4 perguntas desta etapa antes de emitir o laudo:',
        validacao.missingFields
      );
      return;
    }

    const { escola, respostas } = this.formView.getFormData();
    const currentUser = this.authService.obterUsuarioAtual();

    if (currentUser) {
      escola.avaliador = currentUser.nome;
    }

    // Calcula o diagnóstico ambiental determinístico
    const resultado = this.diagnosticModel.calcularDiagnostico(respostas, escola);

    let mudancasRevisao = [];
    if (this.isEditing && this.snapshotOriginal) {
      try {
        const snap = JSON.parse(this.snapshotOriginal);
        mudancasRevisao = this.diagnosticModel.detectarDiferencasRevisao(snap.respostas, respostas);
      } catch (e) {}
    }

    const schoolKey = `${escola.nome}_${escola.cidade}_${escola.estado}`.toLowerCase().replace(/\s+/g, '_');

    const laudoCompleto = {
      id: (this.isEditing && this.ultimoDiagnostico) ? this.ultimoDiagnostico.id : `DIAG_${Date.now()}`,
      schoolKey,
      userId: currentUser?.uid || 'anonymous',
      userName: currentUser?.nome || escola.avaliador,
      userPhoto: currentUser?.fotoBase64 || '',
      escola,
      respostas,
      diagnostico: resultado,
      mudancasRevisao,
      createdAt: (this.isEditing && this.ultimoDiagnostico) ? this.ultimoDiagnostico.createdAt : new Date().toISOString()
    };

    // Salva ou atualiza no Firestore e no cache local
    if (this.isEditing && this.ultimoDiagnostico) {
      await this.databaseService.atualizarLaudo(laudoCompleto);
      this.showToast('Laudo pericial reprocessado e atualizado com sucesso!', 'success');
    } else {
      await this.databaseService.salvarLaudo(laudoCompleto, currentUser);
      this.showToast('Diagnóstico concluído! Laudo pericial oficial gerado com sucesso.', 'success');
    }

    this.ultimoDiagnostico = laudoCompleto;
    this.formView.setupSchoolDatabaseSelector();

    // Renderiza laudo completo
    document.getElementById('stepperContainer').style.display = 'none';
    document.getElementById('diagnosticForm').style.display = 'none';
    this.resultsView.renderResults(laudoCompleto);
    this.navegarParaAba('diagnostic');
  }

  /**
   * Renderiza a aba Histórico agrupando em Pastas Escolares
   */
  async renderHistoryTab() {
    const container = document.getElementById('historyListContainer') || document.getElementById('historyFoldersContainer');
    const emptyState = document.getElementById('historyEmptyState');
    if (!container) return;

    container.innerHTML = '';
    const pastas = await this.databaseService.obterEscolasAgrupadas();

    if (pastas.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    pastas.forEach((pasta, index) => {
      const cardPasta = document.createElement('div');
      cardPasta.className = 'folder-card';
      cardPasta.dataset.schoolKey = pasta.key;

      const totalLaudos = pasta.laudos.length;
      const scoreUltimo = pasta.ultimoLaudo?.diagnostico?.scoreGeral || 0;
      let corBadge = 'badge-critico';
      if (scoreUltimo >= 80) corBadge = 'badge-excelente';
      else if (scoreUltimo >= 50) corBadge = 'badge-moderado';

      cardPasta.innerHTML = `
        <div class="folder-card-header" onclick="this.parentElement.classList.toggle('expanded')">
          <div class="folder-header-info">
            <div class="folder-icon">📁</div>
            <div>
              <h3 class="folder-title">${pasta.nome}</h3>
              <p class="folder-subtitle">
                📍 ${pasta.cidade} - ${pasta.estado} • ${pasta.bairro || 'Centro'} 
                ${pasta.ultimoLaudo?.escola?.inep ? `• INEP: <strong>${pasta.ultimoLaudo.escola.inep}</strong>` : ''}
                • <strong style="color: var(--primary-700);">${totalLaudos} ${totalLaudos === 1 ? 'laudo arquivado' : 'laudos arquivados'}</strong>
              </p>
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
                    <div style="font-weight: 800; color: var(--neutral-900); font-size: 0.875rem;">
                      ${l.diagnostico?.classificacao || 'Laudo Ambiental'} • <span style="color: var(--primary-700);">${l.diagnostico?.scoreGeral || 0}%</span>
                    </div>
                    <div style="font-size: 0.76rem; color: var(--neutral-500); margin-top: 0.15rem;">
                      📅 ${l.escola?.data || '-'} • 👤 Avaliador: <strong>${l.userName || l.escola?.avaliador || 'Não informado'}</strong> • 🏫 Turno: ${l.escola?.turno || '-'}
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

  async carregarDoHistorico(id) {
    const historico = await this.databaseService.obterTodosLaudos();
    const item = historico.find(h => h.id === id);
    if (item) {
      this.ultimoDiagnostico = item;
      this.navegarParaAba('diagnostic');
      this.resultsView.renderResults(item);
      this.showToast(`Laudo de "${item.escola.nome}" aberto!`, 'success');
    }
  }

  async abrirLaudoDoRanking(id) {
    const historico = await this.databaseService.obterTodosLaudos();
    const item = historico.find(h => h.id === id);
    if (item) {
      this.ultimoDiagnostico = item;
      this.navegarParaAba('diagnostic');
      this.resultsView.renderResults(item);
      this.showToast(`Laudo de "${item.escola.nome}" aberto!`, 'success');
    }
  }

  async removerDoHistorico(id) {
    const ok = await this.abrirConfirmacao({
      titulo: 'Excluir Laudo Pericial',
      mensagem: 'Tem certeza de que deseja excluir permanentemente este laudo arquivado?',
      icone: '🗑️',
      btnTexto: 'Sim, Excluir',
      btnClasse: 'btn-danger'
    });
    if (!ok) return;

    await this.databaseService.excluirLaudo(id);
    this.formView.setupSchoolDatabaseSelector();
    await this.renderHistoryTab();
    
    // Atualiza imediatamente o ranking e a home em tempo real
    const escolas = await this.databaseService.obterEscolasAgrupadas();
    const todos = await this.databaseService.obterTodosLaudos();
    this.rankingView.renderRanking(escolas, todos);
    await this.homeView.renderHome((destTab) => this.navegarParaAba(destTab));

    this.showToast('Laudo excluído com sucesso de todas as abas.', 'info');
  }

  async excluirPastaEscola(schoolKey) {
    const ok = await this.abrirConfirmacao({
      titulo: 'Excluir Pasta Escolar',
      mensagem: 'Atenção: Todos os laudos periciais e histórico desta unidade escolar serão excluídos permanentemente. Deseja prosseguir?',
      icone: '⚠️',
      btnTexto: 'Excluir Toda a Pasta',
      btnClasse: 'btn-danger'
    });
    if (!ok) return;

    await this.databaseService.excluirPastaEscola(schoolKey);
    this.formView.setupSchoolDatabaseSelector();
    await this.renderHistoryTab();

    // Atualiza imediatamente o ranking e a home em tempo real
    const escolas = await this.databaseService.obterEscolasAgrupadas();
    const todos = await this.databaseService.obterTodosLaudos();
    this.rankingView.renderRanking(escolas, todos);
    await this.homeView.renderHome((destTab) => this.navegarParaAba(destTab));

    this.showToast('Pasta da escola e seus laudos foram excluídos.', 'success');
  }

  async limparTodoHistorico() {
    const historico = await this.databaseService.obterTodosLaudos();
    if (historico.length === 0) {
      this.showToast('O histórico já está vazio.', 'info');
      return;
    }

    const ok = await this.abrirConfirmacao({
      titulo: 'Limpar Todo o Histórico',
      mensagem: `Deseja apagar definitivamente todos os <strong>${historico.length} laudos</strong> de todas as escolas cadastradas?`,
      icone: '⚠️',
      btnTexto: 'Sim, Apagar Tudo',
      btnClasse: 'btn-danger'
    });
    if (!ok) return;

    await this.databaseService.limparTodoHistorico();
    this.formView.setupSchoolDatabaseSelector();
    await this.renderHistoryTab();

    // Atualiza imediatamente o ranking e a home em tempo real
    const escolas = await this.databaseService.obterEscolasAgrupadas();
    const todos = await this.databaseService.obterTodosLaudos();
    this.rankingView.renderRanking(escolas, todos);
    await this.homeView.renderHome((destTab) => this.navegarParaAba(destTab));

    this.showToast('Histórico completamente limpo.', 'info');
  }

  exportarJSON() {
    if (!this.ultimoDiagnostico) {
      this.showToast('Nenhum laudo disponível para exportação.', 'info');
      return;
    }

    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.ultimoDiagnostico, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", jsonStr);
    const nomeLimpo = (this.ultimoDiagnostico.escola.nome || 'escola').toLowerCase().replace(/\s+/g, '_');
    a.setAttribute("download", `laudo_gestarclimas_${nomeLimpo}_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    this.showToast('Laudo pericial exportado em formato JSON.', 'success');
  }

  showToast(mensagem, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${tipo}`;
    
    let icone = 'ℹ️';
    if (tipo === 'success') icone = '✅';
    if (tipo === 'error') icone = '⚠️';

    toast.innerHTML = `
      <span style="font-size: 1rem;">${icone}</span>
      <span>${mensagem}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Disponibiliza no escopo global
window.AppController = AppController;
