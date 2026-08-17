# 🌿 GestARClimAS — Gestão da Pegada Ecológica Escolar & ODS 13

Plataforma Web Pericial para Avaliação da Resiliência Climática, Gestão Hídrica, Infraestrutura Sustentável e Mitigação de Emissões de Carbono em Unidades Escolares, em conformidade com o **Objetivo de Desenvolvimento Sustentável 13 (Ação Contra a Mudança Global do Clima)** da ONU.

---

## 📋 Índice
1. [Visão Geral e Metodologia Técnica](#-visão-geral-e-metodologia-técnica)
2. [Novidades & Funcionalidades Principais](#-novidades--funcionalidades-principais)
3. [Estrutura do Repositório](#-estrutura-do-repositório)
4. [Regras de Segurança & Proteção de Dados (Hardening)](#-regras-de-segurança--proteção-de-dados-hardening)
5. [Regras de Segurança do Banco de Dados (Firebase Firestore Rules)](#-regras-de-segurança-do-banco-de-dados-firebase-firestore-rules)
6. [Guia de Integração com o Firebase SDK](#-guia-de-integração-com-o-firebase-sdk)
7. [Sistema de Recuperação de Senha](#-sistema-de-recuperação-de-senha--envio-de-e-mails)
8. [Como Executar Localmente](#-como-executar-localmente)

---

## 🎯 Visão Geral e Metodologia Técnica

O **GestARClimAS** implementa um modelo determinístico pericial ponderado com **16 critérios técnicos** distribuídos em 4 dimensões estratégicas da sustentabilidade escolar:
- **Pilar 1 (Peso 30%)**: Riscos de Desastres, Drenagem Pluvial, Instalações Elétricas e Coberturas.
- **Pilar 2 (Peso 25%)**: Eficiência Hídrica, Combate a Vazamentos e Captação de Água de Chuva.
- **Pilar 3 (Peso 25%)**: Conforto Bioclimático, Arborização, Solo Permeável e Hortas Escolares.
- **Pilar 4 (Peso 20%)**: Gestão de Resíduos Sólidos, Compostagem Orgânica, Descarte de Perigosos e Educação Climática (ODS 13).

O cálculo determinístico gera pontuações objetivas (0 a 100%), classificando a unidade em:
- 🟢 **Selo Verde: Alta Resiliência Climática** (80% a 100%) — Baixo Risco
- 🟡 **Alerta Amarelo: Resiliência Moderada** (50% a 79%) — Risco Moderado
- 🔴 **Alerta Vermelho: Alta Vulnerabilidade** (0% a 49%) — Alto Risco / Ação Emergencial

---

## 🚀 Novidades & Funcionalidades Principais

### 1. Laudo Pericial Oficial Executivo
- **Hero Banner Institucional:** Destaque para o nome da escola, endereço completo oficial, data de emissão, gauge de pontuação geral e badge colorido de classificação ambiental.
- **Parecer Técnico Descritivo:** Parecer pericial contextualizado gerado automaticamente pelas respostas da auditoria.
- **Painel de Diagnóstico em 3 Colunas Estruturadas:**
  - 🚨 **Riscos Críticos Imediatos:** Detalhamento de vulnerabilidades graves em todos os 16 quesitos (P1 a P16).
  - ⚠️ **Pontos de Atenção & Manutenção:** Mapeamento de oportunidades de melhoria preventiva.
  - 🌱 **Fortalezas & Boas Práticas:** Reconhecimento das práticas consolidadas e estruturas eficientes.
- **4 KPIs de Impacto Ecológico Estimado:** Pegada de Carbono anual per capita (kg CO₂), Potencial de Economia Hídrica (m³/mês), Mudas para Compensação Florestal e Potencial Evolutivo pós-ações.
- **4 Gráficos Analíticos Integrados (Chart.js):**
  1. *Radar Multidimensional dos 4 Pilares da Resiliência*;
  2. *Desempenho por Dimensão (%)* em barras horizontais;
  3. *Distribuição dos 16 Quesitos* por criticidade em gráfico de rosca (Doughnut);
  4. *Projeção de Resiliência Atual vs. Pós-Ação*.
- **Matriz Técnica Pericial:** Auditoria item a item com badges de pontuação (*Excelente: 10 pts*, *Moderado: 5 pts*, *Crítico: 0 pts*) e orientações técnicas prioritárias.
- **Plano Estratégico de Ação ODS 13:** Cards de intervenções com tags de prioridade (*Urgente*, *Alta*, *Média*, *Educativa*) e impacto estimado.
- **Barra de Ferramentas:** Ações para edição rápida dos dados da escola, revisão de respostas, exportação em JSON e impressão formatada para laudo em PDF.

### 2. Quadro de Líderes & Comparador Lado a Lado
- **Ranking das Escolas:** Tabela de líderes ordenada pelo score do laudo mais recente de cada pasta escolar.
- **Comparador Lado a Lado:** Seleção de duas unidades escolares ou avaliações temporais da mesma instituição:
  - Hero cards comparativos com notas e avaliadores;
  - Banner dinâmico com cálculo do delta de resiliência ($\Delta \text{ Score}$);
  - Grade com 4 indicadores ecológicos comparativos;
  - Radar comparativo sobreposto em tempo real;
  - Tabela com mini barras de progresso por dimensão;
  - Matriz diferencial dos 16 quesitos com indicação de vantagem técnica pericial.

### 3. Histórico Estruturado em Pastas Escolares
- Pastas organizadas por instituição de ensino com contagem de laudos, datas de emissão, pontuações arquivadas e botão para exclusão individual ou limpeza completa.

### 4. Gestão de Contas, Perfil e Segurança
- Autenticação com controle de duplicação, upload de avatar com compactação em canvas, recuperação de senha com código seguro de 6 dígitos e exclusão de conta protegida por digitação obrigatória do e-mail cadastrado.
- Busca automática de CEP com preenchimento de endereço via tecla `Enter` ou botão de busca.

---

## 📂 Estrutura do Repositório

```text
Projeto GestARClimAS/
├── assets/
│   ├── favicon.svg              # Favicon vetorial oficial da marca
│   └── logo_gestarclimas.jpg    # Identidade visual oficial
├── css/
│   ├── main.css                 # Design System, variáveis CSS, tipografia, navbar e base
│   └── dashboard.css            # Estilização das abas, laudo, gráficos, histórico, ranking e comparador
├── js/
│   ├── config/
│   │   └── firebase-config.js   # Configuração e inicialização do Firebase SDK
│   ├── models/
│   │   └── DiagnosticModel.js   # Motor determinístico de cálculo de scores e matriz técnica
│   ├── services/
│   │   ├── AuthService.js       # Autenticação, hash SHA-256 e controle de sessão
│   │   ├── DatabaseService.js   # Persistência híbrida (Cache local + Driver Firebase Firestore)
│   │   └── LocationService.js   # Integração com APIs geográficas oficiais (IBGE / BrasilAPI)
│   ├── views/
│   │   ├── AuthView.js          # Controle de Login, Cadastro, Recuperação e Perfil
│   │   ├── FormView.js          # Formulário de diagnóstico multi-step e validações
│   │   ├── HomeView.js          # Painel central da Home Page e KPIs
│   │   ├── RankingView.js       # Quadro de Líderes e Comparador Pericial Avançado
│   │   └── ResultsView.js       # Renderização do Laudo Pericial, gráficos Chart.js e exportações
│   ├── controllers/
│   │   └── AppController.js     # Controlador central, navegação de abas e modais
│   └── app.js                   # Ponto de entrada da aplicação
├── index.html                   # Painel Principal Autenticado (Home, Diagnóstico, Ranking, Histórico, Perfil)
├── login.html                   # Portal de Autenticação Segura (Login, Cadastro e Recuperação)
├── firestore.rules              # Regras oficiais de segurança do Firestore
└── README.md                    # Documentação técnica e guia da plataforma
```

---

## 🛡️ Regras de Segurança & Proteção de Dados (Hardening)

1. **Criptografia e Armazenamento Seguro**: Senhas e tokens são processados com hashing criptográfico **SHA-256** com *salt* exclusivo (`crypto.subtle.digest('SHA-256')`).
2. **Confirmação Estrita para Exclusões**: A exclusão definitiva de conta exige digitação expressa do e-mail cadastrado. A limpeza de laudos utiliza tombstones locais para evitar re-sincronizações indesejadas.
3. **Sanitização contra XSS**: Tratamento e normalização rigorosa de entradas textuais antes da inserção na árvore DOM ou no banco de dados.

---

## 🔒 Regras de Segurança do Banco de Dados (Firebase Firestore Rules)

O arquivo [`firestore.rules`](file:///c:/Users/20241INF0005/Downloads/Projeto%20GestARClimAS/firestore.rules) define as permissões da nuvem:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null && request.auth.uid != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow create: if true;
      allow read, update, delete: if isOwner(userId);
    }

    match /diagnostics/{diagnosticId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }

    match /password_resets/{resetId} {
      allow read, write: if false;
    }
  }
}
```

---

## 🔌 Configuração e Integração do Firebase SDK

A configuração oficial do projeto **`projetogeo-1337f`** está centralizada em [`js/config/firebase-config.js`](file:///c:/Users/20241INF0005/Downloads/Projeto%20GestARClimAS/js/config/firebase-config.js):
- **Autenticação Cloud**: Firebase Auth compatível e coleção `users`.
- **Diagnósticos e Laudos**: Coleção `diagnostics` com persistência offline e cache sincronizado.
- **Recuperação de Senha**: Coleção `password_resets` com hashing e expiração automática de 15 minutos.

---

## ✉️ Sistema de Recuperação de Senha & Envio de E-mails

A plataforma oferece recuperação com código numérico de 6 dígitos:
1. **Em Desenvolvimento / Local**: O código com hash SHA-256 é registrado com expiração de 15 minutos e auditado no console administrativo.
2. **Em Produção**: Conectável via Firebase Cloud Functions com transportador SMTP (`nodemailer`) para envio automático à caixa de entrada do usuário.

---

## 💻 Como Executar Localmente

Como a aplicação é estruturada em padrões web nativos (HTML5, Vanilla JS e CSS3), execute diretamente com o servidor local:

```powershell
python -m http.server 8000
```

Em seguida, acesse: [http://localhost:8000](http://localhost:8000)

---

## 📜 Licença e Propriedade Intelectual
Projeto acadêmico e institucional voltado à sustentabilidade escolar e ação climática sob os preceitos da **Agenda 2030 da ONU (ODS 13)**.
