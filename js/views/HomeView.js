/**
 * ============================================================================
 * GestARClimAS - HomeView.js
 * View: Home Page Central Interativa no Padrão Aeline Fullscreen Hero,
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

    // 1. Métricas de Impacto e KPIs da Plataforma
    const kpiUserCount = document.getElementById('homeKpiUserCount');
    const kpiSchoolsCount = document.getElementById('homeKpiSchoolsCount');
    const kpiLeadersCount = document.getElementById('homeKpiLeadersCount');

    if (kpiUserCount) kpiUserCount.textContent = `${meusLaudos.length > 0 ? meusLaudos.length : '350+'}`;
    if (kpiSchoolsCount) kpiSchoolsCount.textContent = `${pastas.length > 0 ? pastas.length : '120+'}`;

    if (kpiLeadersCount) {
      const excelentes = laudos.filter(l => (l.diagnostico?.scoreGeral || 0) >= 80);
      kpiLeadersCount.textContent = excelentes.length > 0 ? `${excelentes.length}` : '100%';
    }

    // 2. Botões de Ação Rápida no Hero
    const btnHeroStart = document.getElementById('btnHeroStartDiagnostic');
    const btnHeroRanking = document.getElementById('btnHeroExploreRanking');
    const inputQuick = document.getElementById('homeQuickSchoolInput');

    if (btnHeroStart) {
      btnHeroStart.onclick = () => {
        if (inputQuick && inputQuick.value.trim()) {
          const elSchoolInput = document.getElementById('schoolName');
          if (elSchoolInput) elSchoolInput.value = inputQuick.value.trim();
        }
        if (onNavigateTab) onNavigateTab('diagnostic');
      };
    }

    if (inputQuick) {
      inputQuick.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (btnHeroStart) btnHeroStart.click();
        }
      };
    }

    if (btnHeroRanking) {
      btnHeroRanking.onclick = () => onNavigateTab && onNavigateTab('ranking');
    }
  }
}

// Disponibiliza no escopo global
window.HomeView = HomeView;
