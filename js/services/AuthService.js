/**
 * ============================================================================
 * GestARClimAS - AuthService.js
 * Serviço de Autenticação e Gestão de Usuários 100% em Nuvem (Firebase Auth & Firestore)
 * Projeto: projetogeo-1337f
 * ============================================================================
 */

class AuthService {
  constructor() {
    this.sessionKey = 'gestarclimas_firebase_session';
    this.currentUser = null;
    this.firebaseAuth = null;
    this.firestoreDb = null;

    this._inicializarFirebase();
    this._restaurarSessao();
    this._ouvirEstadoAutenticacao();
  }

  /**
   * Inicializa instâncias do Firebase Auth e Firestore SDK
   */
  _inicializarFirebase() {
    try {
      if (typeof firebase !== 'undefined') {
        if (!firebase.apps?.length && typeof window !== 'undefined' && window.GEST_FIREBASE_CONFIG) {
          firebase.initializeApp(window.GEST_FIREBASE_CONFIG);
        }
        if (firebase.apps?.length) {
          this.firebaseAuth = firebase.auth();
          this.firestoreDb = firebase.firestore();
        }
      }
    } catch (e) {
      console.warn('[AuthService] Falha ao inicializar Firebase:', e);
    }
  }

  /**
   * Restaura sessão ativa em memória a partir de sessionStorage
   */
  _restaurarSessao() {
    try {
      const sessao = sessionStorage.getItem(this.sessionKey);
      if (sessao) {
        this.currentUser = JSON.parse(sessao);
      }
    } catch (e) {
      this.currentUser = null;
    }
  }

  /**
   * Monitora alterações de autenticação em tempo real no Firebase
   */
  _ouvirEstadoAutenticacao() {
    if (!this.firebaseAuth) return;
    try {
      this.firebaseAuth.onAuthStateChanged(async (fbUser) => {
        if (fbUser) {
          if (!this.currentUser || this.currentUser.uid !== fbUser.uid) {
            await this._sincronizarUsuarioFirestore(fbUser);
          }
        } else {
          this.currentUser = null;
          sessionStorage.removeItem(this.sessionKey);
        }
      });
    } catch (e) {
      console.warn('[AuthService] Erro ao monitorar authState:', e);
    }
  }

  /**
   * Sincroniza dados cadastrais do Firestore para o estado local
   */
  async _sincronizarUsuarioFirestore(fbUser) {
    if (!fbUser || !this.firestoreDb) return null;

    try {
      const docSnap = await this.firestoreDb.collection('users').doc(fbUser.uid).get();
      let dados = {
        uid: fbUser.uid,
        nome: fbUser.displayName || 'Avaliador Escolar',
        email: fbUser.email ? fbUser.email.toLowerCase() : '',
        fotoBase64: fbUser.photoURL || this._gerarAvatarPadrao(fbUser.displayName || 'A'),
        role: 'avaliador',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (docSnap && docSnap.exists) {
        dados = { ...dados, ...docSnap.data(), uid: fbUser.uid };
      } else {
        const checksum = await this._gerarHash(`${dados.uid}_${dados.email}_GESTARCLIMAS_SECURE`);
        dados._securityChecksum = checksum;
        await this.firestoreDb.collection('users').doc(fbUser.uid).set(dados);
      }

      this._salvarSessao(dados);
      return dados;
    } catch (err) {
      console.warn('[AuthService] Sincronização Firestore:', err);
      const fallback = {
        uid: fbUser.uid,
        nome: fbUser.displayName || 'Avaliador Escolar',
        email: fbUser.email ? fbUser.email.toLowerCase() : '',
        fotoBase64: fbUser.photoURL || this._gerarAvatarPadrao(fbUser.displayName || 'A'),
        role: 'avaliador'
      };
      this._salvarSessao(fallback);
      return fallback;
    }
  }

  /**
   * Gera Hash Criptográfico Seguro SHA-256 para integridade e validação
   */
  async _gerarHash(texto) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(texto);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return btoa(unescape(encodeURIComponent(texto)));
    }
  }

  /**
   * Aguarda a inicialização do Firebase Auth para checagem precisa de sessão ativa
   */
  async garantirAutenticacaoPronta() {
    this._inicializarFirebase();
    if (this.currentUser && this.currentUser.uid) {
      return this.currentUser;
    }
    if (!this.firebaseAuth) {
      return this.currentUser;
    }
    return new Promise((resolve) => {
      let finalizado = false;
      const unsubscribe = this.firebaseAuth.onAuthStateChanged(async (fbUser) => {
        if (finalizado) return;
        finalizado = true;
        unsubscribe();
        if (fbUser) {
          const user = await this._sincronizarUsuarioFirestore(fbUser);
          resolve(user);
        } else {
          resolve(null);
        }
      });
      // Timeout de segurança (1.5 segundos)
      setTimeout(() => {
        if (!finalizado) {
          finalizado = true;
          unsubscribe();
          resolve(this.currentUser);
        }
      }, 1500);
    });
  }

  /**
   * Retorna os dados do usuário atualmente autenticado
   */
  obterUsuarioAtual() {
    if (this.currentUser) return this.currentUser;
    if (this.firebaseAuth?.currentUser) {
      const u = this.firebaseAuth.currentUser;
      return {
        uid: u.uid,
        nome: u.displayName || 'Avaliador',
        email: u.email || '',
        fotoBase64: u.photoURL || this._gerarAvatarPadrao(u.displayName || 'A')
      };
    }
    return null;
  }

  /**
   * Verifica se há um usuário ativo logado no Firebase
   */
  estaAutenticado() {
    return !!this.currentUser && !!this.currentUser.uid;
  }

  /**
   * Realiza autenticação segura via Google OAuth (Login e Cadastro Unificado)
   */
  async loginComGoogle() {
    this._inicializarFirebase();

    if (!this.firebaseAuth || !this.firestoreDb) {
      throw new Error('Serviço Firebase indisponível. Verifique sua conexão com a internet.');
    }

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await this.firebaseAuth.signInWithPopup(provider);
      const fbUser = result.user;

      const dadosUsuario = await this._sincronizarUsuarioFirestore(fbUser);
      return dadosUsuario;
    } catch (err) {
      console.error('[AuthService] Erro ao autenticar com Google:', err);
      const code = err.code || '';
      if (code === 'auth/popup-closed-by-user') {
        throw new Error('A janela de login do Google foi fechada antes da conclusão.');
      }
      if (code === 'auth/cancelled-popup-request') {
        throw new Error('Solicitação de popup cancelada.');
      }
      if (code === 'auth/popup-blocked') {
        throw new Error('O popup de login foi bloqueado pelo seu navegador. Por favor, autorize popups para este site.');
      }
      throw new Error(err.message || 'Falha ao autenticar com sua conta Google.');
    }
  }

  /**
   * Realiza login exclusivamente via Firebase Auth & Firestore
   */
  async login(email, senha) {
    const emailLimpo = (email || '').trim().toLowerCase();
    const senhaLimpa = (senha || '').trim();

    if (!emailLimpo || !senhaLimpa) {
      throw new Error('Por favor, informe seu e-mail e senha cadastrados.');
    }

    this._inicializarFirebase();

    if (!this.firebaseAuth) {
      throw new Error('Serviço do Firebase não inicializado. Verifique sua conexão à internet.');
    }

    try {
      const userCredential = await this.firebaseAuth.signInWithEmailAndPassword(emailLimpo, senhaLimpa);
      const fbUser = userCredential.user;

      const dadosUsuario = await this._sincronizarUsuarioFirestore(fbUser);
      return dadosUsuario;
    } catch (fbErr) {
      console.error('[AuthService] Erro ao autenticar no Firebase:', fbErr);
      const code = fbErr.code || '';
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/invalid-login-credentials'
      ) {
        throw new Error('E-mail ou senha incorretos no Firebase.');
      }
      if (code === 'auth/invalid-email') {
        throw new Error('O formato do e-mail informado é inválido.');
      }
      if (code === 'auth/user-disabled') {
        throw new Error('Esta conta de usuário foi desativada no Firebase.');
      }
      if (code === 'auth/too-many-requests') {
        throw new Error('Acesso bloqueado temporariamente por excesso de tentativas. Tente novamente mais tarde.');
      }
      throw new Error(fbErr.message || 'Falha na autenticação via Firebase.');
    }
  }

  /**
   * Realiza cadastro de novo usuário no Firebase Auth e registra perfil no Firestore
   */
  async cadastrar({ nome, email, senha, fotoBase64 }) {
    const nomeLimpo = (nome || '').trim();
    const emailLimpo = (email || '').trim().toLowerCase();
    const senhaLimpa = (senha || '').trim();

    if (!nomeLimpo || !emailLimpo || !senhaLimpa) {
      throw new Error('Nome completo, e-mail e senha são obrigatórios.');
    }

    if (senhaLimpa.length < 6) {
      throw new Error('A senha deve conter no mínimo 6 caracteres.');
    }

    this._inicializarFirebase();

    if (!this.firebaseAuth || !this.firestoreDb) {
      throw new Error('Serviço Firebase indisponível. Verifique sua conexão à internet.');
    }

    const avatarFinal = fotoBase64 || this._gerarAvatarPadrao(nomeLimpo);

    try {
      // 1. Cria usuário no Firebase Authentication
      const userCredential = await this.firebaseAuth.createUserWithEmailAndPassword(emailLimpo, senhaLimpa);
      const fbUser = userCredential.user;

      // 2. Atualiza perfil no Firebase Auth
      try {
        await fbUser.updateProfile({
          displayName: nomeLimpo,
          photoURL: avatarFinal.startsWith('data:') ? '' : avatarFinal
        });
      } catch (e) {}

      // 3. Gera hash de integridade criptográfico SHA-256
      const checksum = await this._gerarHash(`${fbUser.uid}_${emailLimpo}_GESTARCLIMAS_SECURE`);

      // 4. Salva documento organizado no Firestore users/{uid}
      const novoUsuarioFirestore = {
        uid: fbUser.uid,
        nome: nomeLimpo,
        email: emailLimpo,
        fotoBase64: avatarFinal,
        role: 'avaliador',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _securityChecksum: checksum
      };

      await this.firestoreDb.collection('users').doc(fbUser.uid).set(novoUsuarioFirestore);

      this._salvarSessao(novoUsuarioFirestore);
      return novoUsuarioFirestore;
    } catch (fbErr) {
      console.error('[AuthService] Erro ao cadastrar no Firebase:', fbErr);
      const code = fbErr.code || '';
      if (
        code === 'auth/email-already-in-use' ||
        code === 'auth/email-already-exists' ||
        code === 'auth/credential-already-in-use'
      ) {
        throw new Error('Este e-mail já está cadastrado na plataforma Firebase. Por favor, faça login com sua senha.');
      }
      if (code === 'auth/weak-password') {
        throw new Error('A senha informada deve ter pelo menos 6 caracteres.');
      }
      if (code === 'auth/invalid-email') {
        throw new Error('O formato do e-mail informado é inválido.');
      }
      throw new Error(fbErr.message || 'Falha ao registrar novo usuário no Firebase.');
    }
  }

  /**
   * Atualiza as informações do perfil no Firebase Auth e no Firestore
   */
  async atualizarPerfil({ nome, fotoBase64 }) {
    if (!this.currentUser || !this.currentUser.uid) {
      throw new Error('Nenhum usuário autenticado no sistema.');
    }

    this._inicializarFirebase();
    const uid = this.currentUser.uid;

    if (nome) this.currentUser.nome = nome.trim();
    if (fotoBase64) this.currentUser.fotoBase64 = fotoBase64;
    this.currentUser.updatedAt = new Date().toISOString();

    // Atualiza Firestore
    if (this.firestoreDb && uid) {
      try {
        const checksum = await this._gerarHash(`${uid}_${this.currentUser.email}_${this.currentUser.nome}_GESTARCLIMAS_SECURE`);
        await this.firestoreDb.collection('users').doc(uid).set({
          nome: this.currentUser.nome,
          fotoBase64: this.currentUser.fotoBase64,
          updatedAt: this.currentUser.updatedAt,
          _securityChecksum: checksum
        }, { merge: true });
      } catch (e) {
        console.warn('[AuthService] Atualização de perfil no Firestore:', e);
      }
    }

    // Atualiza Firebase Auth
    if (this.firebaseAuth?.currentUser) {
      try {
        await this.firebaseAuth.currentUser.updateProfile({
          displayName: this.currentUser.nome,
          photoURL: this.currentUser.fotoBase64.startsWith('data:') ? '' : this.currentUser.fotoBase64
        });
      } catch (e) {}
    }

    this._salvarSessao(this.currentUser);
    return this.currentUser;
  }

  /**
   * Exclui a conta do usuário no Firestore e no Firebase Auth
   */
  async excluirConta() {
    if (!this.currentUser || !this.currentUser.uid) {
      throw new Error('Nenhum usuário logado para exclusão.');
    }

    this._inicializarFirebase();
    const uid = this.currentUser.uid;

    if (this.firestoreDb && uid) {
      try {
        await this.firestoreDb.collection('users').doc(uid).delete();
      } catch (e) {
        console.warn('[AuthService] Erro ao deletar documento de usuário no Firestore:', e);
      }
    }

    if (this.firebaseAuth && this.firebaseAuth.currentUser) {
      try {
        await this.firebaseAuth.currentUser.delete();
      } catch (e) {
        console.warn('[AuthService] Erro ao deletar conta no Firebase Auth:', e);
      }
    }

    await this.logout();
    return true;
  }

  /**
   * Compacta uma imagem para Base64 otimizada (~8 KB)
   */
  compactarImagemBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Por favor, selecione um arquivo de imagem válido.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 128;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const base64Data = canvas.toDataURL('image/jpeg', 0.75);
          const sizeKb = Math.round((base64Data.length * 3/4) / 1024);
          
          resolve({
            base64: base64Data,
            sizeKb
          });
        };
        img.onerror = () => reject(new Error('Falha ao processar a imagem.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Erro na leitura do arquivo.'));
      reader.readAsDataURL(file);
    });
  }

  _salvarSessao(usuario) {
    this.currentUser = {
      uid: usuario.uid,
      nome: usuario.nome,
      email: usuario.email,
      fotoBase64: usuario.fotoBase64,
      role: usuario.role || 'avaliador',
      createdAt: usuario.createdAt
    };
    sessionStorage.setItem(this.sessionKey, JSON.stringify(this.currentUser));
  }

  async logout() {
    this._inicializarFirebase();
    if (this.firebaseAuth) {
      try {
        await this.firebaseAuth.signOut();
      } catch (e) {}
    }
    this.currentUser = null;
    sessionStorage.removeItem(this.sessionKey);
    // Limpa quaisquer restos legados de localStorage
    try {
      localStorage.removeItem('gestarclimas_auth_users');
      localStorage.removeItem('gestarclimas_auth_session');
      localStorage.removeItem('gestarclimas_auth_recovery_token');
    } catch (e) {}
  }

  _gerarAvatarPadrao(nome) {
    const iniciais = (nome || 'A')
      .split(' ')
      .slice(0, 2)
      .map(p => p[0])
      .join('')
      .toUpperCase();

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
        <rect width="128" height="128" fill="#10b981"/>
        <text x="64" y="74" font-family="'Plus Jakarta Sans', sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
          ${iniciais}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}

// Disponibiliza no escopo global
window.AuthService = AuthService;
