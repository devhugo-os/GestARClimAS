/**
 * ============================================================================
 * GestARClimAS - AuthView.js
 * View: Autenticação Segura via Firebase Auth em login.html (Login e Cadastro)
 * e Gestão do Perfil Oficial do Usuário em index.html
 * ============================================================================
 */

class AuthView {
  constructor(authService) {
    this.authService = authService;
    this.currentMode = 'login'; // 'login' | 'register'
    this.tempPhotoBase64 = '';
  }

  init(onAuthSuccessCallback) {
    this.onAuthSuccess = onAuthSuccessCallback;
    this.bindAuthEvents();
    this.bindProfileEvents();
  }

  /**
   * Vincula os eventos da tela de autenticação (Login e Cadastro)
   */
  bindAuthEvents() {
    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');

    if (tabLogin) tabLogin.addEventListener('click', () => this.setMode('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => this.setMode('register'));

    // Botões de Autenticação com Google (Login e Cadastro)
    const btnGoogleLogin = document.getElementById('btnGoogleLogin');
    const btnGoogleRegister = document.getElementById('btnGoogleRegister');

    const handleGoogleAuth = async (btn) => {
      try {
        if (btn) {
          btn.disabled = true;
          btn.style.opacity = '0.7';
        }
        const user = await this.authService.loginComGoogle();
        if (window.gestarclimasApp) {
          window.gestarclimasApp.showToast(`Autenticado com Google: Bem-vindo(a), ${user.nome}!`, 'success');
        }
        if (this.onAuthSuccess) this.onAuthSuccess(user);
      } catch (err) {
        if (window.gestarclimasApp) {
          window.gestarclimasApp.showToast(err.message, 'error');
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      }
    };

    if (btnGoogleLogin) btnGoogleLogin.addEventListener('click', () => handleGoogleAuth(btnGoogleLogin));
    if (btnGoogleRegister) btnGoogleRegister.addEventListener('click', () => handleGoogleAuth(btnGoogleRegister));

    // Submissão do formulário de Login
    const formLogin = document.getElementById('formAuthLogin');
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail')?.value;
        const senha = document.getElementById('loginPassword')?.value;
        const btnSubmit = formLogin.querySelector('button[type="submit"]');

        try {
          if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Autenticando no Firebase...';
          }
          const user = await this.authService.login(email, senha);
          if (window.gestarclimasApp) {
            window.gestarclimasApp.showToast(`Bem-vindo(a), ${user.nome}!`, 'success');
          }
          if (this.onAuthSuccess) this.onAuthSuccess(user);
        } catch (err) {
          if (window.gestarclimasApp) {
            window.gestarclimasApp.showToast(err.message, 'error');
          }
        } finally {
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Acessar Plataforma';
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
        const btnSubmit = formRegister.querySelector('button[type="submit"]');

        if (senha !== senhaConf) {
          if (window.gestarclimasApp) window.gestarclimasApp.showToast('As senhas digitadas não coincidem.', 'error');
          return;
        }

        try {
          if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Criando conta no Firebase...';
          }
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
        } finally {
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Concluir Cadastro & Acessar';
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
  }

  /**
   * Alterna a visualização entre Login e Cadastro
   */
  setMode(mode) {
    this.currentMode = mode;
    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');
    const boxLogin = document.getElementById('boxAuthLogin');
    const boxRegister = document.getElementById('boxAuthRegister');
    const tabsHeader = document.getElementById('authTabsHeader');

    if (boxLogin) boxLogin.style.display = 'none';
    if (boxRegister) boxRegister.style.display = 'none';

    if (tabLogin) tabLogin.classList.remove('active');
    if (tabRegister) tabRegister.classList.remove('active');

    if (tabsHeader) tabsHeader.style.display = 'flex';

    if (mode === 'login') {
      if (tabLogin) tabLogin.classList.add('active');
      if (boxLogin) boxLogin.style.display = 'block';
    } else if (mode === 'register') {
      if (tabRegister) tabRegister.classList.add('active');
      if (boxRegister) boxRegister.style.display = 'block';
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
            window.gestarclimasApp.showToast('Foto de perfil atualizada no Firebase!', 'success');
          }
          this.renderProfileTab();
        } catch (err) {
          if (window.gestarclimasApp) window.gestarclimasApp.showToast(err.message, 'error');
        }
      });
    }

    // Formulário de Atualização do Nome do Perfil
    const formProfile = document.getElementById('formProfileUpdate');
    if (formProfile) {
      formProfile.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputName = document.getElementById('profileInputName');
        const novoNome = inputName?.value?.trim();
        if (!novoNome) {
          if (window.gestarclimasApp) window.gestarclimasApp.showToast('Por favor, informe seu nome completo.', 'error');
          return;
        }
        const btnSave = document.getElementById('btnSaveProfileName');
        try {
          if (btnSave) {
            btnSave.disabled = true;
            btnSave.textContent = 'Salvando no Firebase...';
          }
          await this.authService.atualizarPerfil({ nome: novoNome });
          if (window.gestarclimasApp) {
            window.gestarclimasApp.atualizarHeaderUsuario();
            window.gestarclimasApp.showToast('Nome atualizado com sucesso no Firebase!', 'success');
          }
          this.renderProfileTab();
        } catch (err) {
          if (window.gestarclimasApp) window.gestarclimasApp.showToast(err.message, 'error');
        } finally {
          if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = '<img src="assets/icons/save.svg" class="icon-img" alt="" /> Salvar Nome Completo';
          }
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
            await this.authService.logout();
            window.location.replace('login.html');
          }
        } else {
          await this.authService.logout();
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
    const inputName = document.getElementById('profileInputName');
    const infoEmail = document.getElementById('profileReadOnlyEmail');

    if (elPhoto) elPhoto.src = user.fotoBase64;
    if (elName) elName.textContent = user.nome;
    if (elEmail) elEmail.textContent = user.email;
    if (inputName) inputName.value = user.nome || '';
    if (infoEmail) infoEmail.textContent = user.email || 'Não informado';

    if (elDate) {
      const d = user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'Hoje';
      elDate.textContent = `Membro oficial desde: ${d}`;
    }
  }
}

// Disponibiliza no escopo global
window.AuthView = AuthView;
