/**
 * ============================================================================
 * GestARClimAS - FormView.js
 * View: Formulário Multi-Step com Validação Detalhada, Indicadores de Resposta e Desbloqueio
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

    selectEscola.innerHTML = '<option value="_NOVA_ESCOLA_" selected>+ Cadastrar Nova Instituição (Digitar nome)...</option>';

    escolasMap.forEach((esc) => {
      const opt = document.createElement('option');
      opt.value = esc.nome;
      opt.dataset.inep = esc.inep || '';
      opt.dataset.cidade = esc.cidade || '';
      opt.dataset.estado = esc.estado || '';
      opt.dataset.bairro = esc.bairro || '';
      opt.dataset.rua = esc.rua || '';
      opt.dataset.turno = esc.turno || '';
      opt.textContent = `${esc.nome} (${esc.cidade || 'MA'} - ${esc.estado || 'MA'})`;
      selectEscola.appendChild(opt);
    });

    selectEscola.addEventListener('change', async () => {
      const selectEstado = document.getElementById('schoolState');
      const selectCidade = document.getElementById('schoolCity');
      const selectBairro = document.getElementById('schoolNeighborhood');
      const selectRua = document.getElementById('schoolStreet');
      const selectTurno = document.getElementById('schoolShift');
      const inputInep = document.getElementById('schoolInep');

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
        const opt = selectEscola.options[selectEscola.selectedIndex];
        if (opt) {
          if (inputInep && opt.dataset.inep) inputInep.value = opt.dataset.inep;
          const uf = opt.dataset.estado;
          const cid = opt.dataset.cidade;
          const bai = opt.dataset.bairro;
          const rua = opt.dataset.rua;
          const tur = opt.dataset.turno;

          if (selectEstado && uf) {
            selectEstado.value = uf;
            await this.carregarCidades(uf, cid);
            await this.carregarBairros(null, cid, bai);
            await this.carregarRuas(cid, bai, rua);
          }

          if (selectTurno && tur) selectTurno.value = tur;

          this.desbloquearTodosCampos();
        }
      }
    });
  }

  /**
   * Monitora o campo de nome da escola para desbloquear o Estado imediatamente quando preenchido
   */
  setupProgressiveUnlock() {
    const inputNome = document.getElementById('schoolNameInput');
    const selectEscola = document.getElementById('schoolNameSelect');
    const selectEstado = document.getElementById('schoolState');

    const checkAndUnlock = () => {
      const temNome = (selectEscola && selectEscola.value !== '_NOVA_ESCOLA_') || 
                      (inputNome && inputNome.value.trim().length > 0);

      if (temNome) {
        if (selectEstado) {
          selectEstado.disabled = false;
          selectEstado.closest('.form-group')?.classList.remove('is-locked');
        }
      } else {
        if (selectEstado) {
          selectEstado.disabled = true;
          selectEstado.closest('.form-group')?.classList.add('is-locked');
        }
      }
    };

    if (inputNome) {
      inputNome.addEventListener('input', checkAndUnlock);
      inputNome.addEventListener('change', checkAndUnlock);
    }
  }

  /**
   * Configura os seletores dinâmicos de Estado, Cidade, Bairro e Rua
   */
  async setupLocationSelectors() {
    const selectEstado = document.getElementById('schoolState');
    const selectCidade = document.getElementById('schoolCity');
    const selectBairro = document.getElementById('schoolNeighborhood');
    const selectRua = document.getElementById('schoolStreet');

    if (!selectEstado) return;

    // Bloqueia inicialmente até o nome da escola ser fornecido
    selectEstado.disabled = true;
    selectEstado.closest('.form-group')?.classList.add('is-locked');

    try {
      const estados = await this.locationService.getEstados();
      selectEstado.innerHTML = '<option value="" selected>Selecione o Estado (UF)...</option>';
      estados.forEach(uf => {
        const opt = document.createElement('option');
        opt.value = uf.sigla;
        opt.textContent = `${uf.sigla} - ${uf.nome}`;
        selectEstado.appendChild(opt);
      });
    } catch (e) {
      selectEstado.innerHTML = '<option value="MA" selected>MA - Maranhão</option><option value="SP">SP - São Paulo</option><option value="RJ">RJ - Rio de Janeiro</option>';
    }

    selectEstado.addEventListener('change', async () => {
      const uf = selectEstado.value;
      if (uf) {
        await this.carregarCidades(uf);
      } else {
        selectCidade.innerHTML = '<option value="" selected>Selecione o Estado primeiro...</option>';
        selectCidade.disabled = true;
        selectBairro.innerHTML = '<option value="" selected>Selecione o Município primeiro...</option>';
        selectBairro.disabled = true;
        selectRua.innerHTML = '<option value="" selected>Selecione o Bairro primeiro...</option>';
        selectRua.disabled = true;
      }
    });

    selectCidade.addEventListener('change', async () => {
      const cid = selectCidade.value;
      if (cid) {
        await this.carregarBairros(null, cid);
      } else {
        selectBairro.innerHTML = '<option value="" selected>Selecione o Município primeiro...</option>';
        selectBairro.disabled = true;
        selectRua.innerHTML = '<option value="" selected>Selecione o Bairro primeiro...</option>';
        selectRua.disabled = true;
      }
    });

    selectBairro.addEventListener('change', async () => {
      const customGroupBairro = document.getElementById('customNeighborhoodGroup');
      const customInputBairro = document.getElementById('customNeighborhoodInput');

      if (selectBairro.value === '_OUTRO_') {
        if (customGroupBairro) customGroupBairro.style.display = 'block';
        if (customInputBairro) {
          customInputBairro.required = true;
          customInputBairro.focus();
        }
      } else {
        if (customGroupBairro) customGroupBairro.style.display = 'none';
        if (customInputBairro) customInputBairro.required = false;
      }

      const cid = selectCidade.value;
      const bai = selectBairro.value === '_OUTRO_' ? (customInputBairro?.value || 'Centro') : selectBairro.value;
      if (cid && selectBairro.value) {
        await this.carregarRuas(cid, bai);
      } else {
        selectRua.innerHTML = '<option value="" selected>Selecione o Bairro primeiro...</option>';
        selectRua.disabled = true;
      }
    });

    selectRua.addEventListener('change', () => {
      const customGroupRua = document.getElementById('customStreetGroup');
      const customInputRua = document.getElementById('customStreetInput');

      if (selectRua.value === '_OUTRA_RUA_') {
        if (customGroupRua) customGroupRua.style.display = 'block';
        if (customInputRua) {
          customInputRua.required = true;
          customInputRua.focus();
        }
      } else {
        if (customGroupRua) customGroupRua.style.display = 'none';
        if (customInputRua) customInputRua.required = false;
      }
    });
  }

  async carregarCidades(uf, cidadePadrao = null) {
    const selectCidade = document.getElementById('schoolCity');
    const selectBairro = document.getElementById('schoolNeighborhood');
    const selectRua = document.getElementById('schoolStreet');

    selectCidade.disabled = false;
    selectCidade.closest('.form-group')?.classList.remove('is-locked');
    selectCidade.innerHTML = '<option value="" selected>Carregando cidades do IBGE...</option>';

    try {
      const cidades = await this.locationService.getCidadesPorEstado(uf);
      selectCidade.innerHTML = '<option value="" selected>Selecione a Cidade / Município...</option>';

      let selecionada = false;
      cidades.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.nome;
        opt.textContent = c.nome;
        if (cidadePadrao && c.nome.toLowerCase() === cidadePadrao.toLowerCase()) {
          opt.selected = true;
          selecionada = true;
        }
        selectCidade.appendChild(opt);
      });

      if (!cidadePadrao) {
        selectBairro.innerHTML = '<option value="" selected>Selecione o Município primeiro...</option>';
        selectBairro.disabled = true;
        selectRua.innerHTML = '<option value="" selected>Selecione o Bairro primeiro...</option>';
        selectRua.disabled = true;
      }
    } catch (e) {
      selectCidade.innerHTML = '<option value="São Luís" selected>São Luís</option><option value="Imperatriz">Imperatriz</option><option value="Caxias">Caxias</option>';
    }
  }

  async carregarBairros(estado, cidade, bairroPadrao = null) {
    const selectBairro = document.getElementById('schoolNeighborhood');
    const selectRua = document.getElementById('schoolStreet');
    const customGroupBairro = document.getElementById('customNeighborhoodGroup');
    const customInputBairro = document.getElementById('customNeighborhoodInput');

    selectBairro.disabled = false;
    selectBairro.closest('.form-group')?.classList.remove('is-locked');
    selectBairro.innerHTML = '<option value="" selected>Carregando bairros...</option>';

    try {
      const bairros = await this.locationService.getBairros(estado, cidade);
      selectBairro.innerHTML = '<option value="" selected>Selecione o Bairro...</option>';
      
      const optOutro = document.createElement('option');
      optOutro.value = '_OUTRO_';
      optOutro.textContent = '+ Outro Bairro (Digitar manualmente)...';
      selectBairro.appendChild(optOutro);

      let bairroSelecionado = false;
      bairros.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        if (bairroPadrao && b.toLowerCase() === bairroPadrao.toLowerCase()) {
          opt.selected = true;
          bairroSelecionado = true;
        }
        selectBairro.appendChild(opt);
      });

      if (bairroPadrao && !bairroSelecionado) {
        optOutro.selected = true;
        if (customGroupBairro) customGroupBairro.style.display = 'block';
        if (customInputBairro) customInputBairro.value = bairroPadrao;
      }

      if (!bairroPadrao) {
        selectRua.innerHTML = '<option value="" selected>Selecione o Bairro primeiro...</option>';
        selectRua.disabled = true;
      }
    } catch (e) {
      selectBairro.innerHTML = '<option value="" selected>Selecione o Bairro...</option><option value="_OUTRO_">+ Outro Bairro (Digitar manualmente)...</option><option value="Centro">Centro</option>';
    }
  }

  async carregarRuas(cidade, bairro, ruaPadrao = null) {
    const selectRua = document.getElementById('schoolStreet');
    const customGroupRua = document.getElementById('customStreetGroup');
    const customInputRua = document.getElementById('customStreetInput');

    selectRua.disabled = false;
    selectRua.closest('.form-group')?.classList.remove('is-locked');
    selectRua.innerHTML = '<option value="" selected>Carregando ruas...</option>';

    try {
      const ruas = await this.locationService.getRuas(cidade, bairro);
      selectRua.innerHTML = '<option value="" selected>Selecione a Rua / Logradouro...</option>';

      const optOutraRua = document.createElement('option');
      optOutraRua.value = '_OUTRA_RUA_';
      optOutraRua.textContent = '+ Outra Rua / Logradouro (Digitar manualmente)...';
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
      selectRua.innerHTML = '<option value="" selected>Selecione a Rua...</option><option value="_OUTRA_RUA_">+ Outra Rua / Logradouro (Digitar manualmente)...</option><option value="Avenida Principal">Avenida Principal</option>';
    }
  }

  bindCustomInputsListener() {
    const customInputBairro = document.getElementById('customNeighborhoodInput');
    const selectCidade = document.getElementById('schoolCity');

    if (customInputBairro) {
      customInputBairro.addEventListener('blur', () => {
        const cid = selectCidade?.value;
        const bai = customInputBairro.value.trim();
        if (cid && bai) {
          this.carregarRuas(cid, bai);
        }
      });
    }
  }

  bindCepSearchListener() {
    const btnBuscarCep = document.getElementById('btnBuscarCep');
    const inputCep = document.getElementById('schoolCep');

    if (!btnBuscarCep || !inputCep) return;

    inputCep.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnBuscarCep.click();
      }
    });

    btnBuscarCep.addEventListener('click', async () => {
      const cep = inputCep.value.replace(/\D/g, '');
      if (cep.length !== 8) {
        if (window.gestarclimasApp) {
          window.gestarclimasApp.showToast('Por favor, informe um CEP válido com 8 dígitos.', 'error');
        }
        return;
      }

      btnBuscarCep.textContent = 'Buscando...';
      btnBuscarCep.disabled = true;

      try {
        const dados = await this.locationService.buscarCep(cep);
        if (dados && (dados.uf || dados.estado)) {
          this.desbloquearTodosCampos();

          const uf = dados.uf || dados.estado;
          const cidade = dados.localidade || dados.cidade;
          const bairro = dados.bairro || 'Centro';
          const rua = dados.logradouro || dados.rua || '';

          const selectEstado = document.getElementById('schoolState');
          if (selectEstado && uf) {
            selectEstado.value = uf;
            await this.carregarCidades(uf, cidade);
            await this.carregarBairros(uf, cidade, bairro);
            await this.carregarRuas(cidade, bairro, rua);
          }

          if (window.gestarclimasApp) {
            window.gestarclimasApp.showToast(`Endereço localizado: ${cidade} - ${uf} (${bairro})`, 'success');
          }
        } else {
          if (window.gestarclimasApp) {
            window.gestarclimasApp.showToast('CEP não encontrado. Preencha os dados manualmente.', 'info');
          }
        }
      } catch (err) {
        if (window.gestarclimasApp) {
          window.gestarclimasApp.showToast(err.message || 'Erro ao consultar CEP na rede.', 'error');
        }
      } finally {
        btnBuscarCep.textContent = 'Buscar CEP';
        btnBuscarCep.disabled = false;
      }
    });
  }

  desbloquearTodosCampos() {
    ['schoolState', 'schoolCity', 'schoolNeighborhood', 'schoolStreet', 'schoolInep'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.disabled = false;
        el.closest('.form-group')?.classList.remove('is-locked');
      }
    });
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
            if (parent) {
              parent.classList.remove('selected', 'type-critico', 'type-moderado', 'type-excelente');
            }
          });

          card.classList.add('selected');
          if (radio.value === 'critico') card.classList.add('type-critico');
          else if (radio.value === 'moderado') card.classList.add('type-moderado');
          else if (radio.value === 'excelente') card.classList.add('type-excelente');

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
      const inputInep = document.getElementById('schoolInep');
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

      // 2. Código INEP da Escola (8 Dígitos Numéricos Obrigatório)
      const inepVal = (inputInep?.value || '').replace(/\D/g, '');
      if (!inputInep || inepVal.length !== 8) {
        if (inputInep) inputInep.classList.add('error');
        pendentes.push('Código INEP da Escola (8 dígitos numéricos)');
      } else {
        if (inputInep) inputInep.classList.remove('error');
      }

      // 3. Estado (UF)
      if (!selectEstado || !selectEstado.value) {
        if (selectEstado) selectEstado.classList.add('error');
        pendentes.push('Estado (UF)');
      } else {
        if (selectEstado) selectEstado.classList.remove('error');
      }

      // 4. Cidade / Município
      if (!selectCidade || !selectCidade.value) {
        if (selectCidade) selectCidade.classList.add('error');
        pendentes.push('Cidade / Município');
      } else {
        if (selectCidade) selectCidade.classList.remove('error');
      }

      // 5. Bairro / Região
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

      // 6. Responsável / Avaliador
      if (!evaluatorName || !evaluatorName.value.trim()) {
        if (evaluatorName) evaluatorName.classList.add('error');
        pendentes.push('Nome do Responsável / Avaliador');
      } else {
        if (evaluatorName) evaluatorName.classList.remove('error');
      }

      // 7. Turno e Modalidade
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
      inep: (document.getElementById('schoolInep')?.value || '').trim(),
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
      if (document.getElementById('schoolInep')) document.getElementById('schoolInep').value = data.escola.inep || '';
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
            if (parent) {
              parent.classList.add('selected');
              if (val === 'critico') parent.classList.add('type-critico');
              else if (val === 'moderado') parent.classList.add('type-moderado');
              else if (val === 'excelente') parent.classList.add('type-excelente');
            }
            const block = radio.closest('.question-block');
            if (block) block.classList.add('has-answered');
          }
        }
      }
    }
  }

  resetForm() {
    document.getElementById('diagnosticForm')?.reset();
    document.querySelectorAll('.option-card').forEach(c => {
      c.classList.remove('selected', 'type-critico', 'type-moderado', 'type-excelente');
    });
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
    this.preencherAvaliadorAutenticado();
  }

  preencherAvaliadorAutenticado() {
    const user = window.gestarclimasApp?.authService?.obterUsuarioAtual();
    const inputAval = document.getElementById('evaluatorName');
    if (user && inputAval && !inputAval.value) {
      inputAval.value = user.nome;
    }
  }
}

// Disponibiliza no escopo global
window.FormView = FormView;
