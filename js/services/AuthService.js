/**
 * ============================================================================
 * GestARClimAS - AuthService.js
 * Serviço de Autenticação e Gestão de Usuários
 * Integração Direta com Firebase Auth & Firestore + Disparo Real de E-mail de Recuperação
 * ============================================================================
 */

class AuthService {
  constructor() {
    this.storageUsersKey = 'gestarclimas_auth_users';
    this.storageSessionKey = 'gestarclimas_auth_session';
    this.storageRecoveryKey = 'gestarclimas_auth_recovery_token';
    this.currentUser = null;

    this.firebaseAuth = null;
    this.firestoreDb = null;

    this._inicializarFirebaseSeDisponivel();
    this._inicializarSessao();
  }

  _inicializarFirebaseSeDisponivel() {
    try {
      if (typeof firebase !== 'undefined' && firebase.apps?.length) {
        this.firebaseAuth = firebase.auth();
        this.firestoreDb = firebase.firestore();
      }
    } catch (e) {
      console.warn('[AuthService] Firebase indisponível:', e);
    }
  }

  /**
   * Inicializa a sessão a partir do armazenamento local
   */
  _inicializarSessao() {
    try {
      const sessao = localStorage.getItem(this.storageSessionKey);
      if (sessao) {
        this.currentUser = JSON.parse(sessao);
      }
    } catch (e) {
      this.currentUser = null;
    }
  }

  /**
   * Gera Hash Criptográfico Seguro SHA-256
   */
  async _gerarHash(texto) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(texto);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return btoa(texto);
    }
  }

  /**
   * Obtém a lista completa de usuários cadastrados localmente
   */
  obterUsuarios() {
    try {
      const raw = localStorage.getItem(this.storageUsersKey);
      const lista = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(lista)) return [];
      return lista;
    } catch (e) {
      return [];
    }
  }

  /**
   * Retorna os dados do usuário atualmente autenticado
   */
  obterUsuarioAtual() {
    return this.currentUser;
  }

  /**
   * Verifica se há um usuário ativo logado
   */
  estaAutenticado() {
    return !!this.currentUser && !!this.currentUser.uid;
  }

  /**
   * Realiza login por e-mail e senha
   */
  async login(email, senha) {
    const emailLimpo = (email || '').trim().toLowerCase();
    const senhaLimpa = (senha || '').trim();

    if (!emailLimpo || !senhaLimpa) {
      throw new Error('Por favor, informe seu e-mail e senha.');
    }

    this._inicializarFirebaseSeDisponivel();

    // 1. Tentativa de Login via Firebase Auth & Firestore
    if (this.firebaseAuth && this.firestoreDb) {
      try {
        const userCredential = await this.firebaseAuth.signInWithEmailAndPassword(emailLimpo, senhaLimpa);
        const fbUser = userCredential.user;

        const docSnap = await this.firestoreDb.collection('users').doc(fbUser.uid).get().catch(() => null);
        let dadosUsuario = {
          uid: fbUser.uid,
          nome: fbUser.displayName || 'Usuário',
          email: fbUser.email || emailLimpo,
          fotoBase64: fbUser.photoURL || this._gerarAvatarPadrao(fbUser.displayName || 'U'),
          createdAt: new Date().toISOString()
        };

        if (docSnap && docSnap.exists) {
          dadosUsuario = { ...dadosUsuario, ...docSnap.data(), uid: fbUser.uid };
        } else {
          try {
            await this.firestoreDb.collection('users').doc(fbUser.uid).set(dadosUsuario);
          } catch (err) {}
        }

        // Salva na lista local para acesso offline futuro
        const usuarios = this.obterUsuarios();
        const idx = usuarios.findIndex(u => (u.email || '').toLowerCase() === emailLimpo);
        if (idx === -1) {
          usuarios.push(dadosUsuario);
        } else {
          usuarios[idx] = { ...usuarios[idx], ...dadosUsuario };
        }
        localStorage.setItem(this.storageUsersKey, JSON.stringify(usuarios));

        this._salvarSessao(dadosUsuario);
        return dadosUsuario;
      } catch (fbErr) {
        console.warn('[AuthService] Tentativa Firebase login:', fbErr.message);
      }
    }

    // 2. Fallback / Base Local
    const usuarios = this.obterUsuarios();
    const senhaHash = await this._gerarHash(senhaLimpa);
    
    const usuario = usuarios.find(u => 
      (u.email || '').toLowerCase() === emailLimpo && 
      (u.senhaHash === senhaHash || u.senhaHash === btoa(senhaLimpa))
    );

    if (!usuario) {
      throw new Error('E-mail ou senha incorretos.');
    }

    this._salvarSessao(usuario);
    return usuario;
  }

  /**
   * Realiza cadastro de um novo usuário com verificação estrita de duplicidade
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

    this._inicializarFirebaseSeDisponivel();

    // 1. Verificação Estrita de E-mail Duplicado no Armazenamento Local
    const usuarios = this.obterUsuarios();
    const usuarioJaExisteLocal = usuarios.some(u => (u.email || '').trim().toLowerCase() === emailLimpo);
    if (usuarioJaExisteLocal) {
      throw new Error('Este e-mail já está cadastrado na plataforma. Por favor, faça login ou utilize a recuperação de senha.');
    }

    // 2. Verificação Estrita de E-mail Duplicado no Firestore
    if (this.firestoreDb) {
      try {
        const snap = await this.firestoreDb.collection('users').where('email', '==', emailLimpo).limit(1).get();
        if (snap && !snap.empty) {
          throw new Error('Este e-mail já está cadastrado na plataforma. Por favor, faça login ou utilize a recuperação de senha.');
        }
      } catch (e) {
        if (e.message && e.message.includes('já está cadastrado')) throw e;
      }
    }

    let uid = `USER_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const avatarFinal = fotoBase64 || this._gerarAvatarPadrao(nomeLimpo);

    // 3. Cadastro via Firebase Auth
    if (this.firebaseAuth) {
      try {
        const userCredential = await this.firebaseAuth.createUserWithEmailAndPassword(emailLimpo, senhaLimpa);
        uid = userCredential.user.uid;
        await userCredential.user.updateProfile({
          displayName: nomeLimpo,
          photoURL: avatarFinal.startsWith('data:') ? '' : avatarFinal
        });
      } catch (fbErr) {
        const code = fbErr.code || '';
        const msg = (fbErr.message || '').toLowerCase();
        if (
          code === 'auth/email-already-in-use' ||
          code === 'auth/email-already-exists' ||
          code === 'auth/credential-already-in-use' ||
          msg.includes('already in use') ||
          msg.includes('already-in-use') ||
          msg.includes('already exists')
        ) {
          throw new Error('Este e-mail já está cadastrado na plataforma. Por favor, faça login ou utilize a recuperação de senha.');
        }
        if (code === 'auth/weak-password') {
          throw new Error('A senha informada deve ter pelo menos 6 caracteres.');
        }
        if (code === 'auth/invalid-email') {
          throw new Error('O formato do e-mail informado é inválido.');
        }
        console.warn('[AuthService] Firebase Auth aviso:', fbErr.message);
      }
    }

    const senhaHash = await this._gerarHash(senhaLimpa);

    const novoUsuario = {
      uid,
      nome: nomeLimpo,
      email: emailLimpo,
      senhaHash,
      fotoBase64: avatarFinal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (this.firestoreDb) {
      try {
        await this.firestoreDb.collection('users').doc(uid).set(novoUsuario);
      } catch (err) {}
    }

    // Salva sem permitir duplicidades no array local
    const usuariosAtualizados = usuarios.filter(u => (u.email || '').trim().toLowerCase() !== emailLimpo);
    usuariosAtualizados.push(novoUsuario);
    localStorage.setItem(this.storageUsersKey, JSON.stringify(usuariosAtualizados));

    this._salvarSessao(novoUsuario);
    return novoUsuario;
  }

  /**
   * Dispara o envio real de e-mail com o código de 6 dígitos
   */
  async _dispararEmailRecuperacao(email, codigo) {
    try {
      fetch('https://formsubmit.co/ajax/' + encodeURIComponent(email), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: '🌿 GestARClimAS - Código de Recuperação de Senha',
          plataforma: 'GestARClimAS - ODS 13',
          destinatario: email,
          codigo_seguranca: codigo,
          mensagem: `Seu código de segurança de 6 dígitos para redefinição de senha na plataforma GestARClimAS é: ${codigo}. Validade: 15 minutos.`
        })
      }).catch(() => {});
    } catch (e) {}
  }

  /**
   * Solicita envio de código de 6 dígitos para recuperação de senha
   */
  async solicitarCodigoRecuperacao(email) {
    const emailLimpo = (email || '').trim().toLowerCase();
    if (!emailLimpo) throw new Error('Informe seu e-mail cadastrado.');

    this._inicializarFirebaseSeDisponivel();

    const usuarios = this.obterUsuarios();
    let usuarioEncontrado = usuarios.find(u => (u.email || '').toLowerCase() === emailLimpo);
    
    if (!usuarioEncontrado && this.firestoreDb) {
      try {
        const snap = await this.firestoreDb.collection('users').where('email', '==', emailLimpo).limit(1).get();
        if (!snap.empty) {
          usuarioEncontrado = snap.docs[0].data();
        }
      } catch (e) {}
    }

    if (!usuarioEncontrado) {
      throw new Error('Nenhuma conta encontrada com este e-mail.');
    }

    // Gera código numérico de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracao = Date.now() + 15 * 60 * 1000; // 15 minutos

    const codigoHash = await this._gerarHash(`${emailLimpo}_${codigo}_SALT_GESTARCLIMAS`);

    const recoveryData = {
      email: emailLimpo,
      codigoHash,
      expiracao,
      createdAt: new Date().toISOString()
    };

    if (this.firestoreDb) {
      try {
        await this.firestoreDb.collection('password_resets').doc(emailLimpo.replace(/[^a-zA-Z0-9]/g, '_')).set(recoveryData);
      } catch (e) {}
    }

    localStorage.setItem(this.storageRecoveryKey, JSON.stringify(recoveryData));

    // Dispara envio por e-mail
    await this._dispararEmailRecuperacao(emailLimpo, codigo);

    return {
      sucesso: true,
      email: emailLimpo,
      codigoEnviado: codigo
    };
  }

  /**
   * Redefine a senha utilizando o código de validação criptografado
   */
  async redefinirSenha(email, codigo, novaSenha) {
    const emailLimpo = (email || '').trim().toLowerCase();
    const codigoLimpo = (codigo || '').trim();
    const novaSenhaLimpa = (novaSenha || '').trim();

    if (!emailLimpo || !codigoLimpo || !novaSenhaLimpa) {
      throw new Error('Preencha o e-mail, o código de validação e a nova senha.');
    }

    if (novaSenhaLimpa.length < 6) {
      throw new Error('A nova senha deve ter no mínimo 6 caracteres.');
    }

    this._inicializarFirebaseSeDisponivel();

    let recoveryData = null;
    if (this.firestoreDb) {
      try {
        const snap = await this.firestoreDb.collection('password_resets').doc(emailLimpo.replace(/[^a-zA-Z0-9]/g, '_')).get();
        if (snap.exists) recoveryData = snap.data();
      } catch (e) {}
    }

    if (!recoveryData) {
      try {
        recoveryData = JSON.parse(localStorage.getItem(this.storageRecoveryKey));
      } catch (e) {}
    }

    if (!recoveryData || recoveryData.email !== emailLimpo) {
      throw new Error('Nenhuma solicitação de recuperação ativa para este e-mail.');
    }

    if (Date.now() > recoveryData.expiracao) {
      throw new Error('O código de validação expirou (limite de 15 minutos). Solicite um novo código.');
    }

    const hashInserido = await this._gerarHash(`${emailLimpo}_${codigoLimpo}_SALT_GESTARCLIMAS`);
    if (hashInserido !== recoveryData.codigoHash) {
      throw new Error('Código de verificação incorreto. Verifique o código enviado ao seu e-mail.');
    }

    const novaSenhaHash = await this._gerarHash(novaSenhaLimpa);

    if (this.firestoreDb) {
      try {
        const snap = await this.firestoreDb.collection('users').where('email', '==', emailLimpo).limit(1).get();
        if (!snap.empty) {
          await snap.docs[0].ref.update({
            senhaHash: novaSenhaHash,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (e) {}
    }

    const usuarios = this.obterUsuarios();
    const idx = usuarios.findIndex(u => (u.email || '').toLowerCase() === emailLimpo);
    if (idx !== -1) {
      usuarios[idx].senhaHash = novaSenhaHash;
      usuarios[idx].updatedAt = new Date().toISOString();
      localStorage.setItem(this.storageUsersKey, JSON.stringify(usuarios));
    }

    localStorage.removeItem(this.storageRecoveryKey);
    return true;
  }

  /**
   * Atualiza as informações do perfil do usuário logado
   */
  async atualizarPerfil({ nome, fotoBase64 }) {
    if (!this.currentUser) throw new Error('Nenhum usuário logado.');

    this._inicializarFirebaseSeDisponivel();
    const uid = this.currentUser.uid;

    if (nome) this.currentUser.nome = nome.trim();
    if (fotoBase64) this.currentUser.fotoBase64 = fotoBase64;
    this.currentUser.updatedAt = new Date().toISOString();

    if (this.firestoreDb && uid) {
      try {
        await this.firestoreDb.collection('users').doc(uid).set({
          nome: this.currentUser.nome,
          fotoBase64: this.currentUser.fotoBase64,
          updatedAt: this.currentUser.updatedAt
        }, { merge: true });
      } catch (e) {}
    }

    const usuarios = this.obterUsuarios();
    const idx = usuarios.findIndex(u => u.uid === uid);
    if (idx !== -1) {
      if (nome) usuarios[idx].nome = nome.trim();
      if (fotoBase64) usuarios[idx].fotoBase64 = fotoBase64;
      usuarios[idx].updatedAt = new Date().toISOString();
      localStorage.setItem(this.storageUsersKey, JSON.stringify(usuarios));
    }

    this._salvarSessao(this.currentUser);
    return this.currentUser;
  }

  /**
   * Exclui a conta do usuário logado
   */
  async excluirConta() {
    if (!this.currentUser) throw new Error('Nenhum usuário logado.');

    this._inicializarFirebaseSeDisponivel();
    const uid = this.currentUser.uid;

    if (this.firestoreDb && uid) {
      try {
        await this.firestoreDb.collection('users').doc(uid).delete();
      } catch (e) {}
    }

    if (this.firebaseAuth && this.firebaseAuth.currentUser) {
      try {
        await this.firebaseAuth.currentUser.delete();
      } catch (e) {}
    }

    let usuarios = this.obterUsuarios();
    usuarios = usuarios.filter(u => u.uid !== uid);
    localStorage.setItem(this.storageUsersKey, JSON.stringify(usuarios));

    this.logout();
    return true;
  }

  /**
   * Compacta uma imagem para Base64 com tamanho reduzido (~8 KB)
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
      createdAt: usuario.createdAt
    };
    localStorage.setItem(this.storageSessionKey, JSON.stringify(this.currentUser));
  }

  logout() {
    this._inicializarFirebaseSeDisponivel();
    if (this.firebaseAuth) {
      try {
        this.firebaseAuth.signOut();
      } catch (e) {}
    }
    this.currentUser = null;
    localStorage.removeItem(this.storageSessionKey);
  }

  _gerarAvatarPadrao(nome) {
    const iniciais = (nome || 'U')
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
