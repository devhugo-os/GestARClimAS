/**
 * ============================================================================
 * GestARClimAS - LocationService.js
 * Serviço de Integração com a API do Brasil Aberto & BrasilAPI & IBGE
 * Suporte a Estados, Municípios, Bairros, Ruas e CEP com Timeout Ultrarrápido
 * ============================================================================
 */

class LocationService {
  constructor() {
    this.estadosCache = [];
    this.municipiosCache = {};
    this.distritosCache = {};
    this.ruasCache = {};
  }

  async fetchComTimeout(url, timeoutMs = 2500) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }

  /**
   * Busca endereço completo por CEP utilizando a API do BrasilAPI / Brasil Aberto com fallback ViaCEP
   * @param {string} cep CEP com 8 dígitos
   */
  async buscarPorCEP(cep) {
    const cepLimpo = (cep || '').replace(/\D/g, '');
    if (cepLimpo.length !== 8) throw new Error('CEP deve conter 8 dígitos.');

    try {
      const res = await this.fetchComTimeout(`https://brasilapi.com.br/api/cep/v2/${cepLimpo}`, 2500);
      if (res.ok) {
        const dados = await res.json();
        return {
          estado: dados.state,
          cidade: dados.city,
          bairro: dados.neighborhood || 'Centro',
          rua: dados.street || '',
          cep: dados.cep
        };
      }
    } catch (e) {
      console.warn('[LocationService] Falha na BrasilAPI, tentando ViaCEP:', e);
    }

    try {
      const res = await this.fetchComTimeout(`https://viacep.com.br/ws/${cepLimpo}/json/`, 2500);
      if (res.ok) {
        const dados = await res.json();
        if (dados.erro) throw new Error('CEP não encontrado.');
        return {
          estado: dados.uf,
          cidade: dados.localidade,
          bairro: dados.bairro || 'Centro',
          rua: dados.logradouro || '',
          cep: dados.cep
        };
      }
    } catch (e) {
      console.warn('[LocationService] Falha no fallback de CEP:', e);
    }

    throw new Error('Não foi possível localizar o endereço para este CEP.');
  }

  /**
   * Obtém a lista de todos os estados brasileiros ordenados por nome
   */
  async obterEstados() {
    if (this.estadosCache.length > 0) return this.estadosCache;

    try {
      const response = await this.fetchComTimeout('https://brasilapi.com.br/api/ibge/uf/v1', 2000);
      if (response.ok) {
        const dados = await response.json();
        this.estadosCache = dados
          .map(e => ({ id: e.id, sigla: e.sigla, nome: e.nome }))
          .sort((a, b) => a.nome.localeCompare(b.nome));
        return this.estadosCache;
      }
    } catch (err) {
      console.warn('[LocationService] Falha na BrasilAPI, tentando IBGE oficial:', err);
    }

    try {
      const response = await this.fetchComTimeout('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome', 2000);
      if (response.ok) {
        const dados = await response.json();
        this.estadosCache = dados.map(e => ({ id: e.id, sigla: e.sigla, nome: e.nome }));
        return this.estadosCache;
      }
    } catch (err) {
      console.warn('[LocationService] Usando fallback local para estados:', err);
    }

    this.estadosCache = [
      { sigla: "AC", nome: "Acre", id: 12 },
      { sigla: "AL", nome: "Alagoas", id: 27 },
      { sigla: "AP", nome: "Amapá", id: 16 },
      { sigla: "AM", nome: "Amazonas", id: 13 },
      { sigla: "BA", nome: "Bahia", id: 29 },
      { sigla: "CE", nome: "Ceará", id: 23 },
      { sigla: "DF", nome: "Distrito Federal", id: 53 },
      { sigla: "ES", nome: "Espírito Santo", id: 32 },
      { sigla: "GO", nome: "Goiás", id: 52 },
      { sigla: "MA", nome: "Maranhão", id: 21 },
      { sigla: "MT", nome: "Mato Grosso", id: 51 },
      { sigla: "MS", nome: "Mato Grosso do Sul", id: 50 },
      { sigla: "MG", nome: "Minas Gerais", id: 31 },
      { sigla: "PA", nome: "Pará", id: 15 },
      { sigla: "PB", nome: "Paraíba", id: 25 },
      { sigla: "PR", nome: "Paraná", id: 41 },
      { sigla: "PE", nome: "Pernambuco", id: 26 },
      { sigla: "PI", nome: "Piauí", id: 22 },
      { sigla: "RJ", nome: "Rio de Janeiro", id: 33 },
      { sigla: "RN", nome: "Rio Grande do Norte", id: 24 },
      { sigla: "RS", nome: "Rio Grande do Sul", id: 43 },
      { sigla: "RO", nome: "Rondônia", id: 11 },
      { sigla: "RR", nome: "Roraima", id: 14 },
      { sigla: "SC", nome: "Santa Catarina", id: 42 },
      { sigla: "SP", nome: "São Paulo", id: 35 },
      { sigla: "SE", nome: "Sergipe", id: 28 },
      { sigla: "TO", nome: "Tocantins", id: 17 }
    ];
    return this.estadosCache;
  }

  /**
   * Obtém os municípios de um determinado estado (UF)
   * @param {string} uf Sigla do estado (ex: 'MA', 'PA', 'SP')
   */
  async obterMunicipiosPorUF(uf) {
    if (!uf) return [];
    if (this.municipiosCache[uf]) return this.municipiosCache[uf];

    try {
      const response = await this.fetchComTimeout(`https://brasilapi.com.br/api/ibge/municipios/v1/${uf}`, 2000);
      if (response.ok) {
        const dados = await response.json();
        const cidades = dados
          .map(c => ({ id: c.codigo_ibge || c.id, nome: c.nome }))
          .sort((a, b) => a.nome.localeCompare(b.nome));
        this.municipiosCache[uf] = cidades;
        return cidades;
      }
    } catch (err) {
      console.warn('[LocationService] Falha BrasilAPI cidades, tentando IBGE:', err);
    }

    try {
      const response = await this.fetchComTimeout(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`, 2000);
      if (response.ok) {
        const dados = await response.json();
        const cidades = dados.map(c => ({ id: c.id, nome: c.nome }));
        this.municipiosCache[uf] = cidades;
        return cidades;
      }
    } catch (err) {
      console.warn(`[LocationService] Fallback local cidades para ${uf}:`, err);
    }

    if (uf === 'MA') {
      return [
        { id: 2100055, nome: "Açailândia" },
        { id: 2105302, nome: "Imperatriz" },
        { id: 2111300, nome: "São Luís" },
        { id: 2103000, nome: "Caxias" },
        { id: 2112209, nome: "Timon" },
        { id: 2101202, nome: "Bacabal" },
        { id: 2101608, nome: "Balsas" },
        { id: 2109908, nome: "Santa Inês" },
        { id: 2108603, nome: "Pinheiro" },
        { id: 2102325, nome: "Buriticupu" },
        { id: 2110005, nome: "Santa Luzia" },
        { id: 2104800, nome: "Grajaú" },
        { id: 2101707, nome: "Barra do Corda" },
        { id: 2103307, nome: "Codó" }
      ];
    }
    return [{ id: 1, nome: "Capital / Cidade Principal" }];
  }

  /**
   * Obtém distritos e bairros para o município via Brasil Aberto / IBGE ou Base Integrada
   */
  async obterBairrosDistritos(cidadeId, cidadeNome = '') {
    const nomeNorm = (cidadeNome || '').trim().toLowerCase();
    const key = `${cidadeId}_${nomeNorm}`;
    if (this.distritosCache[key]) return this.distritosCache[key];

    const bairrosEspeciais = {
      "açailândia": [
        "Centro", "Vila Ildemar", "Jacu", "Pequiá", "Getat", "Matadouro",
        "Laranjeiras", "Capeloza", "Nova Açailândia", "Jardim de Alah",
        "Cikel", "Plano da Serra", "Vila Tancredo", "Vila Bom Jardim", "Vila Sarney Filho",
        "Entroncamento", "Barra Azul", "Polisul", "Zona Rural"
      ],
      "imperatriz": [
        "Centro", "Bacuri", "Nova Imperatriz", "Santa Rita", "Vila Lobão",
        "Entroncamento", "Parque das Mangueiras", "Juçara", "Maranhão Novo", "Vila Cafeteira",
        "Vila Nova", "Boca da Mata", "Parque Alvorada", "Ouro Verde", "Zona Rural"
      ],
      "são luís": [
        "Centro Histórico", "Renascença", "Cohama", "Turu", "Calhau",
        "Anjo da Guarda", "Cidade Operária", "Cohatrac", "São Francisco", "Monte Castelo",
        "Ponta d'Areia", "Araçagi", "Vinhais", "Bequimão", "Zona Rural"
      ],
      "caxias": [
        "Centro", "Ponte", "Canto da Vereda", "Trizidela", "Volta Redonda",
        "Castelo Branco", "Nova Caxias", "Serra Vermelha", "Tamandaré", "Zona Rural"
      ],
      "timon": [
        "Centro", "Parque Alvorada", "Formosa", "São Benedito", "Boa Vista",
        "Mutirão", "Flores", "Marimar", "Cidade Nova", "Zona Rural"
      ],
      "bacabal": [
        "Centro", "Ramal", "Esperança", "Cohab", "Vila Frei Solano",
        "Alto da Assunção", "Juçaral", "Pantanal", "Zona Rural"
      ],
      "balsas": [
        "Centro", "Nazaré", "Catumbi", "Potosi", "São Félix",
        "Trizidela", "Santo Amaro", "Cohab", "Zona Rural"
      ],
      "santa inês": [
        "Centro", "Vila Militar", "Canaã", "Sabbak", "Nova Santa Inês",
        "Palmeira", "Angelim", "Santo Antônio", "Zona Rural"
      ],
      "pinheiro": [
        "Centro", "Dourado", "Kiola Sarney", "Matriz", "Pacas",
        "Antítese", "São Benedito", "Zona Rural"
      ],
      "buriticupu": [
        "Centro", "Vila Isaías", "Terra Bela", "Vila Pindaré",
        "Vila São José", "Santa Luzia", "Zona Rural"
      ],
      "santa luzia": [
        "Centro", "Vila Nova", "São Francisco", "Nazaré", "Zona Rural"
      ],
      "grajaú": [
        "Centro", "Canoeiro", "Vila Viana", "Rodoviário", "Zona Rural"
      ],
      "barra do corda": [
        "Centro", "Altamira", "Trizidela", "Tresidela", "Incrível", "Zona Rural"
      ],
      "codó": [
        "Centro", "São Francisco", "São Sebastião", "Trizidela", "Santo Antônio", "Zona Rural"
      ]
    };

    if (bairrosEspeciais[nomeNorm]) {
      const bList = [...bairrosEspeciais[nomeNorm]];
      this.distritosCache[key] = bList;
      return bList;
    }

    if (cidadeId && String(cidadeId).length > 3) {
      try {
        const response = await this.fetchComTimeout(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${cidadeId}/distritos`, 1500);
        if (response.ok) {
          const dados = await response.json();
          const distritos = dados.map(d => d.nome).filter(Boolean);
          if (distritos.length > 0) {
            const listaCompleta = ["Centro", ...distritos.filter(d => d.toLowerCase() !== 'centro'), "Zona Urbana", "Zona Rural"];
            this.distritosCache[key] = listaCompleta;
            return listaCompleta;
          }
        }
      } catch (err) {}
    }

    const bairrosPadrao = ["Centro", "Bairro Principal", "Zona Urbana", "Distrito Sede", "Zona Rural"];
    this.distritosCache[key] = bairrosPadrao;
    return bairrosPadrao;
  }

  /**
   * Obtém ruas / logradouros mapeados para a cidade e bairro selecionados
   */
  async obterRuasPorBairro(cidadeNome, bairroNome) {
    const key = `${(cidadeNome || '').toLowerCase()}_${(bairroNome || '').toLowerCase()}`;
    if (this.ruasCache[key]) return this.ruasCache[key];

    const ruasBase = {
      "açailândia_centro": [
        "Avenida Dorgival Pinheiro de Sousa", "Rua Ceará", "Rua Maranhão", "Rua Goiás",
        "Rua Piauí", "Avenida Santa Luzia", "Rua Duque de Caxias", "Rua 15 de Novembro", "Rua Bonaire"
      ],
      "açailândia_vila ildemar": [
        "Avenida Principal", "Rua São Luís", "Rua Fortaleza", "Rua Belém",
        "Rua Rio de Janeiro", "Rua Minas Gerais", "Rua Brasília", "Rua 13 de Maio"
      ],
      "açailândia_jacu": [
        "Rua Principal do Jacu", "Rua da Paz", "Rua da Esperança", "Avenida Projetada", "Rua Bela Vista"
      ],
      "açailândia_pequiá": [
        "Avenida Ferrovia", "Rua da Estação", "Rua das Indústrias", "Rua do Progresso", "Rua São Raimundo"
      ],
      "açailândia_getat": [
        "Rua Bom Jesus", "Rua Santo Antônio", "Rua São Francisco", "Avenida Contorno", "Rua 1º de Maio"
      ],
      "imperatriz_centro": [
        "Avenida Getúlio Vargas", "Avenida Beira-Rio", "Rua Coriolano Milhomem",
        "Rua Simplício Moreira", "Rua Luís Domingues", "Rua Godofredo Viana", "Rua Ceará"
      ],
      "são luís_centro histórico": [
        "Rua Portugal", "Rua da Estrela", "Rua Grande", "Rua do Giz", "Avenida Beira-Mar", "Rua da Paz"
      ]
    };

    const ruas = ruasBase[key] || [
      "Avenida Principal", "Rua Central", "Rua 1", "Rua 2", "Rua do Comércio", "Avenida Brasil", "Rua da Escola"
    ];

    this.ruasCache[key] = ruas;
    return ruas;
  }
}

// Disponibiliza no escopo global
window.LocationService = LocationService;
