# 🌿 GestARClimAS — Gestão da Pegada Ecológica Escolar & ODS 13

Plataforma Web Pericial para Avaliação da Resiliência Climática, Gestão Hídrica, Infraestrutura Sustentável e Mitigação de Emissões de Carbono em Unidades Escolares, em conformidade com o **Objetivo de Desenvolvimento Sustentável 13 (Ação Contra a Mudança Global do Clima)** da ONU.

---

## 📋 Índice
1. [Visão Geral e Metodologia Técnica](#-visão-geral-e-metodologia-técnica)
2. [Novidades & Funcionalidades Principais](#-novidades--funcionalidades-principais)
3. [Estrutura do Repositório](#-estrutura-do-repositório)
4. [Arquitetura 100% Firebase Cloud (Auth & Firestore)](#-arquitetura-100-firebase-cloud-auth--firestore)
5. [Regras de Segurança do Banco de Dados (Firestore Rules)](#-regras-de-segurança-do-banco-de-dados-firestore-rules)
6. [Como Executar Localmente](#-como-executar-localmente)

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

### 1. Autenticação Cloud Híbrida & Segura (Firebase Auth)
- **Login com Google (OAuth 2.0)** e **E-mail/Senha**: Acesso rápido com pop-up Google ou credenciais seguras.
- **Persistência 100% em Nuvem**: Eliminação total de armazenamento local volátil (`localStorage`), garantindo segurança, integridade e portabilidade.
- **Gestão de Perfil & Nome Completo**: Edição direta do Nome Completo do usuário na aba *Meu Perfil*, com sincronização em tempo real no Firebase Auth e Firestore.

### 2. Turnos & Modalidades Escolares Personalizadas
- Suporte amplo e flexível a turnos de atendimento escolar:
  - **Somente Matutino (1 Turno)**
  - **Somente Vespertino (1 Turno)**
  - **Matutino e Vespertino (2 Turnos)**
  - **Ensino em Tempo Integral**
  - **Noturno (EJA / Técnico Subsequente)**
  - **Três Turnos (Matutino, Vespertino e Noturno)**
  - **Educação Profissional / Técnico Integrado**
  - **Técnico Integrado em Meio Ambiente / Agroecologia**
  - **Outro (Personalizado com campo aberto)**

### 3. Visualizador de Laudos sem Perda de Contexto
- **Modal de Laudo Pericial Completo**: Ao clicar em "Abrir Laudo" ou "Ver Laudo" no *Histórico* ou *Ranking*, o laudo pericial é renderizado em um modal executivo dedicado, sem desviar da aba ativa e mantendo o histórico de navegação intacto.
- **Auto-Reidratação da Matriz dos 16 Quesitos**: Renderização completa da auditoria dos 16 quesitos técnicos, notas, status pericial, 4 gráficos analíticos (Radar, Barras por Pilar, Rosca de Criticidade e Evolução) e Plano de Ação ODS 13.

### 4. Gestão e Design Aprimorado do Histórico
- Pastas estruturadas por escola com contagem de laudos, badges de pontuação e novos botões estilizados para exclusão segura de pastas e laudos individuais.
- Modal de confirmação estilizado e seguro para exclusão de unidades e limpeza de histórico.

### 5. Quadro de Líderes & Comparador Lado a Lado
- **Ranking das Escolas**: Tabela de líderes ordenada pelo score do laudo mais recente de cada instituição.
- **Comparador Lado a Lado**: Seleção de duas unidades escolares ou avaliações temporais com sobreposição de radar, cálculo de $\Delta \text{ Score}$ e matriz diferencial.

---

## 📂 Estrutura do Repositório

```text
Projeto GestARClimAS/
├── assets/
│   ├── favicon.svg              # Favicon vetorial oficial da marca
│   ├── icons/                   # Pacote de ícones SVG do Design System
│   └── logo_gestarclimas.jpg    # Identidade visual oficial
├── css/
│   ├── main.css                 # Design System, variáveis CSS, tipografia, navbar e base
│   └── dashboard.css            # Estilização das abas, laudo, gráficos, histórico, ranking e modais
├── js/
│   ├── config/
│   │   └── firebase-config.js   # Configuração e inicialização do Firebase SDK
│   ├── models/
│   │   └── DiagnosticModel.js   # Motor determinístico de cálculo de scores e matriz técnica
│   ├── services/
│   │   ├── AuthService.js       # Autenticação Firebase (Google & E-mail), controle de sessão
│   │   ├── DatabaseService.js   # Persistência direta no Firebase Firestore
│   │   └── LocationService.js   # Integração com APIs geográficas oficiais (IBGE / BrasilAPI)
│   ├── views/
│   │   ├── AuthView.js          # Controle de Login, Cadastro e Edição de Perfil
│   │   ├── FormView.js          # Formulário de diagnóstico multi-step e validações
│   │   ├── HomeView.js          # Painel central da Home Page e KPIs
│   │   ├── RankingView.js       # Quadro de Líderes e Comparador Pericial Avançado
│   │   └── ResultsView.js       # Renderização do Laudo Pericial, gráficos Chart.js e modais
│   ├── controllers/
│   │   └── AppController.js     # Controlador central, roteamento de abas e modais
│   └── app.js                   # Ponto de entrada da aplicação
├── scripts/
│   ├── reset_database.js        # Script Node.js administrativo para reset seguro do banco
│   └── test_firebase_integration.js # Script de validação e integridade
├── index.html                   # Painel Principal Autenticado (Home, Diagnóstico, Ranking, Histórico, Perfil)
├── login.html                   # Portal de Autenticação Segura (Google & E-mail/Senha)
├── firebase.json                # Configuração do Firebase CLI Hosting e Firestore
├── firestore.rules              # Regras oficiais de segurança do Firestore
└── README.md                    # Documentação técnica e guia da plataforma
```

---

## 🛡️ Arquitetura 100% Firebase Cloud (Auth & Firestore)

1. **Autenticação**: Gerenciada pelo Firebase Authentication com provedores Google e Password.
2. **Coleções Firestore**:
   - `users/{uid}`: Perfis de usuários com metadados e checksum de integridade.
   - `diagnostics/{id}`: Todos os laudos periciais com matriz completa dos 16 quesitos, indicadores e plano de ação.
3. **Segurança Criptográfica**: Checksum SHA-256 aplicado para garantir integridade e auditoria de alterações.

---

## 🔒 Regras de Segurança do Banco de Dados (Firestore Rules)

As regras de produção protegem os dados por usuário autenticado:

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
  }
}
```

---

## 💻 Como Executar Localmente

Como a aplicação é estruturada em padrões web nativos (HTML5, Vanilla JS e CSS3), execute com qualquer servidor HTTP local:

```powershell
python -m http.server 8000
```

Em seguida, acesse no navegador: **`http://localhost:8000`**

---

## 📜 Licença e Propriedade Intelectual
Projeto acadêmico e institucional voltado à sustentabilidade escolar e ação climática sob os preceitos da **Agenda 2030 da ONU (ODS 13)**.
