/**
 * ============================================================================
 * GestARClimAS - DiagnosticModel.js
 * Modelo Determinístico: Cálculo dos 16 Critérios, Matriz Técnica Ponderada,
 * 4 Dimensões de Resiliência Climática, Indicadores Ecológicos e Regras Periciais
 * ============================================================================
 */

class DiagnosticModel {
  constructor() {
    this.metadadosQuestoes = [
      { id: 'p1', num: 1, pilar: '1. Riscos de Desastres', titulo: 'Fiação e Instalações Elétricas em Dias de Chuva' },
      { id: 'p2', num: 2, pilar: '1. Riscos de Desastres', titulo: 'Corrosão e Aterramento de Estruturas Metálicas' },
      { id: 'p3', num: 3, pilar: '1. Riscos de Desastres', titulo: 'Drenagem Pluvial, Grelhas e Escoamento do Pátio' },
      { id: 'p4', num: 4, pilar: '1. Riscos de Desastres', titulo: 'Estanqueidade de Telhados, Calhas e Forros' },
      { id: 'p5', num: 5, pilar: '2. Eficiência Hídrica', titulo: 'Conservação e Ausência de Vazamentos em Torneiras' },
      { id: 'p6', num: 6, pilar: '2. Eficiência Hídrica', titulo: 'Eficiência e Válvulas das Descargas Sanitárias' },
      { id: 'p7', num: 7, pilar: '2. Eficiência Hídrica', titulo: 'Estanqueidade e Drenagem de Bebedouros' },
      { id: 'p8', num: 8, pilar: '2. Eficiência Hídrica', titulo: 'Captação e Reaproveitamento de Água de Chuva' },
      { id: 'p9', num: 9, pilar: '3. Áreas Verdes & Clima', titulo: 'Solo Vivo, Canteiros Permeáveis e Jardins' },
      { id: 'p10', num: 10, pilar: '3. Áreas Verdes & Clima', titulo: 'Densidade Arbórea e Cobertura de Copa' },
      { id: 'p11', num: 11, pilar: '3. Áreas Verdes & Clima', titulo: 'Mitigação de Ilhas de Calor e Conforto Térmico' },
      { id: 'p12', num: 12, pilar: '3. Áreas Verdes & Clima', titulo: 'Horta Escolar Agroecológica Pedagógica' },
      { id: 'p13', num: 13, pilar: '4. Resíduos & ODS 13', titulo: 'Coleta Seletiva e Triagem de Recicláveis' },
      { id: 'p14', num: 14, pilar: '4. Resíduos & ODS 13', titulo: 'Tratamento de Resíduos Orgânicos e Compostagem' },
      { id: 'p15', num: 15, pilar: '4. Resíduos & ODS 13', titulo: 'Descarte Seguro de Pilhas, Lâmpadas e Eletrônicos' },
      { id: 'p16', num: 16, pilar: '4. Resíduos & ODS 13', titulo: 'Projetos Contínuos de Educação Climática (ODS 13)' }
    ];
  }

  /**
   * Executa o cálculo determinístico de pontuação, categorização por pilar,
   * alertas periciais, matriz técnica e plano de ação ODS 13
   * @param {Object} respostas Respostas { p1: 'critico'|'moderado'|'excelente', ... }
   * @param {Object} escola Dados cadastrais da escola
   * @returns {Object} Laudo detalhado completo
   */
  calcularDiagnostico(respostas, escola = {}) {
    const r = respostas || {};

    // 1. Cálculo por Dimensão (Pontuação 0 a 40 para cada pilar)
    const dimRiscosPontos = this._pontos(r.p1) + this._pontos(r.p2) + this._pontos(r.p3) + this._pontos(r.p4);
    const dimAguaPontos = this._pontos(r.p5) + this._pontos(r.p6) + this._pontos(r.p7) + this._pontos(r.p8);
    const dimVerdePontos = this._pontos(r.p9) + this._pontos(r.p10) + this._pontos(r.p11) + this._pontos(r.p12);
    const dimResiduosPontos = this._pontos(r.p13) + this._pontos(r.p14) + this._pontos(r.p15) + this._pontos(r.p16);

    const totalPontos = dimRiscosPontos + dimAguaPontos + dimVerdePontos + dimResiduosPontos; // Max 160
    const scoreGeral = Math.round((totalPontos / 160) * 100);

    const scoreDimRiscos = Math.round((dimRiscosPontos / 40) * 100);
    const scoreDimAgua = Math.round((dimAguaPontos / 40) * 100);
    const scoreDimVerde = Math.round((dimVerdePontos / 40) * 100);
    const scoreDimResiduos = Math.round((dimResiduosPontos / 40) * 100);

    // Contagem de criticidade dos 16 quesitos
    let countCritico = 0;
    let countModerado = 0;
    let countExcelente = 0;

    for (let i = 1; i <= 16; i++) {
      const v = r[`p${i}`];
      if (v === 'critico') countCritico++;
      else if (v === 'moderado') countModerado++;
      else countExcelente++;
    }

    // 2. Classificação Determinística do Nível de Resiliência
    let classificacao = '';
    let nivelRisco = '';
    let corBadge = '';
    let descricaoStatus = '';

    if (scoreGeral >= 80) {
      classificacao = 'Selo Verde: Alta Resiliência Climática';
      nivelRisco = 'Baixo Risco';
      corBadge = 'badge-excelente';
      descricaoStatus = 'A instituição demonstra excelente governança socioambiental, baixo índice de vulnerabilidade e boas práticas sustentáveis consolidadas.';
    } else if (scoreGeral >= 50) {
      classificacao = 'Alerta Amarelo: Resiliência Moderada';
      nivelRisco = 'Risco Moderado';
      corBadge = 'badge-moderado';
      descricaoStatus = 'A instituição possui estruturas funcionais, porém apresenta pontos vulneráveis que exigem manutenção preventiva e adequação ambiental.';
    } else {
      classificacao = 'Alerta Vermelho: Alta Vulnerabilidade';
      nivelRisco = 'Alto Risco';
      corBadge = 'badge-critico';
      descricaoStatus = 'Situação crítica com riscos estruturais e climáticos imediatos. Exige plano de intervenção prioritária emergencial.';
    }

    // 3. Estruturas para acumular análises determinísticas
    const pontosCriticos = [];
    const pontosMelhorar = [];
    const pontosFortes = [];
    const recomendacoesAcao = [];
    const detalhamentoQuestoes = [];

    // =========================================================================
    // PILAR 1: RISCOS DE DESASTRES E CHUVAS (P1 - P4)
    // =========================================================================

    // P1: Fiação Elétrica
    if (r.p1 === 'critico') {
      pontosCriticos.push("Risco Imediato de Choque Elétrico e Curto-Circuito: Fiação exposta e sem conduítes antichama vedados em paredes úmidas ou sob goteiras.");
      recomendacoesAcao.push({
        id: "REC_ELETRICA",
        prioridade: "prio-urgente",
        textoPrioridade: "Urgência Imediata",
        pilar: "Segurança & Clima",
        titulo: "Canalização e Proteção Estanque da Rede Elétrica",
        descricao: "Isolar cabos expostos, instalar eletrodutos antichama vedados e substituir quadros oxidados com disjuntores diferenciais residuais (DR).",
        impacto: "Prevenção de acidentes fatais por choque elétrico e interrupção das aulas em dias de temporal."
      });
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[0], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Fiação vulnerável exposta a umidade e intempéries.', acao: 'Canalizar em conduítes antichama vedados.' });
    } else if (r.p1 === 'moderado') {
      pontosMelhorar.push("Vulnerabilidade Elétrica Pontual: A maior parte da fiação está embutida, mas existem emendas ou caixas de passagem desprotegidas contra umidade.");
      recomendacoesAcao.push({
        id: "REC_ELETRICA_MOD",
        prioridade: "prio-media",
        textoPrioridade: "Média Prioridade",
        pilar: "Infraestrutura",
        titulo: "Vedação e Fechamento de Caixas de Passagem Elétrica",
        descricao: "Vistoriar tomadas e quadros de distribuição em salas e corredores, vedando entradas de umidade.",
        impacto: "Aumento da vida útil das instalações e redução de microinterrupções de energia."
      });
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[0], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Caixas de passagem e tomadas necessitam de vedação preventiva.', acao: 'Revisão periódica de conexões.' });
    } else {
      pontosFortes.push("Segurança Elétrica Exemplar: Instalações 100% canalizadas em conduítes vedados, quadro de disjuntores blindado e proteção contra intempéries.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[0], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Instalação elétrica protegida e estanque.', acao: 'Manter inspeções semestrais.' });
    }

    // P2: Estruturas Metálicas & Corrosão
    if (r.p2 === 'critico') {
      pontosCriticos.push("Perigo de Colapso e Eletrização em Gradis: Grades, portões, pilares ou corrimãos com corrosão severa em áreas de circulação de alunos.");
      recomendacoesAcao.push({
        id: "REC_METAR",
        prioridade: "prio-alta",
        textoPrioridade: "Alta Prioridade",
        pilar: "Segurança Física",
        titulo: "Recuperação Estrutural e Aterramento de Elementos Metálicos",
        descricao: "Aplicar convertedor de ferrugem, reforço mecânico por solda, pintura epóxi anticorrosiva e aterramento elétrico de gradis.",
        impacto: "Eliminação de risco de desabamento de portões e choque de contato acidental."
      });
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[1], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Corrosão severa com risco mecânico e elétrico.', acao: 'Tratamento anticorrosivo e reforço estrutural.' });
    } else if (r.p2 === 'moderado') {
      pontosMelhorar.push("Oxidação Superficial em Estruturas Metálicas: Portões e grades com desgaste de pintura necessitando de lixamento e proteção antes do agravamento.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[1], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Ferrugem em estágio inicial nos suportes e portões.', acao: 'Lixamento e repintura protetiva.' });
    } else {
      pontosFortes.push("Conservação Metálica Impecável: Estruturas aterradas, protegidas com pintura protetiva contra chuvas e sol.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[1], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Estruturas conservadas e devidamente aterradas.', acao: 'Manutenção da película protetora.' });
    }

    // P3: Drenagem e Alagamentos
    if (r.p3 === 'critico') {
      pontosCriticos.push("Vulnerabilidade Hidrogeológica Severa: Pátio e vias sofrem alagamentos intensos que invadem salas e criam poças permanentes com risco de dengue.");
      recomendacoesAcao.push({
        id: "REC_DRENAGEM",
        prioridade: "prio-alta",
        textoPrioridade: "Alta Prioridade",
        pilar: "Drenagem Urbana",
        titulo: "Desobstrução de Grelhas e Implantação de Canaletas de Escoamento",
        descricao: "Construir canaletas pluviais perimetrais com caimento para a rede pública e criar áreas de piso drenante/permeável.",
        impacto: "Escoamento rápido de temporais, garantindo acesso seguro e eliminando focos do mosquito transmissor da dengue."
      });
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[2], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Acúmulo crônico de água pluvial com interdição de áreas.', acao: 'Criação de canaletas e pisos permeáveis.' });
    } else if (r.p3 === 'moderado') {
      pontosMelhorar.push("Drenagem Pluvial Lenta: Ocorrência de empoçamento temporário após chuvas fortes, exigindo limpeza periódica de ralos e desobstrução de calhas.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[2], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Drenagem demorada após chuvas de alta intensidade.', acao: 'Limpeza e desobstrução de grelhas pluviais.' });
    } else {
      pontosFortes.push("Excelente Drenagem Pluvial: Pátio com piso permeável, canaletas limpas e ausência de poças permanentes.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[2], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Escoamento superficial rápido e sem retenção.', acao: 'Conservação da permeabilidade do solo.' });
    }

    // P4: Telhados, Calhas e Forros
    if (r.p4 === 'critico') {
      pontosCriticos.push("Insegurança em Coberturas Escolares: Goteiras contínuas e risco de colapso de placas de forro encharcadas sobre carteiras e materiais.");
      recomendacoesAcao.push({
        id: "REC_TELHADO",
        prioridade: "prio-urgente",
        textoPrioridade: "Urgência Imediata",
        pilar: "Estrutura Edílica",
        titulo: "Revisão e Substituição de Telhas Quebradas e Fixação de Forros",
        descricao: "Substituir telhas danificadas, desentupir calhas com folhas e substituir placas de forro deformadas por umidade.",
        impacto: "Proteção do mobiliário escolar, equipamentos pedagógicos e continuidade das aulas com segurança."
      });
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[3], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Infiltrações no teto e forro comprometido.', acao: 'Reparo emergencial de telhas e calhas.' });
    } else if (r.p4 === 'moderado') {
      pontosMelhorar.push("Pequenas Infiltrações em Coberturas: Gotejamentos isolados em beirais ou áreas de apoio que necessitam de vedação preventiva com manta asfáltica.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[3], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Gotejamentos leves em áreas perimetrais.', acao: 'Impermeabilização e vedação de calhas.' });
    } else {
      pontosFortes.push("Cobertura e Forro Seguros: Telhado revisado e estanque, com calhas limpas e forro firme sem umidade.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[3], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Coberturas conservadas e sem infiltrações.', acao: 'Manter limpezas antes do período chuvoso.' });
    }

    // =========================================================================
    // PILAR 2: EFICIÊNCIA HÍDRICA & SANEAMENTO (P5 - P8)
    // =========================================================================

    // P5: Torneiras
    if (r.p5 === 'critico') {
      pontosCriticos.push("Desperdício Hídrico Crítico em Torneiras: Múltiplos pontos com vazamento e gotejamento ininterrupto de água potável.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[4], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Perda contínua de água limpa por falha de vedação.', acao: 'Troca imediata de carrapetas e registros.' });
    } else if (r.p5 === 'moderado') {
      pontosMelhorar.push("Torneiras com Leve Gotejamento: Necessária troca preventiva de reparos em banheiros e instalação de bicos arejadores.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[4], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Pequenos vazamentos pontuais.', acao: 'Instalação de arejadores de vazão.' });
    } else {
      pontosFortes.push("Estanqueidade Total em Torneiras: Equipamentos regulados e com bicos arejadores economizadores de água.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[4], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Sem perdas hídricas nas torneiras.', acao: 'Manter checagens rotineiras.' });
    }

    // P6: Descargas
    if (r.p6 === 'critico') {
      pontosCriticos.push("Válvulas de Descarga Travadas / Vazando: Descarte ininterrupto de milhares de litros de água tratada direto no esgoto sanitário.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[5], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Fluxo constante de água direto no vaso sanitário.', acao: 'Regulagem ou troca do êmbolo da válvula.' });
    } else if (r.p6 === 'moderado') {
      pontosMelhorar.push("Descargas sem Economizador: Ausência de caixas acopladas de duplo acionamento ecológico ou reguladores de vazão.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[5], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Descarga convencional com alto consumo por acionamento.', acao: 'Calibração de tempo de fluxo.' });
    } else {
      pontosFortes.push("Descargas Sanitárias Eficientes: Válvulas reguladas e acionamento inteligente sem vazamentos.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[5], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Excelente controle volumétrico nas descargas.', acao: 'Conservar vedação dos reservatórios.' });
    }

    // P7: Bebedouros
    if (r.p7 === 'critico') {
      pontosCriticos.push("Bebedouros com Perda Hídrica e Risco Sanitário: Escoamento defeituoso criando poças de água potável no pátio.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[6], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Perda contínua de água tratada e poças no piso.', acao: 'Substituição das válvulas de pressão e dreno.' });
    } else if (r.p7 === 'moderado') {
      pontosMelhorar.push("Bebedouros com Escoamento Lento: Respingos e necessidade de limpeza de sifões e ajustes de bicos.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[6], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Respingos e ralo com escoamento lento.', acao: 'Limpeza de sifão e ajuste de bico.' });
    } else {
      pontosFortes.push("Bebedouros Higiênicos e Econômicos: Drenagem perfeita, filtros em dia e ausência total de perdas.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[6], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Equipamentos seguros e estanques.', acao: 'Troca periódica de filtros de carvão ativado.' });
    }

    if (r.p5 === 'critico' || r.p6 === 'critico' || r.p7 === 'critico') {
      recomendacoesAcao.push({
        id: "REC_HIDRICA",
        prioridade: "prio-alta",
        textoPrioridade: "Alta Prioridade",
        pilar: "Eficiência Hídrica",
        titulo: "Mutirão Hidráulico Escolar: Troca de Carrapetas, Vedações e Válvulas",
        descricao: "Substituir reparos de torneiras, instalar bicos arejadores economizadores e regular o fluxo das descargas sanitárias.",
        impacto: "Economia imediata de até 40% na conta de água escolar e combate ao desperdício hídrico."
      });
    }

    // P8: Aproveitamento de Água de Chuva
    if (r.p8 === 'critico') {
      pontosCriticos.push("Descarte Total de Água de Chuva: 100% da água pluvial de telhados é desperdiçada sem reservação para uso não potável.");
      recomendacoesAcao.push({
        id: "REC_CISTERNA",
        prioridade: "prio-media",
        textoPrioridade: "Média Prioridade",
        pilar: "Recursos Hídricos",
        titulo: "Instalação de Cisterna Escolar para Captação de Água de Chuva",
        descricao: "Conectar tubos de descida das calhas a reservatório protegido com filtro autolimpante de folhas e torneira de reuso.",
        impacto: "Geração de reserva gratuita de água para lavagem de pisos, calçadas e irrigação da horta escolar."
      });
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[7], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Descarte total da água de chuva.', acao: 'Instalação de bombona/cisterna de reuso.' });
    } else if (r.p8 === 'moderado') {
      pontosMelhorar.push("Captação Pluvial Improvisada: Existem tambores de reservação, porém sem sistema de vedação e filtragem contra mosquitos.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[7], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Reservação simples sem tela mosquiteira.', acao: 'Adequação com filtro de folhas e tampa hermética.' });
    } else {
      pontosFortes.push("Inovação em Captação Pluvial: Cisterna ecológica em funcionamento suprindo demandas de limpeza e irrigação da escola.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[7], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Cisterna ativa abastecendo áreas de serviço.', acao: 'Higienização semestral do reservatório.' });
    }

    // =========================================================================
    // PILAR 3: ÁREAS VERDES, MICROCLIMA E CONFORTO BIOCLIMÁTICO (P9 - P12)
    // =========================================================================

    // P9: Canteiros e Solo Vivo
    if (r.p9 === 'critico') {
      pontosCriticos.push("Solo 100% Mineralizado / Canteiros Abandonados: Pátio totalmente cimentado com retenção extrema de calor e ausência de solo vivo permeável.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[8], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Ausência de solo vivo permeável.', acao: 'Desimpermeabilização de faixas de piso.' });
    } else if (r.p9 === 'moderado') {
      pontosMelhorar.push("Canteiros com Vegetação Rala: Presença de canteiros, porém com solo compactado demandando adubação e cobertura viva.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[8], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Canteiros existentes com cobertura vegetal rala.', acao: 'Adubação orgânica e plantio de forrações.' });
    } else {
      pontosFortes.push("Canteiros Verdes e Solo Permeável Bem Cuidados: Vegetação viva contribuindo para a infiltração de água e redução da poeira.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[8], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Jardins vigorosos e solo drenante.', acao: 'Manutenção de cobertura morta no solo.' });
    }

    // P10: Densidade Arbórea
    if (r.p10 === 'critico') {
      pontosCriticos.push("Déficit Severo de Árvores de Sombra: Ausência de árvores de copa densa no pátio e nas áreas de recreação escolar.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[9], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Déficit severo de árvores de sombra.', acao: 'Plantio de mudas nativas de copa larga.' });
    } else if (r.p10 === 'moderado') {
      pontosMelhorar.push("Arborização Jovem em Desenvolvimento: Presença de mudas necessitando de tutoramento, irrigação e adubação orgânica.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[9], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Árvores jovens em crescimento.', acao: 'Tutoramento e irrigação das mudas.' });
    } else {
      pontosFortes.push("Excelente Cobertura de Copa Arbórea: Árvores adultas proporcionando sombra abundante e refúgio bioclimático.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[9], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Boa cobertura de copa adulta.', acao: 'Poda de condução e fitossanidade.' });
    }

    // P11: Ilhas de Calor e Conforto Térmico
    if (r.p11 === 'critico') {
      pontosCriticos.push("Ilha de Calor e Desconforto Térmico Crítico: Pátio superaquecido com radiação solar direta intensa e sensação térmica extrema.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[10], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Exposição solar excessiva e desconforto térmico.', acao: 'Instalação de sombrites e pergolados verdes.' });
    } else if (r.p11 === 'moderado') {
      pontosMelhorar.push("Conforto Térmico Mediano: Áreas com sombreamento parcial necessitando de barreiras vegetais e sombrites.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[10], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Conforto térmico mediano.', acao: 'Ampliação de barreiras vegetais.' });
    } else {
      pontosFortes.push("Microclima Agradável e Protegido: Boa circulação de ar, conforto térmico e áreas sombreadas acolhedoras.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[10], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Microclima agradável com brisa e sombra.', acao: 'Preservar corredores de ventilação natural.' });
    }

    if (r.p10 === 'critico' || r.p11 === 'critico') {
      recomendacoesAcao.push({
        id: "REC_ARBORIZACAO_URGENTE",
        prioridade: "prio-alta",
        textoPrioridade: "Ação Climática ODS 13",
        pilar: "Microclima & Biofilia",
        titulo: "Plantio de árvores nativas e criação de refúgios sombreados contra ilhas de calor",
        descricao: "Criar covas adubadas para mudas nativas de copa densa e instalar sombrites temporários enquanto as árvores se desenvolvem.",
        impacto: "Redução de até 4°C na temperatura percebida no pátio e melhoria no bem-estar dos estudantes."
      });
    }

    // P12: Horta Escolar Pedagógica
    if (r.p12 === 'critico') {
      pontosCriticos.push("Ausência de Espaço Agroecológico: Falta de horta escolar didática para vivência prática de cultivo com os estudantes.");
      recomendacoesAcao.push({
        id: "REC_HORTA",
        prioridade: "prio-educativa",
        textoPrioridade: "Educação Prática",
        pilar: "Sustentabilidade Pedagógica",
        titulo: "Implantação de Horta Escolar em Canteiros Elevados",
        descricao: "Construir canteiros didáticos com ervas medicinais, hortaliças e temperos com envolvimento das turmas.",
        impacto: "Educação alimentar, incentivo ao contato com a terra e suplementação saudável da merenda escolar."
      });
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[11], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Sem atividades agroecológicas no currículo.', acao: 'Criar horta didática em caixotes ou solo.' });
    } else if (r.p12 === 'moderado') {
      pontosMelhorar.push("Horta Escolar com Cultivo Sazonal / Reduzido: Espaço existente demandando revitalização e integração curricular permanente.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[11], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Horta com cultivo sazonal reduzido.', acao: 'Integrar a horta aos planos de aula de ciências.' });
    } else {
      pontosFortes.push("Horta Escolar Viva e Produtiva: Atividades agroecológicas ativas integradas à merenda escolar e ao currículo pedagógico.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[11], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Produção contínua de hortaliças e ervas.', acao: 'Expandir para cultivo de PANC (Plantas Alimentícias Não Convencionais).' });
    }

    // =========================================================================
    // PILAR 4: GESTÃO DE RESÍDUOS E AÇÃO CLIMÁTICA (P13 - P16)
    // =========================================================================

    // P13: Coleta Seletiva
    if (r.p13 === 'critico') {
      pontosCriticos.push("Ausência de Triagem de Recicláveis: Todo o papel, plástico e embalagens da escola são descartados no lixo comum sem reciclagem.");
      recomendacoesAcao.push({
        id: "REC_RECICLAGEM",
        prioridade: "prio-educativa",
        textoPrioridade: "Gestão de Resíduos",
        pilar: "Economia Circular",
        titulo: "Instalação de Ecopontos e Integração com Catadores Locais",
        descricao: "Implantar lixeiras de separação em cores padronizadas e firmar parceria com cooperativas de reciclagem da cidade.",
        impacto: "Desvio de centenas de quilos de resíduos plásticos do aterro sanitário e formação de cidadania ecológica."
      });
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[12], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Descarte indiferenciado de materiais recicláveis.', acao: 'Implantar lixeiras identificadas por cor.' });
    } else if (r.p13 === 'moderado') {
      pontosMelhorar.push("Coleta Seletiva Parcial: Separação restrita de papéis, necessitando expandir para plásticos e metais do recreio.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[12], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Separação parcial de papéis.', acao: 'Ampliar coleta para plásticos e metais no recreio.' });
    } else {
      pontosFortes.push("Cultura de Coleta Seletiva Consolidada: Triagem ativa de recicláveis com destinação correta e coletores identificados.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[12], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Triagem e destinação regular de recicláveis.', acao: 'Manter parceria com associações de catadores.' });
    }

    // P14: Resíduos Orgânicos e Compostagem
    if (r.p14 === 'critico') {
      pontosCriticos.push("Descarte Total de Matéria Orgânica: Sobras da merenda e cascas vão integralmente para o lixo comum sem reaproveitamento biológico.");
      recomendacoesAcao.push({
        id: "REC_COMPOSTEIRA",
        prioridade: "prio-media",
        textoPrioridade: "Prática Sustentável",
        pilar: "Compostagem",
        titulo: "Construção de Composteira Escolar Termofílica",
        descricao: "Criar leira ou composteira em caixas com serragem e folhas secas para tratar cascas de frutas e verduras da cantina.",
        impacto: "Produção de biofertilizante rico para plantas escolares e mitigação da emissão de gás metano (ODS 13)."
      });
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[13], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Resíduos da cozinha vão para o aterro municipal.', acao: 'Montar composteira escolar em caixas plásticas.' });
    } else if (r.p14 === 'moderado') {
      pontosMelhorar.push("Aproveitamento Orgânico Parcial: Doação informal sem estrutura biológica de compostagem escolar.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[13], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Aproveitamento parcial para animais.', acao: 'Estruturar compostagem biológica formal.' });
    } else {
      pontosFortes.push("Excelente Gestão de Resíduos Orgânicos: Transformação das sobras da merenda em composto fértil via compostagem.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[13], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Compostagem escolar ativa gerando húmus.', acao: 'Utilizar o adubo na horta e canteiros da escola.' });
    }

    // P15: Resíduos Perigosos / Eletroeletrônicos
    if (r.p15 === 'critico') {
      pontosCriticos.push("Descarte Inadequado de Resíduos Perigosos: Pilhas e lâmpadas demandam ponto de recolhimento seguro para evitar contaminação ambiental.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[14], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Ausência de ponto seguro para pilhas e lâmpadas.', acao: 'Criar papa-pilhas e caixa de descarte seguro.' });
    } else if (r.p15 === 'moderado') {
      pontosMelhorar.push("Armazenamento Temporário de Resíduos Perigosos: Ponto de descarte provisório necessitando envio regular para logística reversa.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[14], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Armazenamento temporário seguro.', acao: 'Encaminhar periodicamente para postos de logística reversa.' });
    } else {
      pontosFortes.push("Logística Reversa Ativa: Destinação certificada de materiais eletroeletrônicos e componentes perigosos.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[14], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Ponto de coleta de pilhas e lâmpadas ativo.', acao: 'Promover campanhas com as famílias dos alunos.' });
    }

    // P16: Projetos ODS 13
    if (r.p16 === 'critico') {
      pontosCriticos.push("Ausência de Projetos de Educação Climática: Inexistência de comitê ou ações pedagógicas continuadas voltadas ao ODS 13 da ONU.");
      recomendacoesAcao.push({
        id: "REC_COMITE_CLIMA",
        prioridade: "prio-educativa",
        textoPrioridade: "Comunidade",
        pilar: "Educação Climática",
        titulo: "Criação do Comitê Mirim de Ação Climática e Sustentabilidade Escolar",
        descricao: "Criar grupo de estudantes e professores líderes para monitorar o consumo de energia, água e plantar árvores.",
        impacto: "Engajamento dos alunos no combate ao desperdício, gerando protagonismo juvenil."
      });
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[15], status: 'critico', statusTexto: 'Crítico', pontos: 0, obs: 'Sem projetos contínuos de clima e meio ambiente.', acao: 'Integrar a temática do ODS 13 nas disciplinas.' });
    } else if (r.p16 === 'moderado') {
      pontosMelhorar.push("Ações Ambientais Pontuais: Atividades comemorativas no Dia do Meio Ambiente sem continuidade anual.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[15], status: 'moderado', statusTexto: 'Moderado', pontos: 5, obs: 'Ações pontuais no Dia do Meio Ambiente.', acao: 'Tornar os projetos ambientais interdisciplinares e contínuos.' });
    } else {
      pontosFortes.push("Liderança em Ação Climática ODS 13: Programa contínuo de Educação Ambiental alinhado à ONU envolvendo toda a comunidade.");
      detalhamentoQuestoes.push({ ...this.metadadosQuestoes[15], status: 'excelente', statusTexto: 'Excelente', pontos: 10, obs: 'Comitê e práticas permanentes de sustentabilidade.', acao: 'Compartilhar boas práticas com outras escolas da rede.' });
    }

    // Regras Combinatórias Especiais
    if (r.p1 === 'critico' && r.p4 === 'critico') {
      pontosCriticos.unshift("ALERTA COMBINADO GRAVE: Goteiras e infiltrações atuando diretamente sobre condutores elétricos expostos. Risco iminente de curto-circuito e choque.");
    }
    if (r.p12 === 'excelente' && r.p14 === 'excelente') {
      pontosFortes.unshift("Ciclo Agroecológico Fechado: A escola gera adubo orgânico da própria merenda para nutrir sua horta didática.");
    }
    if (r.p5 === 'excelente' && r.p6 === 'excelente' && r.p8 === 'excelente') {
      pontosFortes.push("Gestão Hídrica Avançada: Combinação de consumo controlado sem perdas e captação sustentável de água pluvial.");
    }

    // Estimativas de Impacto e Projeções
    const pegadaCarbonoEstimada = Math.max(15, Math.round(160 - (scoreGeral * 1.15)));
    const potencialEconomiaAguaM3 = Math.round(((100 - scoreDimAgua) / 100) * 38);
    const mudasRecomendadas = Math.round(((100 - scoreDimVerde) / 100) * 24);
    const scoreProjetadoPosAcao = Math.min(100, Math.round(scoreGeral + ((100 - scoreGeral) * 0.78)));

    return {
      escola,
      respostas: r,
      scoreGeral,
      scoreProjetadoPosAcao,
      classificacao,
      nivelRisco,
      corBadge,
      descricaoStatus,
      estatisticasRespostas: {
        critico: countCritico,
        moderado: countModerado,
        excelente: countExcelente,
        total: 16
      },
      dimensoes: {
        riscosDesastres: { score: scoreDimRiscos, pontos: dimRiscosPontos, max: 40, titulo: "1. Riscos & Chuvas" },
        consumoHidrico: { score: scoreDimAgua, pontos: dimAguaPontos, max: 40, titulo: "2. Eficiência Hídrica" },
        areasVerdes: { score: scoreDimVerde, pontos: dimVerdePontos, max: 40, titulo: "3. Áreas Verdes & Clima" },
        residuos: { score: scoreDimResiduos, pontos: dimResiduosPontos, max: 40, titulo: "4. Resíduos & ODS" }
      },
      indicadores: {
        pegadaCarbonoEstimada,
        potencialEconomiaAguaM3,
        mudasRecomendadas
      },
      pontosCriticos,
      pontosMelhorar,
      pontosFortes,
      recomendacoesAcao,
      detalhamentoQuestoes,
      dataDiagnostico: escola.data || new Date().toLocaleString('pt-BR')
    };
  }

  _pontos(val) {
    if (val === 'excelente') return 10;
    if (val === 'moderado') return 5;
    return 0;
  }
}

// Disponibiliza no escopo global
window.DiagnosticModel = DiagnosticModel;
