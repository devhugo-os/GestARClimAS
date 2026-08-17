/**
 * ============================================================================
 * GestARClimAS - FormView.js
 * View: Formulário Multi-Step com Validação Detalhada e Desbloqueio Intuitivo:
 * - Estado fica bloqueado apenas até o Nome da Instituição ser preenchido/selecionado
 * - Botão "Iniciar Diagnóstico" reporta checklist de pendências caso falte algo
 * ============================================================================
 */

class FormView {
  constructor() {
    this.currentStep = 0;
    this.totalSteps = 5;
    this.locationService = new LocationService();
    this.stepTitles = [
      "Etapa 1 de 5: Identificação da Unidade Escolar",
      "Etapa 2 de 5: Riscos de Desastres e Período Chuvoso",
      "Etapa 3 de 5: Consumo Hídrico e Eficiência",
      "Etapa 4 de 5: Áreas Verdes, Microclima e Conforto",
      "Etapa 5 de 5: Gestão de Resíduos e Sustentabilidade"
    ];
  }

  async init(onOptionSelectCallback) {
    this.bindOptionCards(onOptionSelectCallback);
    this.updateStepperUI();
    this.setupSchoolDatabaseSelector();
    await this.setupLocationSelectors();
    this.bindCustomInputsListener();
    this.bindCepSearchListener();
    this.setupProgressiveUnlock();
  }

  /**
   * Popula o banco de dados dinâmico de escolas no Campo 1 a partir dos laudos salvos
   */
  setupSchoolDatabaseSelector() {
    const selectEscola = document.getElementById('schoolNameSelect');
    const inputCustom = document.getElementById('schoolNameInput');
    const customGroup = document.getElementById('customSchoolNameGroup');

    if (!selectEscola) return;

    let historico = [];
    try {
      historico = JSON.parse(localStorage.getItem('gestarclimas_user_diagnostics')) || [];
    } catch (e) {}

    const escolasMap = new Map();
    historico.forEach(item => {
      const nome = (item.escola?.nome || '').trim();
      if (nome && !escolasMap.has(nome.toLowerCase())) {
        escolasMap.set(nome.toLowerCase(), item.escola);
      }
    });

    selectEscola.innerHTML = '<option value="_NOVA_ESCOLA_" selected>✏️ + Cadastrar Nova Instituição (Digitar nome)...</option>';

    escolasMap.forEach((esc) => {
      const opt = document.createElement('option');
      opt.value = esc.nome;
      opt.dataset.cidade = esc.cidade || '';
      opt.dataset.estado = esc.estado || '';
      opt.dataset.bairro = esc.bairro || '';
      opt.dataset.rua = esc.rua || '';
      opt.dataset.turno = esc.turno || '';
      opt.textContent = `🏫 ${esc.nome} (${esc.cidade || 'MA'} - ${esc.estado || 'MA'})`;
      selectEscola.appendChild(opt);
    });

    selectEscola.addEventListener('change', async () => {
      const selectEstado = document.getElementById('schoolState');
      const selectCidade = document.getElementById('schoolCity');
      const selectBairro = document.getElementById('schoolNeighborhood');
      const selectRua = document.getElementById('schoolStreet');
      const selectTurno = document.getElementById('schoolShift');
      const inputAvaliador = document.getElementById('evaluatorName');

      if (selectEscola.value === '_NOVA_ESCOLA_') {
        if (customGroup) customGroup.style.display = 'block';
        if (inputCustom) {
          inputCustom.value = '';
          inputCustom.focus();
        }
        // Se ainda não digitou o nome, bloqueia Estado
        if (selectEstado) {
          selectEstado.disabled = true;
          selectEstado.closest('.form-group')?.classList.add('is-locked');
        }
      } else {
        if (customGroup) customGroup.style.display = 'none';
        if (inputCustom) inputCustom.value = selectEscola.value;

        // Desbloqueia Estado na hora
        if (selectEstado) {
          selectEstado.disabled = false;
          selectEstado.closest('.form-group')?.classList.remove('is-locked');
        }

        // Auto-carrega dados salvos da escola selecionada
        const optSelected = selectEscola.options[selectEscola.selectedIndex];
        if (optSelected) {
          const uf = optSelected.dataset.estado;
          const cidade = optSelected.dataset.cidade;
          const bairro = optSelected.dataset.bairro;
          const rua = optSelected.dataset.rua;
          const turno = optSelected.dataset.turno;

          if (selectEstado && uf) {
            selectEstado.value = uf;
            await this.carregarCidades(uf, cidade);
          }
          if (selectCidade && cidade) {
            selectCidade.disabled = false;
            selectCidade.closest('.form-group')?.classList.remove('is-locked');
            selectCidade.value = cidade;
            await this.carregarBairros(null, cidade, bairro);
          }
          if (selectBairro && bairro) {
            selectBairro.disabled = false;
            selectBairro.closest('.form-group')?.classList.remove('is-locked');
            selectBairro.value = bairro;
            await this.carregarRuas(cidade, bairro, rua);
          }
          if (selectRua && rua) {
            selectRua.disabled = false;
            selectRua.closest('.form-group')?.classList.remove('is-locked');
            selectRua.value = rua;
          }
          if (selectTurno && turno) {
            selectTurno.disabled = false;
            selectTurno.closest('.form-group')?.classList.remove('is-locked');
            selectTurno.value = turno;
          }
          if (inputAvaliador) {
            inputAvaliador.disabled = false;
            inputAvaliador.closest('.form-group')?.classList.remove('is-locked');
            inputAvaliador.focus();
          }
        }
      }
    });
  }

  /**
   * Configura o desbloqueio intuitivo (Estado bloqueado até preencher o nome da instituição)
   */
  setupProgressiveUnlock() {
    const inputNome = document.getElementById('schoolNameInput');
    const selectEscola = document.getElementById('schoolNameSelect');
    const inputCep = document.getElementById('schoolCep');
    const btnCep = document.getElementById('btnBuscarCep');
    const selectEstado = document.getElementById('schoolState');
    const selectCidade = document.getElementById('schoolCity');
    const selectBairro = document.getElementById('schoolNeighborhood');
    const customInputBairro = document.getElementById('customNeighborhoodInput');
    const selectRua = document.getElementById('schoolStreet');
    const customInputRua = document.getElementById('customStreetInput');
    const inputAvaliador = document.getElementById('evaluatorName');
    const selectTurno = document.getElementById('schoolShift');
    const btnNext = document.getElementById('btnNextStep');

    const liberar = (el) => {
      if (!el) return;
      el.disabled = false;
      const group = el.closest('.form-group');
      if (group) group.classList.remove('is-locked');
    };

    const bloquear = (el) => {
      if (!el) return;
      el.disabled = true;
      const group = el.closest('.form-group');
      if (group) group.classList.add('is-locked');
    };

    // CEP está sempre disponível
    liberar(inputCep);
    if (btnCep) btnCep.disabled = false;

    // Estado inicia BLOQUEADO até que o nome da instituição seja informado
    bloquear(selectEstado);
    bloquear(selectCidade);
    bloquear(selectBairro);
    bloquear(selectRua);
    bloquear(inputAvaliador);
    bloquear(selectTurno);

    // Botão Iniciar Diagnóstico sempre habilitado para exibir o checklist de pendências se faltar algo
    if (btnNext) btnNext.disabled = false;

    // 1. Digitação no Nome da Instituição -> Libera Estado na hora
    if (inputNome) {
      inputNome.addEventListener('input', () => {
        const preenchido = inputNome.value.trim().length >= 2;
        if (preenchido) {
          liberar(selectEstado);
        } else {
          if (selectEscola && selectEscola.value === '_NOVA_ESCOLA_') {
            bloquear(selectEstado);
            bloquear(selectCidade);
            bloquear(selectBairro);
          }
        }
      });
    }

    // 2. Estado selecionado -> Libera Cidade na hora
    if (selectEstado) {
      selectEstado.addEventListener('change', () => {
        if (selectEstado.value) {
          liberar(selectCidade);
        } else {
          bloquear(selectCidade);
          bloquear(selectBairro);
          bloquear(selectRua);
        }
      });
    }

    // 3. Cidade selecionada -> Libera Bairro na hora
    if (selectCidade) {
      selectCidade.addEventListener('change', () => {
        if (selectCidade.value) {
          liberar(selectBairro);
        } else {
          bloquear(selectBairro);
          bloquear(selectRua);
        }
      });
    }

    // 4. Bairro selecionado -> Libera Rua e Avaliador na hora
    if (selectBairro) {
      selectBairro.addEventListener('change', () => {
        if (selectBairro.value && selectBairro.value !== '_OUTRO_') {
          liberar(selectRua);
          liberar(inputAvaliador);
        } else if (selectBairro.value === '_OUTRO_') {
          if (customInputBairro && customInputBairro.value.trim().length > 0) {
            liberar(selectRua);
            liberar(inputAvaliador);
          }
        }
      });
    }

    if (customInputBairro) {
      customInputBairro.addEventListener('input', () => {
        if (customInputBairro.value.trim().length > 0) {
          liberar(selectRua);
          liberar(inputAvaliador);
        }
      });
    }

    // 5. Rua selecionada -> Libera Avaliador
    if (selectRua) {
      selectRua.addEventListener('change', () => {
        liberar(inputAvaliador);
      });
    }

    if (customInputRua) {
      customInputRua.addEventListener('input', () => {
        liberar(inputAvaliador);
      });
    }

    // 6. Avaliador preenchido -> Libera Turno
    if (inputAvaliador) {
      inputAvaliador.addEventListener('input', () => {
        const preenchido = inputAvaliador.value.trim().length >= 2;
        if (preenchido) {
          liberar(selectTurno);
        } else {
          bloquear(selectTurno);
        }
      });
    }
  }

  desbloquearTodosCampos() {
    const ids = ['schoolNameSelect', 'schoolNameInput', 'schoolCep', 'btnBuscarCep', 'schoolState', 'schoolCity', 'schoolNeighborhood', 'customNeighborhoodInput', 'schoolStreet', 'customStreetInput', 'evaluatorName', 'schoolShift', 'btnNextStep'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.disabled = false;
        const group = el.closest('.form-group');
        if (group) group.classList.remove('is-locked');
      }
    });
  }

  bindCustomInputsListener() {
    const selectBairro = document.getElementById('schoolNeighborhood');
    const customGroupBairro = document.getElementById('customNeighborhoodGroup');
    const customInputBairro = document.getElementById('customNeighborhoodInput');

    if (selectBairro && customGroupBairro) {
      selectBairro.addEventListener('change', () => {
        if (selectBairro.value === '_OUTRO_') {
          customGroupBairro.style.display = 'block';
          if (customInputBairro) customInputBairro.focus();
        } else {
          customGroupBairro.style.display = 'none';
        }
      });
    }

    const selectRua = document.getElementById('schoolStreet');
    const customGroupRua = document.getElementById('customStreetGroup');
    const customInputRua = document.getElementById('customStreetInput');

    if (selectRua && customGroupRua) {
      selectRua.addEventListener('change', () => {
        if (selectRua.value === '_OUTRA_RUA_') {
          customGroupRua.style.display = 'block';
          if (customInputRua) customInputRua.focus();
        } else {
          customGroupRua.style.display = 'none';
        }
      });
    }
  }

  bindCepSearchListener() {
    const inputCep = document.getElementById('schoolCep');
    const btnBuscarCep = document.getElementById('btnBuscarCep');

    const executarBusca = async () => {
      const cep = (inputCep?.value || '').replace(/\D/g, '');
      if (cep.length !== 8) return;

      try {
        if (btnBuscarCep) btnBuscarCep.textContent = 'Buscando...';
        const info = await this.locationService.buscarPorCEP(cep);
        
        const selectEstado = document.getElementById('schoolState');
        const selectCidade = document.getElementById('schoolCity');
        const selectBairro = document.getElementById('schoolNeighborhood');
        const selectRua = document.getElementById('schoolStreet');
        const inputAvaliador = document.getElementById('evaluatorName');
        const selectTurno = document.getElementById('schoolShift');

        // 1. Desbloqueia e Preenche Estado
        if (selectEstado && info.estado) {
          selectEstado.disabled = false;
          selectEstado.closest('.form-group')?.classList.remove('is-locked');
          selectEstado.value = info.estado;
          await this.carregarCidades(info.estado, info.cidade);
        }

        // 2. Desbloqueia e Preenche Cidade
        if (selectCidade && info.cidade) {
          selectCidade.disabled = false;
          selectCidade.closest('.form-group')?.classList.remove('is-locked');
          selectCidade.value = info.cidade;
          await this.carregarBairros(null, info.cidade, info.bairro);
        }

        // 3. Desbloqueia e Preenche Bairro
        if (selectBairro) {
          selectBairro.disabled = false;
          selectBairro.closest('.form-group')?.classList.remove('is-locked');
          if (info.bairro) {
            selectBairro.value = info.bairro;
          }
          await this.carregarRuas(info.cidade, info.bairro, info.rua);
        }

        // 4. Desbloqueia e Preenche Rua
        if (selectRua) {
          selectRua.disabled = false;
          selectRua.closest('.form-group')?.classList.remove('is-locked');
          if (info.rua) {
            selectRua.value = info.rua;
          }
        }

        // 5. Desbloqueia Avaliador e Turno
        if (inputAvaliador) {
          inputAvaliador.disabled = false;
          inputAvaliador.closest('.form-group')?.classList.remove('is-locked');
          inputAvaliador.focus();
        }
        if (selectTurno) {
          selectTurno.disabled = false;
          selectTurno.closest('.form-group')?.classList.remove('is-locked');
        }

        if (window.gestarclimasApp) {
          window.gestarclimasApp.showToast(`Endereço localizado via CEP: ${info.cidade} - ${info.estado}`, 'success');
        }
      } catch (err) {
        if (window.gestarclimasApp) {
          window.gestarclimasApp.showToast('CEP não localizado. Preencha o estado e cidade manualmente.', 'info');
        }
      } finally {
        if (btnBuscarCep) btnBuscarCep.textContent = 'Buscar CEP';
      }
    };

    if (btnBuscarCep) btnBuscarCep.addEventListener('click', executarBusca);
    if (inputCep) {
      inputCep.addEventListener('blur', () => {
        if (inputCep.value.replace(/\D/g, '').length === 8) executarBusca();
      });
    }
  }

  /**
   * Inicializa seletores dinâmicos de Estado, Município, Bairro e Rua 100% LIMPOS
   */
  async setupLocationSelectors() {
    const selectEstado = document.getElementById('schoolState');
    const selectCidade = document.getElementById('schoolCity');
    const selectBairro = document.getElementById('schoolNeighborhood');
    const selectRua = document.getElementById('schoolStreet');

    if (!selectEstado || !selectCidade || !selectBairro) return;

    selectEstado.innerHTML = '<option value="" selected>Selecione o Estado (UF)...</option>';
    selectCidade.innerHTML = '<option value="" selected>Selecione o Estado primeiro...</option>';
    selectBairro.innerHTML = '<option value="" selected>Selecione o Município primeiro...</option>';
    if (selectRua) selectRua.innerHTML = '<option value="" selected>Selecione o Bairro primeiro...</option>';

    try {
      const estados = await this.locationService.obterEstados();
      selectEstado.innerHTML = '<option value="" selected>Selecione o Estado (UF)...</option>';
      estados.forEach(est => {
        const opt = document.createElement('option');
        opt.value = est.sigla;
        opt.dataset.id = est.id;
        opt.textContent = `${est.nome} (${est.sigla})`;
        selectEstado.appendChild(opt);
      });

      selectEstado.addEventListener('change', async (e) => {
        const uf = e.target.value;
        if (uf) {
          await this.carregarCidades(uf);
        } else {
          selectCidade.innerHTML = '<option value="" selected>Selecione o Estado primeiro...</option>';
          selectBairro.innerHTML = '<option value="" selected>Selecione o Município primeiro...</option>';
          if (selectRua) selectRua.innerHTML = '<option value="" selected>Selecione o Bairro primeiro...</option>';
        }
      });

      selectCidade.addEventListener('change', async (e) => {
        const cidadeNome = e.target.value;
        const selectedOpt = selectCidade.options[selectCidade.selectedIndex];
        const cidadeId = selectedOpt ? selectedOpt.dataset.id : null;
        if (cidadeNome) {
          await this.carregarBairros(cidadeId, cidadeNome);
        } else {
          selectBairro.innerHTML = '<option value="" selected>Selecione o Município primeiro...</option>';
          if (selectRua) selectRua.innerHTML = '<option value="" selected>Selecione o Bairro primeiro...</option>';
        }
      });

      selectBairro.addEventListener('change', async (e) => {
        const bairroNome = e.target.value;
        const cidadeNome = selectCidade.value;
        if (bairroNome && bairroNome !== '_OUTRO_') {
          await this.carregarRuas(cidadeNome, bairroNome);
        } else if (!bairroNome) {
          if (selectRua) selectRua.innerHTML = '<option value="" selected>Selecione o Bairro primeiro...</option>';
        }
      });

    } catch (e) {
      console.warn('Erro ao configurar localização:', e);
    }
  }

  async carregarCidades(uf, cidadePadrao = '') {
    const selectCidade = document.getElementById('schoolCity');
    const selectBairro = document.getElementById('schoolNeighborhood');
    const selectRua = document.getElementById('schoolStreet');
    if (!selectCidade) return;

    selectCidade.innerHTML = '<option value="">Carregando municípios...</option>';
    if (selectBairro) selectBairro.innerHTML = '<option value="" selected>Selecione o Município primeiro...</option>';
    if (selectRua) selectRua.innerHTML = '<option value="" selected>Selecione o Bairro primeiro...</option>';

    try {
      const cidades = await this.locationService.obterMunicipiosPorUF(uf);
      selectCidade.innerHTML = '<option value="" selected>Selecione o Município...</option>';
      
      let optToSelect = null;
      cidades.forEach(cid => {
        const opt = document.createElement('option');
        opt.value = cid.nome;
        opt.dataset.id = cid.id;
        opt.textContent = cid.nome;
        if (cidadePadrao && cid.nome.toLowerCase() === cidadePadrao.toLowerCase()) {
          opt.selected = true;
          optToSelect = opt;
        }
        selectCidade.appendChild(opt);
      });

      if (cidadePadrao && optToSelect) {
        await this.carregarBairros(optToSelect.dataset.id, optToSelect.value);
      }

    } catch (e) {
      selectCidade.innerHTML = '<option value="" selected>Selecione o Município...</option><option value="Açailândia">Açailândia</option><option value="Imperatriz">Imperatriz</option><option value="São Luís">São Luís</option>';
    }
  }

  async carregarBairros(cidadeId, cidadeNome, bairroPadrao = '') {
    const selectBairro = document.getElementById('schoolNeighborhood');
    const customGroup = document.getElementById('customNeighborhoodGroup');
    const customInput = document.getElementById('customNeighborhoodInput');
    if (!selectBairro || !cidadeNome) return;

    if (customGroup) customGroup.style.display = 'none';

    try {
      const bairros = await this.locationService.obterBairrosDistritos(cidadeId, cidadeNome);
      selectBairro.innerHTML = '<option value="" selected>Selecione o Bairro / Região...</option>';

      const optOutro = document.createElement('option');
      optOutro.value = '_OUTRO_';
      optOutro.textContent = '✏️ + Outro Bairro (Digitar manualmente)...';
      selectBairro.appendChild(optOutro);

      let optSelecionado = false;
      bairros.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        if (bairroPadrao && b.toLowerCase() === bairroPadrao.toLowerCase()) {
          opt.selected = true;
          optSelecionado = true;
        }
        selectBairro.appendChild(opt);
      });

      if (bairroPadrao && !optSelecionado) {
        optOutro.selected = true;
        if (customGroup) customGroup.style.display = 'block';
        if (customInput) customInput.value = bairroPadrao;
      }

      if (bairroPadrao) {
        const bairroAtivo = selectBairro.value === '_OUTRO_' ? (customInput?.value || '') : selectBairro.value;
        await this.carregarRuas(cidadeNome, bairroAtivo);
      }

    } catch (e) {
      selectBairro.innerHTML = '<option value="" selected>Selecione o Bairro...</option><option value="_OUTRO_">✏️ + Outro Bairro (Digitar manualmente)...</option><option value="Centro">Centro</option>';
    }
  }

  async carregarRuas(cidadeNome, bairroNome, ruaPadrao = '') {
    const selectRua = document.getElementById('schoolStreet');
    const customGroupRua = document.getElementById('customStreetGroup');
    const customInputRua = document.getElementById('customStreetInput');
    if (!selectRua) return;

    if (customGroupRua) customGroupRua.style.display = 'none';

    try {
      const ruas = await this.locationService.obterRuasPorBairro(cidadeNome, bairroNome);
      selectRua.innerHTML = '<option value="" selected>Selecione a Rua / Logradouro...</option>';

      const optOutraRua = document.createElement('option');
      optOutraRua.value = '_OUTRA_RUA_';
      optOutraRua.textContent = '✏️ + Outra Rua / Logradouro (Digitar manualmente)...';
      selectRua.appendChild(optOutraRua);

      let ruaSelecionada = false;
      ruas.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        if (ruaPadrao && r.toLowerCase() === ruaPadrao.toLowerCase()) {
          opt.selected = true;
          ruaSelecionada = true;
        }
        selectRua.appendChild(opt);
      });

      if (ruaPadrao && !ruaSelecionada) {
        optOutraRua.selected = true;
        if (customGroupRua) customGroupRua.style.display = 'block';
        if (customInputRua) customInputRua.value = ruaPadrao;
      }

    } catch (e) {
      selectRua.innerHTML = '<option value="" selected>Selecione a Rua...</option><option value="_OUTRA_RUA_">✏️ + Outra Rua / Logradouro (Digitar manualmente)...</option><option value="Avenida Principal">Avenida Principal</option>';
    }
  }

  bindOptionCards(callback) {
    document.querySelectorAll('.option-card').forEach(card => {
      card.addEventListener('click', () => {
        const radio = card.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          
          const groupName = radio.name;
          document.querySelectorAll(`input[name="${groupName}"]`).forEach(r => {
            const parent = r.closest('.option-card');
            if (parent) parent.classList.remove('selected');
          });
          card.classList.add('selected');

          const block = card.closest('.question-block');
          if (block) block.classList.add('has-answered');

          if (callback) callback(groupName, radio.value);
        }
      });
    });
  }

  updateStepperUI() {
    const percent = Math.round((this.currentStep / (this.totalSteps - 1)) * 100);
    const fill = document.getElementById('progressBarFill');
    const label = document.getElementById('progressPercent');
    const title = document.getElementById('currentStepTitle');

    if (fill) fill.style.width = `${percent}%`;
    if (label) label.textContent = `${percent}% Concluído`;
    if (title) title.textContent = this.stepTitles[this.currentStep] || '';

    document.querySelectorAll('.step-item').forEach((item, index) => {
      item.classList.remove('active', 'completed');
      if (index === this.currentStep) {
        item.classList.add('active');
      } else if (index < this.currentStep) {
        item.classList.add('completed');
      }
    });
  }

  /**
   * Validação detalhada da etapa informando lista de pendências
   */
  validateStep(stepIndex) {
    if (stepIndex === 0) {
      const selectEscola = document.getElementById('schoolNameSelect');
      const inputNome = document.getElementById('schoolNameInput');
      const selectEstado = document.getElementById('schoolState');
      const selectCidade = document.getElementById('schoolCity');
      const selectBairro = document.getElementById('schoolNeighborhood');
      const customNeighborhoodInput = document.getElementById('customNeighborhoodInput');
      const evaluatorName = document.getElementById('evaluatorName');
      const schoolShift = document.getElementById('schoolShift');

      const pendentes = [];

      // 1. Nome da Escola
      let nomeFinal = '';
      if (selectEscola && selectEscola.value !== '_NOVA_ESCOLA_') {
        nomeFinal = selectEscola.value;
      } else if (inputNome) {
        nomeFinal = inputNome.value.trim();
      }

      if (!nomeFinal) {
        if (inputNome) inputNome.classList.add('error');
        pendentes.push('Nome da Instituição de Ensino');
      } else {
        if (inputNome) inputNome.classList.remove('error');
      }

      // 2. Estado (UF)
      if (!selectEstado || !selectEstado.value) {
        if (selectEstado) selectEstado.classList.add('error');
        pendentes.push('Estado (UF)');
      } else {
        if (selectEstado) selectEstado.classList.remove('error');
      }

      // 3. Cidade / Município
      if (!selectCidade || !selectCidade.value) {
        if (selectCidade) selectCidade.classList.add('error');
        pendentes.push('Cidade / Município');
      } else {
        if (selectCidade) selectCidade.classList.remove('error');
      }

      // 4. Bairro / Região
      if (!selectBairro || !selectBairro.value) {
        if (selectBairro) selectBairro.classList.add('error');
        pendentes.push('Bairro / Região');
      } else if (selectBairro.value === '_OUTRO_') {
        if (!customNeighborhoodInput || !customNeighborhoodInput.value.trim()) {
          if (customNeighborhoodInput) customNeighborhoodInput.classList.add('error');
          pendentes.push('Nome do Bairro (Digitado manualmente)');
        } else {
          if (customNeighborhoodInput) customNeighborhoodInput.classList.remove('error');
        }
      } else {
        if (selectBairro) selectBairro.classList.remove('error');
      }

      // 5. Responsável / Avaliador
      if (!evaluatorName || !evaluatorName.value.trim()) {
        if (evaluatorName) evaluatorName.classList.add('error');
        pendentes.push('Nome do Responsável / Avaliador');
      } else {
        if (evaluatorName) evaluatorName.classList.remove('error');
      }

      // 6. Turno e Modalidade
      if (!schoolShift || !schoolShift.value) {
        if (schoolShift) schoolShift.classList.add('error');
        pendentes.push('Turno e Modalidade de Atendimento');
      } else {
        if (schoolShift) schoolShift.classList.remove('error');
      }

      return {
        isValid: pendentes.length === 0,
        missingFields: pendentes
      };
    }

    const stepContainer = document.querySelector(`.form-step[data-step-index="${stepIndex}"]`);
    if (!stepContainer) return { isValid: true, missingFields: [] };

    const radios = stepContainer.querySelectorAll('input[type="radio"]');
    const groups = new Set();
    radios.forEach(r => groups.add(r.name));

    const missingQuestions = [];
    groups.forEach(groupName => {
      const checked = stepContainer.querySelector(`input[name="${groupName}"]:checked`);
      const block = document.getElementById(`block_${groupName}`);
      if (!checked) {
        const qTitle = block?.querySelector('.question-title')?.textContent?.trim() || groupName.toUpperCase();
        missingQuestions.push(qTitle);
        if (block) {
          block.style.borderColor = 'var(--danger-500)';
        }
      } else {
        if (block) block.style.borderColor = '';
      }
    });

    return {
      isValid: missingQuestions.length === 0,
      missingFields: missingQuestions
    };
  }

  goToStep(stepIndex) {
    document.querySelectorAll('.form-step').forEach(step => {
      step.classList.remove('active');
    });

    const target = document.querySelector(`.form-step[data-step-index="${stepIndex}"]`);
    if (target) {
      target.classList.add('active');
      this.currentStep = stepIndex;
      this.updateStepperUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getFormData() {
    const selectEscola = document.getElementById('schoolNameSelect');
    const inputNome = document.getElementById('schoolNameInput');
    let nomeEscola = '';
    if (selectEscola && selectEscola.value !== '_NOVA_ESCOLA_') {
      nomeEscola = selectEscola.value;
    } else {
      nomeEscola = (inputNome?.value || '').trim() || 'Instituição de Ensino';
    }

    const selectBairro = document.getElementById('schoolNeighborhood');
    const customBairro = document.getElementById('customNeighborhoodInput');
    let bairroFinal = 'Centro';
    if (selectBairro) {
      if (selectBairro.value === '_OUTRO_') {
        bairroFinal = (customBairro?.value || '').trim() || 'Bairro Informado';
      } else {
        bairroFinal = selectBairro.value;
      }
    }

    const selectRua = document.getElementById('schoolStreet');
    const customRua = document.getElementById('customStreetInput');
    let ruaFinal = '';
    if (selectRua) {
      if (selectRua.value === '_OUTRA_RUA_') {
        ruaFinal = (customRua?.value || '').trim() || 'Logradouro Informado';
      } else {
        ruaFinal = selectRua.value;
      }
    }

    const escola = {
      nome: nomeEscola,
      cep: (document.getElementById('schoolCep')?.value || '').trim(),
      estado: document.getElementById('schoolState')?.value || '',
      cidade: document.getElementById('schoolCity')?.value || '',
      bairro: bairroFinal,
      rua: ruaFinal,
      avaliador: (document.getElementById('evaluatorName')?.value || '').trim(),
      turno: document.getElementById('schoolShift')?.value || '',
      data: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    const respostas = {};
    for (let i = 1; i <= 16; i++) {
      const key = `p${i}`;
      const checked = document.querySelector(`input[name="${key}"]:checked`);
      respostas[key] = checked ? checked.value : 'critico';
    }

    return { escola, respostas };
  }

  /**
   * Preenche o formulário com dados de um diagnóstico existente
   */
  async setFormData(data) {
    if (!data) return;
    this.desbloquearTodosCampos();

    if (data.escola) {
      if (document.getElementById('schoolNameInput')) document.getElementById('schoolNameInput').value = data.escola.nome || '';
      if (document.getElementById('schoolCep')) document.getElementById('schoolCep').value = data.escola.cep || '';
      if (document.getElementById('evaluatorName')) document.getElementById('evaluatorName').value = data.escola.avaliador || '';
      if (document.getElementById('schoolShift')) document.getElementById('schoolShift').value = data.escola.turno || '';
      
      if (document.getElementById('schoolState') && data.escola.estado) {
        document.getElementById('schoolState').value = data.escola.estado;
        await this.carregarCidades(data.escola.estado, data.escola.cidade);
        await this.carregarBairros(null, data.escola.cidade, data.escola.bairro);
        await this.carregarRuas(data.escola.cidade, data.escola.bairro, data.escola.rua);
      }
    }

    if (data.respostas) {
      for (let i = 1; i <= 16; i++) {
        const key = `p${i}`;
        const val = data.respostas[key];
        if (val) {
          const radio = document.querySelector(`input[name="${key}"][value="${val}"]`);
          if (radio) {
            radio.checked = true;
            const parent = radio.closest('.option-card');
            if (parent) parent.classList.add('selected');
            const block = radio.closest('.question-block');
            if (block) block.classList.add('has-answered');
          }
        }
      }
    }
  }

  resetForm() {
    document.getElementById('diagnosticForm')?.reset();
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.question-block').forEach(b => {
      b.classList.remove('has-answered');
      b.style.borderColor = '';
    });
    const customGroupBairro = document.getElementById('customNeighborhoodGroup');
    if (customGroupBairro) customGroupBairro.style.display = 'none';

    const customGroupRua = document.getElementById('customStreetGroup');
    if (customGroupRua) customGroupRua.style.display = 'none';

    document.getElementById('resultsContainer')?.classList.remove('active');
    document.getElementById('stepperContainer').style.display = 'block';
    document.getElementById('diagnosticForm').style.display = 'block';
    this.setupSchoolDatabaseSelector();
    this.goToStep(0);
    this.setupProgressiveUnlock();
  }
}

// Disponibiliza no escopo global
window.FormView = FormView;
