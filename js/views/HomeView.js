/**
 * ============================================================================
 * GestARClimAS - HomeView.js
 * View: Home Page Central Interativa com Navegação em Módulos,
 * Perguntas Provocativas de Conscientização, Estatísticas e Destaques ODS 13
 * ============================================================================
 */

class HomeView {
  constructor(authService, databaseService) {
    this.authService = authService;
    this.databaseService = databaseService;
  }

  async renderHome(onNavigateTab) {
    const user = this.authService.obterUsuarioAtual();
    if (!user) return;

    const laudos = await this.databaseService.obterTodosLaudos();
    const meusLaudos = laudos.filter(l => l.userId === user.uid);
    const pastas = await this.databaseService.obterEscolasAgrupadas();

    // 1. Saudação do Usuário
    const elAvatar = document.getElementById('homeUserAvatar');
    const elGreeting = document.getElementById('homeUserGreeting');

    if (elAvatar) elAvatar.src = user.fotoBase64 || 'assets/favicon.svg';
    if (elGreeting) elGreeting.textContent = `Olá, ${user.nome}! 👋`;

    // 2. Métricas de Impacto e KPIs da Plataforma
    const kpiUserCount = document.getElementById('homeKpiUserCount');
    const kpiSchoolsCount = document.getElementById('homeKpiSchoolsCount');
    const kpiAvgResilience = document.getElementById('homeKpiAvgResilience');
    const kpiLeadersCount = document.getElementById('homeKpiLeadersCount');

    if (kpiUserCount) kpiUserCount.textContent = meusLaudos.length;
    if (kpiSchoolsCount) kpiSchoolsCount.textContent = pastas.length;

    if (kpiAvgResilience) {
      if (laudos.length > 0) {
        const sum = laudos.reduce((acc, l) => acc + (l.diagnostico?.scoreGeral || 0), 0);
        const avg = Math.round(sum / laudos.length);
        kpiAvgResilience.textContent = `${avg}%`;
      } else {
        kpiAvgResilience.textContent = '0%';
      }
    }

    if (kpiLeadersCount) {
      const excelentes = laudos.filter(l => (l.diagnostico?.scoreGeral || 0) >= 80);
      kpiLeadersCount.textContent = excelentes.length;
    }

    // 3. Botões de Ação Rápida no Hero
    const btnHeroStart = document.getElementById('btnHeroStartDiagnostic');
    const btnHeroRanking = document.getElementById('btnHeroExploreRanking');

    if (btnHeroStart) {
      btnHeroStart.onclick = () => onNavigateTab && onNavigateTab('diagnostic');
    }
    if (btnHeroRanking) {
      btnHeroRanking.onclick = () => onNavigateTab && onNavigateTab('ranking');
    }

    // 4. Vinculação dos Cards dos 4 Módulos
    const cardNovoLaudo = document.getElementById('homeCardNovoLaudo');
    const cardRanking = document.getElementById('homeCardRanking');
    const cardHistorico = document.getElementById('homeCardHistorico');
    const cardPerfil = document.getElementById('homeCardPerfil');

    if (cardNovoLaudo) {
      cardNovoLaudo.onclick = () => onNavigateTab && onNavigateTab('diagnostic');
    }
    if (cardRanking) {
      cardRanking.onclick = () => onNavigateTab && onNavigateTab('ranking');
    }
    if (cardHistorico) {
      cardHistorico.onclick = () => onNavigateTab && onNavigateTab('history');
    }
    if (cardPerfil) {
      cardPerfil.onclick = () => onNavigateTab && onNavigateTab('profile');
    }
  }
}

// Disponibiliza no escopo global
window.HomeView = HomeView;
