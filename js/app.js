/**
 * ============================================================================
 * GestARClimAS - app.js
 * Ponto de Entrada da Aplicação MVC
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Instancia e inicializa o AppController
  window.gestarclimasApp = new AppController();
  window.gestarclimasApp.init();
});
