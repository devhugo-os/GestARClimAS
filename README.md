# 🌿 GestARClimAS — Gestão da Pegada Ecológica Escolar & ODS 13

Plataforma Web Pericial para Avaliação da Resiliência Climática, Gestão Hídrica, Infraestrutura Sustentável e Mitigação de Emissões de Carbono em Unidades Escolares, em conformidade com o **Objetivo de Desenvolvimento Sustentável 13 (Ação Contra a Mudança Global do Clima)** da ONU.

---

## 📋 Índice
1. [Visão Geral e Metodologia Técnica](#-visão-geral-e-metodologia-técnica)
2. [Estrutura do Repositório](#-estrutura-do-repositório)
3. [Regras de Segurança & Proteção de Dados (Hardening)](#-regras-de-segurança--proteção-de-dados-hardening)
4. [Regras de Segurança do Banco de Dados (Firebase Firestore Rules)](#-regras-de-segurança-do-banco-de-dados-firebase-firestore-rules)
5. [Guia de Integração com o Firebase SDK](#-guia-de-integração-com-o-firebase-sdk)
6. [Sistema de Recuperação de Senha & Envio de E-mails (Procedimento Manual e Automatizado)](#-sistema-de-recuperação-de-senha--envio-de-e-mails)
7. [Como Executar Localmente](#-como-executar-localmente)

---

## 🎯 Visão Geral e Metodologia Técnica

O **GestARClimAS** implementa um modelo determinístico ponderado com **16 critérios periciais** distribuídos em 4 dimensões estratégicas:
- **Dimensão 1 (Peso 30%)**: Riscos de Desastres, Drenagem e Vulnerabilidade Pluvial.
- **Dimensão 2 (Peso 25%)**: Gestão Hídrica, Captação de Água de Chuva e Eficiência.
- **Dimensão 3 (Peso 25%)**: Conforto Bioclimático, Arborização e Áreas Verdes.
- **Dimensão 4 (Peso 20%)**: Gestão de Resíduos Sólidos, Compostagem e Educação Climática (ODS 13).

O cálculo gera pontuações objetivas (0 a 100%), classificando a unidade em:
- 🟢 **Excelente / Resiliente** (80% a 100%)
- 🟡 **Moderada / Requer Atenção** (50% a 79%)
- 🔴 **Crítica / Alta Vulnerabilidade** (0% a 49%)

---

## 📂 Estrutura do Repositório

```text
Projeto GestARClimAS/
├── assets/
│   ├── favicon.svg              # Favicon vetorial oficial da marca
│   └── logo_gestarclimas.jpg    # Identidade visual oficial
├── css/
│   ├── main.css                 # Design System, variáveis CSS, tipografia e base
│   └── dashboard.css            # Estilização das abas, laudo, gráficos, histórico e ranking
├── js/
│   ├── models/
│   │   └── DiagnosticModel.js   # Motor determinístico de cálculo de scores e matriz técnica
│   ├── services/
│   │   ├── AuthService.js       # Autenticação, hash SHA-256 e sessão
│   │   ├── DatabaseService.js   # Persistência híbrida (Cache local + Driver Firebase Firestore)
│   │   └── LocationService.js   # Integração com APIs geográficas oficiais (IBGE / BrasilAPI)
│   ├── views/
│   │   ├── AuthView.js          # Controle de Login, Cadastro, Recuperação e Perfil
│   │   ├── FormView.js          # Formulário de diagnóstico multi-step e validações
│   │   ├── HomeView.js          # Painel central da Home Page e KPIs
│   │   ├── RankingView.js       # Quadro de Líderes e Comparador Pericial Radar
│   │   └── ResultsView.js       # Renderização do Laudo Pericial, gráficos Chart.js e exportações
│   ├── controllers/
│   │   └── AppController.js     # Controlador central, navegação de abas e modais
│   └── app.js                   # Ponto de entrada da aplicação
├── index.html                   # Painel Principal Autenticado (Home, Diagnóstico, Ranking, Histórico, Perfil)
├── login.html                   # Portal de Autenticação Segura (Login, Cadastro e Recuperação)
└── README.md                    # Documentação técnica e guia de segurança
```

---

## 🛡️ Regras de Segurança & Proteção de Dados (Hardening)

Para garantir que dados sensíveis não fiquem expostos no cliente nem sejam interceptados:

### 1. Criptografia e Armazenamento Seguro
- **Senhas e Tokens**: Nenhuma senha ou código de verificação é armazenado em texto plano. É utilizado o padrão criptográfico **SHA-256** com *salt* exclusivo (`crypto.subtle.digest('SHA-256')`).
- **Nenhum Dado Sensível em Logs/Toasts**: Códigos de segurança não são exibidos em alertas, toasts ou preenchidos no DOM.
- **Confirmação Estrita para Exclusões**: A exclusão definitiva de uma conta exige que o usuário digite expressamente seu e-mail cadastrado antes de executar a exclusão irreversível.

### 2. Sanitização e Proteção contra XSS
- Todas as entradas textuais (nomes de escolas, bairros, ruas e avaliadores) são limpas e normalizadas antes da inserção na árvore DOM ou no banco de dados.

### 3. Cabeçalhos de Segurança Recomendados (Content Security Policy)
Ao hospedar a plataforma em um servidor de produção (Firebase Hosting, Vercel, Nginx ou Apache), utilize os seguintes cabeçalhos HTTP:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://servicodados.ibge.gov.br https://brasilapi.com.br https://firestore.googleapis.com https://*.firebaseio.com;
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 🔒 Regras de Segurança do Banco de Dados (Firebase Firestore Rules)

Ao conectar o Firebase ao projeto, utilize o arquivo `firestore.rules` configurado abaixo para garantir que nenhum usuário não autorizado tenha acesso de leitura ou escrita a dados de terceiros:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Verifica se o usuário está autenticado
    function isAuthenticated() {
      return request.auth != null && request.auth.uid != null;
    }

    // Helper: Verifica se o documento pertence ao usuário solicitante
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // 1. Coleção de Usuários
    match /users/{userId} {
      // Qualquer um pode criar sua conta inicial
      allow create: if true;
      // Somente o próprio dono pode ler, atualizar ou excluir sua conta
      allow read, update, delete: if isOwner(userId);
    }

    // 2. Coleção de Diagnósticos e Laudos Periciais
    match /diagnostics/{diagnosticId} {
      // Leitura permitida para usuários autenticados (para alimentar o ranking colaborativo)
      allow read: if isAuthenticated();
      
      // Criação permitida somente para usuários autenticados vinculando seu próprio UID
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      
      // Atualização e Exclusão permitidas apenas para o autor do laudo
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }

    // 3. Coleção de Tokens de Recuperação de Senha
    match /password_resets/{resetId} {
      // Apenas Cloud Functions com privilégios de Admin podem ler/gravar tokens reais
      allow read, write: if false;
    }
  }
}
```

---

## 🔌 Configuração e Integração do Firebase SDK (Conectado)

A configuração oficial do projeto **`projetogeo-1337f`** foi integrada e modularizada no arquivo centralizado [`js/config/firebase-config.js`](file:///c:/Users/Hugo/Documents/Projetos%20Hugo/Projetos/Projeto%20GestARClimAS/js/config/firebase-config.js).

Tanto [`login.html`](file:///c:/Users/Hugo/Documents/Projetos%20Hugo/Projetos/Projeto%20GestARClimAS/login.html) quanto [`index.html`](file:///c:/Users/Hugo/Documents/Projetos%20Hugo/Projetos/Projeto%20GestARClimAS/index.html) já carregam o SDK do Firebase (App, Auth e Firestore) e inicializam automaticamente a conexão com o banco de dados na nuvem:

- **Autenticação Cloud**: Gerenciada pelo Firebase Auth e coleção Firestore `users`.
- **Laudos e Pastas Cloud**: Coleção Firestore `diagnostics` com sincronização e fallback de cache local offline.
- **Tokens de Recuperação**: Coleção Firestore `password_resets` com tokens protegidos por Hashing SHA-256 e tempo de expiração de 15 minutos.

---

## ✉️ Sistema de Recuperação de Senha & Envio de E-mails

Aplicações puramente estáticas (Client-Side HTML/JS) **não possuem um servidor SMTP próprio**, pois expor credenciais de envio de e-mail (usuário e senha do Gmail/SendGrid) no código JavaScript do navegador permitiria que qualquer usuário malicioso roubasse as credenciais e disparasse spam.

Para viabilizar a recuperação de senha com segurança total, você dispõe de duas abordagens:

---

### Abordagem A: Operação Manual / Painel de Suporte (Ambiente Local ou Sem Servidor)

Caso você não queira configurar um servidor de e-mail externo agora, o sistema gera e protege os códigos com validade de 15 minutos:

1. **Solicitação pelo Usuário**: O usuário acessa a opção *"Esqueceu a senha?"* na tela de login e digita seu e-mail.
2. **Registro Seguro**: O sistema calcula o Hash SHA-256 do código e registra a solicitação com timestamp de expiração.
3. **Consulta Segura pelo Administrador**:
   - Abra o Console do Navegador (`F12` > Console).
   - O serviço de auditoria emite a notificação de despacho para a conta cadastrada.
   - O administrador da plataforma pode fornecer o código diretamente ao usuário solicitante mediante validação de identidade.
4. **Validação**: O usuário digita os 6 dígitos e sua nova senha, tendo seu acesso restabelecido imediatamente.

---

### Abordagem B: Envio 100% Automatizado via Firebase Cloud Function (Recomendado para Produção)

Para que o e-mail chegue diretamente à caixa de entrada do usuário de forma automática, utilize uma **Cloud Function** segura conectada a um serviço SMTP (como Gmail com Senha de App, Resend, SendGrid ou Amazon SES).

#### Código da Cloud Function (`functions/index.js`):

```javascript
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configuração do Transportador SMTP Seguro
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().smtp.email,       // Ex: gestarclimas.oficial@gmail.com
    pass: functions.config().smtp.password,    // Senha de Aplicativo de 16 dígitos do Google
  },
});

// Trigger disparado quando um pedido de recuperação for registrado
exports.enviarCodigoRecuperacao = functions.firestore
  .document("password_resets/{docId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const { email, codigo } = data;

    const mailOptions = {
      from: '"GestARClimAS - Suporte Oficial" <naoresponda@gestarclimas.edu.br>',
      to: email,
      subject: "Seu Código de Recuperação de Senha - GestARClimAS",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #059669; text-align: center;">GestARClimAS</h2>
          <p>Olá,</p>
          <p>Recebemos uma solicitação para redefinir a senha de acesso à sua conta na plataforma <strong>GestARClimAS</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a; background: #ecfdf5; padding: 12px 24px; border-radius: 6px; border: 1px dashed #10b981;">
              ${codigo}
            </span>
          </div>
          <p style="font-size: 13px; color: #64748b;">Este código é válido por <strong>15 minutos</strong>. Se você não solicitou esta alteração, ignore esta mensagem com segurança.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">GestARClimAS • Gestão da Pegada Ecológica Escolar & ODS 13</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`E-mail de recuperação enviado com sucesso para: ${email}`);
    } catch (error) {
      console.error("Erro ao enviar e-mail:", error);
    }
  });
```

---

## 💻 Como Executar Localmente

Como o projeto é construído em padrões web modernos (HTML5, Vanilla JS e CSS3), não é necessário compilar ou instalar dependências complexas:

1. Clone ou baixe os arquivos para o seu computador.
2. Abra a pasta do projeto no VS Code ou terminal.
3. Inicie um servidor local (ex: extensão **Live Server** do VS Code, ou execute via terminal `npx serve .` / `python -m http.server 8000`).
4. Acesse `http://localhost:8000/login.html` no seu navegador.

---

## 📜 Licença e Propriedade Intelectual
Projeto acadêmico e institucional voltado à sustentabilidade escolar e ação climática sob os preceitos da **Agenda 2030 da ONU (ODS 13)**.
