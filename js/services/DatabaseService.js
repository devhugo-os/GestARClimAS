/**
 * ============================================================================
 * GestARClimAS - DatabaseService.js
 * Serviço de Persistência Unificada para Laudos e Pastas Escolares
 * (Arquitetura Híbrida Blindada: Firebase Firestore + Cache Local de Alta Performance)
 * ============================================================================
 */

class DatabaseService {
  constructor() {
    this.diagnosticsKey = 'gestarclimas_user_diagnostics';
    this.deletedIdsKey = 'gestarclimas_deleted_diag_ids';
    this.wipeTimestampKey = 'gestarclimas_history_wipe_time';
    this.firebaseApp = null;
    this.firestoreDb = null;
    this.isFirebaseReady = false;

    this._tentarAutoInicializar();
  }

  _tentarAutoInicializar() {
    try {
      if (typeof firebase !== 'undefined' && firebase.apps?.length) {
        this.firebaseApp = firebase.app();
        this.firestoreDb = firebase.firestore();
        this.isFirebaseReady = true;
      } else if (typeof window !== 'undefined' && window.GEST_FIREBASE_CONFIG && typeof firebase !== 'undefined') {
        this.inicializarFirebase(window.GEST_FIREBASE_CONFIG);
      }
    } catch (e) {
      this.isFirebaseReady = false;
    }
  }

  /**
   * Conecta e inicializa o Firebase SDK dinamicamente
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
      console.warn('[DatabaseService] Firebase fallback para cache local:', err.message);
      return false;
    }
  }

  _obterIdsExcluidos() {
    try {
      const raw = localStorage.getItem(this.deletedIdsKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  }

  _adicionarIdExcluido(id) {
    if (!id) return;
    const set = this._obterIdsExcluidos();
    set.add(id);
    localStorage.setItem(this.deletedIdsKey, JSON.stringify(Array.from(set)));
  }

  _obterTimestampLimpeza() {
    try {
      const val = localStorage.getItem(this.wipeTimestampKey);
      return val ? Number(val) : 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Obtém todos os laudos registrados no banco de dados com filtragem de exclusões
   */
  async obterTodosLaudos() {
    this._tentarAutoInicializar();

    const idsExcluidos = this._obterIdsExcluidos();
    const wipeTime = this._obterTimestampLimpeza();

    if (this.isFirebaseReady && this.firestoreDb) {
      try {
        const snapshot = await this.firestoreDb.collection('diagnostics').get();
        if (snapshot && !snapshot.empty) {
          let cloudItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Filtra itens marcados como excluídos ou anteriores à limpeza total
          cloudItems = cloudItems.filter(item => {
            if (idsExcluidos.has(item.id)) return false;
            if (wipeTime > 0) {
              const itemTime = new Date(item.createdAt || 0).getTime();
              if (itemTime <= wipeTime) return false;
            }
            return true;
          });

          cloudItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          localStorage.setItem(this.diagnosticsKey, JSON.stringify(cloudItems));
          return cloudItems;
        }
      } catch (err) {
        console.warn('[DatabaseService] Firestore offline/indisponível, usando cache local.');
      }
    }

    try {
      const data = localStorage.getItem(this.diagnosticsKey);
      let items = data ? JSON.parse(data) : [];
      if (!Array.isArray(items)) items = [];
      
      items = items.filter(item => {
        if (idsExcluidos.has(item.id)) return false;
        if (wipeTime > 0) {
          const itemTime = new Date(item.createdAt || 0).getTime();
          if (itemTime <= wipeTime) return false;
        }
        return true;
      });

      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return items;
    } catch (e) {
      return [];
    }
  }

  /**
   * Obtém os laudos emitidos por um usuário específico
   * @param {string} userId UID do usuário
   */
  async obterLaudosPorUsuario(userId) {
    const todos = await this.obterTodosLaudos();
    if (!userId) return todos;
    return todos.filter(d => d.userId === userId);
  }

  /**
   * Salva um novo laudo pericial vinculando ao usuário autenticado
   * @param {Object} laudoData Dados completos do laudo
   * @param {Object} usuario Usuário autenticado
   */
  async salvarLaudo(laudoData, usuario) {
    this._tentarAutoInicializar();

    const novoItem = {
      ...laudoData,
      id: laudoData.id || `DIAG_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: usuario?.uid || 'anonymous',
      userName: usuario?.nome || laudoData.escola?.avaliador || 'Avaliador',
      userPhoto: usuario?.fotoBase64 || '',
      createdAt: laudoData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Remove do conjunto de excluídos se porventura o ID coincidir
    const idsExcluidos = this._obterIdsExcluidos();
    if (idsExcluidos.has(novoItem.id)) {
      idsExcluidos.delete(novoItem.id);
      localStorage.setItem(this.deletedIdsKey, JSON.stringify(Array.from(idsExcluidos)));
    }

    if (this.isFirebaseReady && this.firestoreDb) {
      try {
        await this.firestoreDb.collection('diagnostics').doc(novoItem.id).set(novoItem);
      } catch (err) {
        console.warn('[DatabaseService] Gravação Firestore em fila local:', err.message);
      }
    }

    // Persistência em cache local
    let todos = [];
    try {
      todos = JSON.parse(localStorage.getItem(this.diagnosticsKey)) || [];
      if (!Array.isArray(todos)) todos = [];
    } catch (e) {
      todos = [];
    }

    todos.unshift(novoItem);
    if (todos.length > 300) todos.pop();

    localStorage.setItem(this.diagnosticsKey, JSON.stringify(todos));
    return novoItem;
  }

  /**
   * Atualiza um laudo pericial existente
   * @param {Object} laudoAtualizado Dados atualizados do laudo
   */
  async atualizarLaudo(laudoAtualizado) {
    this._tentarAutoInicializar();

    const itemAtualizado = {
      ...laudoAtualizado,
      updatedAt: new Date().toISOString()
    };

    if (this.isFirebaseReady && this.firestoreDb) {
      try {
        await this.firestoreDb.collection('diagnostics').doc(itemAtualizado.id).set(itemAtualizado, { merge: true });
      } catch (err) {
        console.warn('[DatabaseService] Atualização Firestore em fila local:', err.message);
      }
    }

    let todos = [];
    try {
      todos = JSON.parse(localStorage.getItem(this.diagnosticsKey)) || [];
      if (!Array.isArray(todos)) todos = [];
    } catch (e) {
      todos = [];
    }

    const idx = todos.findIndex(d => d.id === itemAtualizado.id);
    if (idx !== -1) {
      todos[idx] = itemAtualizado;
    } else {
      todos.unshift(itemAtualizado);
    }
    localStorage.setItem(this.diagnosticsKey, JSON.stringify(todos));
    return itemAtualizado;
  }

  /**
   * Remove um laudo pelo seu identificador
   * @param {string} id ID do laudo
   */
  async excluirLaudo(id) {
    this._tentarAutoInicializar();

    // Marca como excluído localmente para nunca mais ser ressuscitado
    this._adicionarIdExcluido(id);

    if (this.isFirebaseReady && this.firestoreDb) {
      try {
        await this.firestoreDb.collection('diagnostics').doc(id).delete();
      } catch (err) {
        console.warn('[DatabaseService] Exclusão Firestore (mantido localmente):', err.message);
      }
    }

    let todos = [];
    try {
      todos = JSON.parse(localStorage.getItem(this.diagnosticsKey)) || [];
      if (!Array.isArray(todos)) todos = [];
    } catch (e) {
      todos = [];
    }

    todos = todos.filter(d => d.id !== id);
    localStorage.setItem(this.diagnosticsKey, JSON.stringify(todos));
    return true;
  }

  /**
   * Exclui uma pasta completa de escola e todos os seus laudos vinculados
   * @param {string} schoolKey Chave identificadora da escola
   */
  async excluirPastaEscola(schoolKey) {
    this._tentarAutoInicializar();

    let todos = [];
    try {
      todos = JSON.parse(localStorage.getItem(this.diagnosticsKey)) || [];
      if (!Array.isArray(todos)) todos = [];
    } catch (e) {
      todos = [];
    }

    const laudosDaPasta = todos.filter(d => {
      const k = d.schoolKey || `${d.escola?.nome}_${d.escola?.cidade}_${d.escola?.estado}`.toLowerCase().replace(/\s+/g, '_');
      return k === schoolKey;
    });

    laudosDaPasta.forEach(l => this._adicionarIdExcluido(l.id));

    if (this.isFirebaseReady && this.firestoreDb) {
      try {
        const snapshot = await this.firestoreDb.collection('diagnostics').where('schoolKey', '==', schoolKey).get();
        if (!snapshot.empty) {
          const batch = this.firestoreDb.batch();
          snapshot.docs.forEach(doc => {
            this._adicionarIdExcluido(doc.id);
            batch.delete(doc.ref);
          });
          await batch.commit();
        }
      } catch (err) {
        console.warn('[DatabaseService] Exclusão de pasta Firestore (mantido localmente):', err.message);
      }
    }

    todos = todos.filter(d => {
      const k = d.schoolKey || `${d.escola?.nome}_${d.escola?.cidade}_${d.escola?.estado}`.toLowerCase().replace(/\s+/g, '_');
      return k !== schoolKey;
    });
    localStorage.setItem(this.diagnosticsKey, JSON.stringify(todos));
    return true;
  }

  /**
   * Limpa todo o histórico de laudos com proteção contra ressuscitação de dados
   */
  async limparTodoHistorico() {
    this._tentarAutoInicializar();

    // Registra timestamp de corte para ignorar quaisquer registros remotos antigos
    localStorage.setItem(this.wipeTimestampKey, Date.now().toString());

    if (this.isFirebaseReady && this.firestoreDb) {
      try {
        const snapshot = await this.firestoreDb.collection('diagnostics').get();
        if (!snapshot.empty) {
          const batch = this.firestoreDb.batch();
          snapshot.docs.forEach(doc => {
            this._adicionarIdExcluido(doc.id);
            batch.delete(doc.ref);
          });
          await batch.commit();
        }
      } catch (err) {
        console.warn('[DatabaseService] Limpeza Firestore (ignorado devido a regras de segurança do servidor):', err.message);
      }
    }

    localStorage.removeItem(this.diagnosticsKey);
    return true;
  }

  /**
   * Retorna os laudos agrupados em pastas por unidade escolar
   */
  async obterEscolasAgrupadas() {
    const todosLaudos = await this.obterTodosLaudos();
    const pastasMap = new Map();

    todosLaudos.forEach(laudo => {
      if (!laudo || !laudo.escola || !laudo.escola.nome) return;

      const nomeEscola = laudo.escola.nome.trim();
      const cidade = laudo.escola.cidade || '';
      const estado = laudo.escola.estado || '';
      const schoolKey = laudo.schoolKey || `${nomeEscola}_${cidade}_${estado}`.toLowerCase().replace(/\s+/g, '_');

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
      pasta.laudos.push(laudo);
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
