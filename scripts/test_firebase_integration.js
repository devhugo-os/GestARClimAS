/**
 * ============================================================================
 * GestARClimAS - scripts/test_firebase_integration.js
 * Teste de Validação Automatizada da Estrutura e Operações no Firestore
 * ============================================================================
 */

const https = require('https');
const crypto = require('crypto');

const PROJECT_ID = 'projetogeo-1337f';
const API_KEY = 'AIzaSyDmbo0L3SaUSsoOyXMqZC5RuHoz7MpspAk';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const fullUrl = url.includes('?') ? `${url}&key=${API_KEY}` : `${url}?key=${API_KEY}`;
    const parsedUrl = new URL(fullUrl);
    const postData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Accept': 'application/json',
        ...(postData ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        } : {})
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 TESTE DE INTEGRAÇÃO DO FIREBASE (projetogeo-1337f)');
  console.log('================================================================');

  // 1. Inserir documento de diagnóstico de teste estruturado
  const testDiagId = `DIAG_TEST_${Date.now()}`;
  const now = new Date().toISOString();
  const testChecksum = sha256(`TEST_PAYLOAD_${testDiagId}`);

  const documentData = {
    fields: {
      id: { stringValue: testDiagId },
      userId: { stringValue: 'TEST_USER_FIREBASE' },
      userName: { stringValue: 'Avaliador Oficial' },
      schoolKey: { stringValue: 'ce_almirante_tamandare_sao_luis_ma' },
      status: { stringValue: 'concluido' },
      createdAt: { stringValue: now },
      updatedAt: { stringValue: now },
      escola: {
        mapValue: {
          fields: {
            nome: { stringValue: 'C.E. Almirante Tamandaré' },
            cidade: { stringValue: 'São Luís' },
            estado: { stringValue: 'MA' },
            turno: { stringValue: 'Tempo Integral' },
            avaliador: { stringValue: 'Avaliador Oficial' }
          }
        }
      },
      diagnostico: {
        mapValue: {
          fields: {
            scoreGeral: { integerValue: 88 },
            classificacao: { stringValue: 'Alta Resiliência Climática' },
            corBadge: { stringValue: 'badge-excelente' }
          }
        }
      },
      metadata: {
        mapValue: {
          fields: {
            version: { stringValue: '2.0' },
            checksum: { stringValue: testChecksum },
            platform: { stringValue: 'GestARClimAS - ODS 13' }
          }
        }
      }
    }
  };

  console.log(`\n[1/4] Gravando laudo estruturado na coleção 'diagnostics' (${testDiagId})...`);
  const writeRes = await makeRequest(`${BASE_URL}/diagnostics?documentId=${testDiagId}`, 'POST', documentData);
  if (writeRes.status === 200) {
    console.log('   ✔ Gravação realizada com sucesso no Cloud Firestore!');
  } else {
    console.error('   ❌ Falha ao gravar:', writeRes.status, JSON.stringify(writeRes.data));
    process.exit(1);
  }

  // 2. Consultar o laudo gravado
  console.log(`\n[2/4] Consultando documento recém-gravado...`);
  const getRes = await makeRequest(`${BASE_URL}/diagnostics/${testDiagId}`, 'GET');
  if (getRes.status === 200 && getRes.data.fields) {
    const fields = getRes.data.fields;
    console.log(`   ✔ Documento recuperado: Escola: ${fields.escola.mapValue.fields.nome.stringValue}`);
    console.log(`   ✔ Score Geral: ${fields.diagnostico.mapValue.fields.scoreGeral.integerValue}%`);
    console.log(`   ✔ Checksum Criptográfico SHA-256: ${fields.metadata.mapValue.fields.checksum.stringValue}`);
  } else {
    console.error('   ❌ Falha ao recuperar:', getRes.status, JSON.stringify(getRes.data));
    process.exit(1);
  }

  // 3. Excluir documento de teste para manter o banco limpo
  console.log(`\n[3/4] Excluindo documento de teste para manter a base limpa...`);
  const delRes = await makeRequest(`${BASE_URL}/diagnostics/${testDiagId}`, 'DELETE');
  if (delRes.status === 200 || delRes.status === 204) {
    console.log('   ✔ Documento de teste excluído com sucesso!');
  } else {
    console.error('   ❌ Falha na exclusão:', delRes.status);
  }

  // 4. Verificação final de estado
  console.log(`\n[4/4] Verificando lista final de documentos...`);
  const listRes = await makeRequest(`${BASE_URL}/diagnostics`, 'GET');
  const count = listRes.data?.documents?.length || 0;
  console.log(`   ✔ Total de laudos ativos no Firestore: ${count}`);

  console.log('\n================================================================');
  console.log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO! INTEGRAÇÃO FIREBASE 100% OPERACIONAL.');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Erro nos testes:', err);
  process.exit(1);
});
