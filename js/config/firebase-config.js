/**
 * ============================================================================
 * GestARClimAS - firebase-config.js
 * Configuração Oficial e Inicialização Centralizada do Firebase SDK
 * Projeto: projetogeo-1337f
 * ============================================================================
 */

const firebaseConfig = {
  apiKey: "AIzaSyDmbo0L3SaUSsoOyXMqZC5RuHoz7MpspAk",
  authDomain: "projetogeo-1337f.firebaseapp.com",
  projectId: "projetogeo-1337f",
  storageBucket: "projetogeo-1337f.firebasestorage.app",
  messagingSenderId: "295600865736",
  appId: "1:295600865736:web:277270f4a6c5506668c0fd",
  measurementId: "G-EEZ3Q502V3"
};

// Inicialização automática caso o SDK do Firebase esteja carregado
if (typeof firebase !== 'undefined' && !firebase.apps?.length) {
  try {
    firebase.initializeApp(firebaseConfig);
    console.info('[Firebase] SDK conectado com sucesso ao projeto:', firebaseConfig.projectId);
  } catch (err) {
    console.warn('[Firebase] Aviso ao inicializar Firebase SDK:', err);
  }
}

window.GEST_FIREBASE_CONFIG = firebaseConfig;
