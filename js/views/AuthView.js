/**
 * ============================================================================
 * GestARClimAS - AuthView.js
 * View: Autenticação Segura em login.html (Login, Cadastro Enxuto e Recuperação Criptografada com Notificação)
 * e Gestão do Perfil Oficial em index.html
 * ============================================================================
 */

class AuthView {
  constructor(authService) {
    this.authService = authService;
    this.currentMode = 'login'; // 'login' | 'register' | 'forgot' | 'reset'
    this.tempPhotoBase64 = '';
    this.tempRecoveryEmail = '';
  }

  init(onAuthSuccessCallback) {
    this.onAuthSuccess = onAuthSuccessCallback;
    this.bindAuthEvents();
    this.bindProfileEvents();
  }

  /**
   * Vincula os eventos da tela de autenticação (Login, Cadastro e Recuperação)
   */
  bindAuthEvents() {
    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');
    const linkForgot = document.getElementById('linkForgotPassword');
    const linkBackToLogin = document.getElementById('linkBackToLogin');
    const linkBackToLoginFromReset = document.getElementById('linkBackToLoginFromReset');

    if (tabLogin) tabLogin.addEventListener('click', () => this.setMode('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => this.setMode('register'));
    if (linkForgot) linkForgot.addEventListener('click', (e) => {
      e.preventDefault();
      this.setMode('forgot');
    });
    if (linkBackToLogin) linkBackToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      this.setMode('login');
    });
    if (linkBackToLoginFromReset) linkBackToLoginFromReset.addEventListener('click', (e) => {
      e.preventDefault();
      this.setMode('login');
    });

    // Submissão do formulário de Login
    const formLogin = document.getElementById('formAuthLogin');
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail')?.value;
        const senha = document.getElementById('loginPassword')?.value;

        try {
          const user = await this.authService.login(email, senha);
          if (window.gestarclimasApp) {
            window.gestarclimasApp.showToast(`Bem-vindo(a), ${user.nome}!`, 'success');
          }
          if (this.onAuthSuccess) this.onAuthSuccess(user);
        } catch (err) {
          if (window.gestarclimasApp) {
            window.gestarclimasApp.showToast(err.message, 'error');
          }
        }
      });
    }

    // Submissão do formulário de Cadastro
    const formRegister = document.getElementById('formAuthRegister');
    if (formRegister) {
      formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('regName')?.value;
        const email = document.getElementById('regEmail')?.value;
        const senha = document.getElementById('regPassword')?.value;
        const senhaConf = document.getElementById('regPasswordConfirm')?.value;

        if (senha !== senhaConf) {
          if (window.gestarclimasApp) window.gestarclimasApp.showToast('As senhas digitadas não coincidem.', 'error');
          return;
        }

        try {
          const user = await this.authService.cadastrar({
            nome,
            email,
            senha,
            fotoBase64: this.tempPhotoBase64
          });

          if (window.gestarclimasApp) {
            window.gestarclimasApp.showToast(`Conta criada com sucesso! Bem-vindo(a), ${user.nome}!`, 'success');
          }
          if (this.onAuthSuccess) this.onAuthSuccess(user);
        } catch (err) {
          if (window.gestarclimasApp) {
            window.gestarclimasApp.showToast(err.message, 'error');
          }
        }
      });
    }

    // Upload de Foto de Perfil no Cadastro
    const inputFoto = document.getElementById('regPhotoInput');
    if (inputFoto) {
      inputFoto.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          const result = await this.authService.compactarImagemBase64(file);
          this.tempPhotoBase64 = result.base64;
          
          const previewImg = document.getElementById('regPhotoPreview');
          if (previewImg) previewImg.src = result.base64;
        } catch (err) {
          if (window.gestarclimasApp) window.gestarclimasApp.showToast(err.message, 'error');
        }
      });
    }

    // Submissão de Solicitação de Código via E-mail
    const formForgot = document.getElementById('formAuthForgot');
    if (formForgot) {
      formForgot.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgotEmail')?.value;

        try {
          const resp = await this.authService.solicitarCodigoRecuperacao(email);
          this.tempRecoveryEmail = resp.email;

          if (window.gestarclimasApp) {
            window.gestarclimasApp.showToast(`Código de segurança enviado para: ${resp.email}`, 'info');
          }

          const spanEmail = document.getElementById('resetTargetEmailDisplay');
          if (spanEmail) spanEmail.textContent = resp.email;

          const previewBox = document.getElementById('resetSimulatedInbox');
          if (previewBox && resp.codigoEnviado) {
            previewBox.style.display = 'block';
            previewBox.innerHTML = `
              <div style="background: #ffffff; border: 1.5px solid var(--primary-400); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1rem; box-shadow: var(--shadow-sm);">
                <div style="font-size: 0.78rem; color: var(--primary-900); font-weight: 800; display: flex; align-items: center; justify-content: space-between;">
                  <span><img src="assets/icons/mail.svg" class="icon-img" alt="" /> Mensagem de E-mail Despachada</span>
                  <span style="background: var(--primary-100); padding: 0.15rem 0.5rem; border-radius: var(--radius-full); font-size: 0.7rem;">Agora</span>
                </div>
                <div style="font-size: 0.76rem; color: var(--neutral-600); margin-top: 0.35rem; line-height: 1.35;">
                  Para: <strong>${resp.email}</strong><br/>
                  Assunto: <em>Código de Recuperação - GestARClimAS</em>
                </div>
                <div style="margin-top: 0.6rem; padding: 0.5rem; background: var(--neutral-50); border: 1px dashed var(--primary-500); border-radius: var(--radius-sm); text-align: center;">
                  <span style="font-size: 0.75rem; color: var(--neutral-500); display: block;">Seu código de validação é:</span>
                  <span style="font-size: 1.3rem; font-weight: 900; letter-spacing: 0.25em; color: var(--primary-800);">${resp.codigoEnviado}</span>
                </div>
              </div>
            `;
          }

          const inputCodigo = document.getElementById('resetCode');
          if (inputCodigo) inputCodigo.value = '';

          this.setMode('reset');
        } catch (err) {
          if (window.gestarclimasApp) window.gestarclimasApp.showToast(err.message, 'error');
        }
      });
    }

    // Submissão da Validação de Código e Nova Senha
    const formReset = document.getElementById('formAuthReset');
    if (formReset) {
      formReset.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codigo = document.getElementById('resetCode')?.value;
        const novaSenha = document.getElementById('resetNewPassword')?.value;

        try {
          await this.authService.redefinirSenha(this.tempRecoveryEmail, codigo, novaSenha);
          const user = await this.authService.login(this.tempRecoveryEmail, novaSenha);
          
          if (window.gestarclimasApp) {
            window.gestarclimasApp.showToast('Senha alterada com sucesso! Acessando plataforma...', 'success');
          }
          if (this.onAuthSuccess) {
            this.onAuthSuccess(user);
          } else {
            window.location.replace('index.html');
          }
        } catch (err) {
          if (window.gestarclimasApp) window.gestarclimasApp.showToast(err.message, 'error');
        }
      });
    }
  }

  /**
   * Altera a visualização entre Login, Cadastro, Esqueci a Senha e Redefinir Senha
   */
  setMode(mode) {
    this.currentMode = mode;
    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');
    const boxLogin = document.getElementById('boxAuthLogin');
    const boxRegister = document.getElementById('boxAuthRegister');
    const boxForgot = document.getElementById('boxAuthForgot');
    const boxReset = document.getElementById('boxAuthReset');
    const tabsHeader = document.getElementById('authTabsHeader');

    [boxLogin, boxRegister, boxForgot, boxReset].forEach(b => {
      if (b) b.style.display = 'none';
    });

    if (tabLogin) tabLogin.classList.remove('active');
    if (tabRegister) tabRegister.classList.remove('active');

    if (mode === 'login') {
      if (tabsHeader) tabsHeader.style.display = 'flex';
      if (tabLogin) tabLogin.classList.add('active');
      if (boxLogin) boxLogin.style.display = 'block';
    } else if (mode === 'register') {
      if (tabsHeader) tabsHeader.style.display = 'flex';
      if (tabRegister) tabRegister.classList.add('active');
      if (boxRegister) boxRegister.style.display = 'block';
    } else if (mode === 'forgot') {
      if (tabsHeader) tabsHeader.style.display = 'none';
      if (boxForgot) boxForgot.style.display = 'block';
    } else if (mode === 'reset') {
      if (tabsHeader) tabsHeader.style.display = 'none';
      if (boxReset) boxReset.style.display = 'block';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * =========================================================================
   * GESTÃO DA ABA MEU PERFIL (TAB PROFILE) EM INDEX.HTML
   * =========================================================================
   */
  bindProfileEvents() {
    // Upload de nova foto no perfil
    const inputFotoProfile = document.getElementById('profilePhotoInput');
    if (inputFotoProfile) {
      inputFotoProfile.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          const result = await this.authService.compactarImagemBase64(file);
          await this.authService.atualizarPerfil({ fotoBase64: result.base64 });
          
          if (window.gestarclimasApp) {
            window.gestarclimasApp.atualizarHeaderUsuario();
            window.gestarclimasApp.showToast('Foto de perfil atualizada com sucesso!', 'success');
          }
          this.renderProfileTab();
        } catch (err) {
          if (window.gestarclimasApp) window.gestarclimasApp.showToast(err.message, 'error');
        }
      });
    }

    // Botão Sair da Conta
    const btnLogout = document.getElementById('btnLogoutProfile');
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        if (window.gestarclimasApp) {
          const ok = await window.gestarclimasApp.abrirConfirmacao({
            titulo: 'Sair da Conta',
            mensagem: 'Deseja realmente encerrar sua sessão nesta plataforma?',
            icone: '<img src="assets/icons/logout.svg" class="icon-img-lg" alt="" />',
            btnTexto: 'Sim, Sair da Conta',
            btnClasse: 'btn-secondary'
          });
          if (ok) {
            this.authService.logout();
            window.location.replace('login.html');
          }
        } else {
          this.authService.logout();
          window.location.replace('login.html');
        }
      });
    }

    // Botão Excluir Conta com Confirmação Obrigatória por E-mail
    const btnDeleteAccount = document.getElementById('btnDeleteAccount');
    if (btnDeleteAccount) {
      btnDeleteAccount.addEventListener('click', async () => {
        const user = this.authService.obterUsuarioAtual();
        if (!user) return;

        if (window.gestarclimasApp) {
          const emailConfirmado = await window.gestarclimasApp.abrirModalExclusaoConta(user.email);
          if (emailConfirmado) {
            try {
              await this.authService.excluirConta();
              window.location.replace('login.html');
            } catch (err) {
              window.gestarclimasApp.showToast(err.message, 'error');
            }
          }
        }
      });
    }
  }

  /**
   * Renderiza os dados do usuário autenticado na Aba "Meu Perfil"
   */
  renderProfileTab() {
    const user = this.authService.obterUsuarioAtual();
    if (!user) return;

    const elPhoto = document.getElementById('profileAvatarImg');
    const elName = document.getElementById('profileNameDisplay');
    const elEmail = document.getElementById('profileEmailDisplay');
    const elDate = document.getElementById('profileCreatedDisplay');
    const infoName = document.getElementById('profileReadOnlyName');
    const infoEmail = document.getElementById('profileReadOnlyEmail');

    if (elPhoto) elPhoto.src = user.fotoBase64;
    if (elName) elName.textContent = user.nome;
    if (elEmail) elEmail.textContent = user.email;
    if (infoName) infoName.textContent = user.nome;
    if (infoEmail) infoEmail.textContent = user.email;

    if (elDate) {
      const d = user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'Hoje';
      elDate.textContent = `Membro oficial desde: ${d}`;
    }
  }
}

// Disponibiliza no escopo global
window.AuthView = AuthView;
