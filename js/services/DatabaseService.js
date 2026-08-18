/**
 * ============================================================================
 * GestARClimAS - DatabaseService.js
 * Serviço de Persistência 100% em Nuvem via Firebase Firestore
 * Projeto: projetogeo-1337f
 * Estrutura Padronizada com Hashing de Integridade Criptográfica (SHA-256)
 * ============================================================================
 */

class DatabaseService {
  constructor() {
    this.firebaseApp = null;
    this.firestoreDb = null;
    this.isFirebaseReady = false;

    this._tentarAutoInicializar();
    this._limparArmazenamentoLocalLegado();
  }

  /**
   * Limpa resquícios de laudos ou listas armazenadas em versões anteriores no localStorage
   */
  _limparArmazenamentoLocalLegado() {
    try {
      localStorage.removeItem('gestarclimas_user_diagnostics');
      localStorage.removeItem('gestarclimas_deleted_diag_ids');
      localStorage.removeItem('gestarclimas_history_wipe_time');
      localStorage.removeItem('gestarclimas_auth_users');
      localStorage.removeItem('gestarclimas_auth_recovery_token');
    } catch (e) {}
  }

  _tentarAutoInicializar() {
    try {
      if (typeof firebase !== 'undefined') {
        if (!firebase.apps?.length && typeof window !== 'undefined' && window.GEST_FIREBASE_CONFIG) {
          firebase.initializeApp(window.GEST_FIREBASE_CONFIG);
        }
        if (firebase.apps?.length) {
          this.firebaseApp = firebase.app();
          this.firestoreDb = firebase.firestore();
          this.isFirebaseReady = true;
        }
      }
    } catch (e) {
      console.warn('[DatabaseService] Erro ao inicializar Firestore:', e);
      this.isFirebaseReady = false;
    }
  }

  /**
   * Conecta e inicializa o Firebase SDK dinamicamente caso necessário
   * @param {Object} firebaseConfig Objeto com credenciais
   */
  async inicializarFirebase(firebaseConfig) {
    if (!firebaseConfig || !firebaseConfig.projectId) return false;

    try {
      if (typeof firebase !== 'undefined') {
        this.firebaseApp = firebase.apps?.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
        this.firestoreDb = firebase.firestore();
        this.isFirebaseReady = true;
        return true;
      }
      return false;
    } catch (err) {
      console.error('[DatabaseService] Falha ao inicializar Firebase:', err);
      return false;
    }
  }

  /**
   * Gera Hash Criptográfico Seguro SHA-256 para integridade do laudo
   */
  async _gerarChecksum(payload) {
    try {
      const texto = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const encoder = new TextEncoder();
      const data = encoder.encode(texto);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    }
  }

  /**
   * Normaliza e gera uma chave única canônica para a Unidade Escolar (evita duplicação de pastas)
   */
  gerarSchoolKey(nome, cidade, estado) {
    const clean = (str) => (str || '').trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const n = clean(nome) || 'escola';
    const c = clean(cidade) || 'cidade';
    const u = clean(estado) || 'uf';
    return `${n}__${c}__${u}`;
  }

  /**
   * Obtém todos os laudos registrados no Firebase Firestore com deduplicação por ID
   */
  async obterTodosLaudos() {
    this._tentarAutoInicializar();

    if (!this.isFirebaseReady || !this.firestoreDb) {
      console.warn('[DatabaseService] Firestore não inicializado.');
      return [];
    }

    try {
      const snapshot = await this.firestoreDb.collection('diagnostics').get();
      if (!snapshot || snapshot.empty) {
        return [];
      }

      const seenIds = new Set();
      const itens = [];

      snapshot.docs.forEach(doc => {
        const d = doc.data() || {};
        const id = doc.id || d.id;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          const schoolKey = this.gerarSchoolKey(d.escola?.nome, d.escola?.cidade, d.escola?.estado);
          itens.push({
            id: id,
            ...d,
            schoolKey: schoolKey
          });
        }
      });

      // Ordena por data de criação mais recente
      itens.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return itens;
    } catch (err) {
      console.error('[DatabaseService] Erro ao consultar laudos no Firestore:', err);
      return [];
    }
  }

  /**
   * Obtém os laudos emitidos por um usuário específico no Firestore
   * @param {string} userId UID do usuário
   */
  async obterLaudosPorUsuario(userId) {
    if (!userId) return await this.obterTodosLaudos();
    this._tentarAutoInicializar();

    if (!this.isFirebaseReady || !this.firestoreDb) return [];

    try {
      const snapshot = await this.firestoreDb.collection('diagnostics')
        .where('userId', '==', userId)
        .get();

      if (!snapshot || snapshot.empty) return [];

      const itens = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      itens.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return itens;
    } catch (err) {
      console.warn('[DatabaseService] Consulta filtrada por userId:', err);
      const todos = await this.obterTodosLaudos();
      return todos.filter(d => d.userId === userId);
    }
  }

  /**
   * Salva um novo laudo pericial diretamente no Firebase Firestore com metadados estruturados
   * @param {Object} laudoData Dados completos do laudo
   * @param {Object} usuario Usuário autenticado
   */
  async salvarLaudo(laudoData, usuario) {
    this._tentarAutoInicializar();

    if (!this.isFirebaseReady || !this.firestoreDb) {
      throw new Error('Não foi possível conectar ao Firebase Firestore para salvar o laudo.');
    }

    const nomeEscola = (laudoData.escola?.nome || '').trim();
    const cidade = (laudoData.escola?.cidade || '').trim();
    const estado = (laudoData.escola?.estado || '').trim();
    const schoolKey = this.gerarSchoolKey(nomeEscola, cidade, estado);
    const diagId = laudoData.id || `DIAG_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const dataHoraAtual = new Date().toISOString();

    // Estrutura organizada e higienizada do documento
    const documentoFinal = {
      id: diagId,
      userId: usuario?.uid || 'anonymous',
      userName: usuario?.nome || laudoData.escola?.avaliador || 'Avaliador',
      userPhoto: usuario?.fotoBase64 || '',
      schoolKey: schoolKey,
      escola: {
        nome: nomeEscola,
        inep: laudoData.escola?.inep || '',
        cidade: cidade,
        estado: estado,
        bairro: laudoData.escola?.bairro || '',
        rua: laudoData.escola?.rua || '',
        cep: laudoData.escola?.cep || '',
        turno: laudoData.escola?.turno || 'Matutino e Vespertino',
        avaliador: laudoData.escola?.avaliador || usuario?.nome || 'Avaliador Escolar',
        data: laudoData.escola?.data || new Date().toLocaleString('pt-BR')
      },
      diagnostico: {
        scoreGeral: laudoData.diagnostico?.scoreGeral ?? 0,
        classificacao: laudoData.diagnostico?.classificacao || 'Avaliação Realizada',
        corBadge: laudoData.diagnostico?.corBadge || 'badge-moderado',
        descricaoStatus: laudoData.diagnostico?.descricaoStatus || '',
        dimensoes: laudoData.diagnostico?.dimensoes || {},
        respostas: laudoData.diagnostico?.respostas || {},
        pontosCriticos: laudoData.diagnostico?.pontosCriticos || [],
        pontosMelhorar: laudoData.diagnostico?.pontosMelhorar || [],
        pontosFortes: laudoData.diagnostico?.pontosFortes || [],
        recomendacoesAcao: laudoData.diagnostico?.recomendacoesAcao || [],
        detalhamentoQuestoes: laudoData.diagnostico?.detalhamentoQuestoes || [],
        indicadores: laudoData.diagnostico?.indicadores || {},
        scoreProjetadoPosAcao: laudoData.diagnostico?.scoreProjetadoPosAcao || 90
      },
      status: 'concluido',
      createdAt: laudoData.createdAt || dataHoraAtual,
      updatedAt: dataHoraAtual
    };

    // Gera Checksum de Integridade Criptográfica SHA-256
    const checksum = await this._gerarChecksum({
      id: documentoFinal.id,
      userId: documentoFinal.userId,
      schoolKey: documentoFinal.schoolKey,
      scoreGeral: documentoFinal.diagnostico.scoreGeral,
      respostas: documentoFinal.diagnostico.respostas
    });

    documentoFinal.metadata = {
      version: '2.0',
      checksum: checksum,
      platform: 'GestARClimAS - ODS 13',
      createdAt: documentoFinal.createdAt,
      updatedAt: documentoFinal.updatedAt
    };

    // Grava exclusivamente no Firebase Firestore
    await this.firestoreDb.collection('diagnostics').doc(diagId).set(documentoFinal);
    return documentoFinal;
  }

  /**
   * Atualiza um laudo pericial existente no Firebase Firestore
   * @param {Object} laudoAtualizado Dados atualizados do laudo
   */
  async atualizarLaudo(laudoAtualizado) {
    this._tentarAutoInicializar();

    if (!this.isFirebaseReady || !this.firestoreDb) {
      throw new Error('Não foi possível conectar ao Firebase Firestore para atualizar o laudo.');
    }

    const dataHoraAtual = new Date().toISOString();
    const itemAtualizado = {
      ...laudoAtualizado,
      updatedAt: dataHoraAtual
    };

    if (itemAtualizado.metadata) {
      itemAtualizado.metadata.updatedAt = dataHoraAtual;
    }

    await this.firestoreDb.collection('diagnostics').doc(itemAtualizado.id).set(itemAtualizado, { merge: true });
    return itemAtualizado;
  }

  /**
   * Remove um laudo diretamente do Firebase Firestore
   * @param {string} id ID do laudo
   */
  async excluirLaudo(id) {
    this._tentarAutoInicializar();

    if (!this.isFirebaseReady || !this.firestoreDb) {
      throw new Error('Não foi possível conectar ao Firebase Firestore para excluir o laudo.');
    }

    try {
      await this.firestoreDb.collection('diagnostics').doc(id).delete();
      return true;
    } catch (err) {
      console.warn('[DatabaseService] Exclusão direta por doc ID falhou, buscando por campo id:', err);
      const snap = await this.firestoreDb.collection('diagnostics').where('id', '==', id).get();
      if (!snap.empty) {
        const batch = this.firestoreDb.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      return true;
    }
  }

  /**
   * Exclui uma pasta completa de escola e todos os seus laudos vinculados no Firestore
   * @param {string} schoolKey Chave identificadora da escola
   */
  async excluirPastaEscola(schoolKey) {
    this._tentarAutoInicializar();

    if (!this.isFirebaseReady || !this.firestoreDb) {
      throw new Error('Não foi possível conectar ao Firebase Firestore para excluir a pasta.');
    }

    try {
      const snapshot = await this.firestoreDb.collection('diagnostics').get();
      if (!snapshot || snapshot.empty) return true;

      const batch = this.firestoreDb.batch();
      let deleteCount = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data() || {};
        const docSchoolKey = data.schoolKey;
        const computedKey = this.gerarSchoolKey(data.escola?.nome, data.escola?.cidade, data.escola?.estado);

        // Deleta se a chave armazenada ou a chave calculada baterem com a chave da pasta
        if (docSchoolKey === schoolKey || computedKey === schoolKey) {
          batch.delete(doc.ref);
          deleteCount++;
        }
      });

      if (deleteCount > 0) {
        await batch.commit();
      }

      return true;
    } catch (err) {
      console.error('[DatabaseService] Erro ao excluir pasta escolar:', err);
      throw err;
    }
  }

  /**
   * Limpa todo o histórico de laudos no Firebase Firestore
   */
  async limparTodoHistorico() {
    this._tentarAutoInicializar();

    if (!this.isFirebaseReady || !this.firestoreDb) {
      throw new Error('Não foi possível conectar ao Firebase Firestore para resetar o histórico.');
    }

    const snapshot = await this.firestoreDb.collection('diagnostics').get();
    if (!snapshot.empty) {
      const batch = this.firestoreDb.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    this._limparArmazenamentoLocalLegado();
    return true;
  }

  /**
   * Retorna os laudos agrupados em pastas por unidade escolar a partir do Firestore
   */
  async obterEscolasAgrupadas() {
    const todosLaudos = await this.obterTodosLaudos();
    const pastasMap = new Map();

    todosLaudos.forEach(laudo => {
      if (!laudo || !laudo.escola || !laudo.escola.nome) return;

      const nomeEscola = (laudo.escola.nome || '').trim();
      const cidade = (laudo.escola.cidade || '').trim();
      const estado = (laudo.escola.estado || '').trim();
      const schoolKey = this.gerarSchoolKey(nomeEscola, cidade, estado);

      if (!pastasMap.has(schoolKey)) {
        pastasMap.set(schoolKey, {
          key: schoolKey,
          nome: nomeEscola,
          cidade: cidade,
          estado: estado,
          bairro: laudo.escola.bairro || '',
          rua: laudo.escola.rua || '',
          laudos: [],
          ultimoLaudo: null
        });
      }

      const pasta = pastasMap.get(schoolKey);
      // Evita duplicar o mesmo laudo dentro da pasta
      if (!pasta.laudos.some(l => l.id === laudo.id)) {
        pasta.laudos.push(laudo);
      }
    });

    const resultado = Array.from(pastasMap.values());
    resultado.forEach(pasta => {
      pasta.laudos.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      pasta.ultimoLaudo = pasta.laudos[0];
    });

    return resultado;
  }
}

// Disponibiliza no escopo global
window.DatabaseService = DatabaseService;
