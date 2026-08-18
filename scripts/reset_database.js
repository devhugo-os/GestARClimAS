/**
 * ============================================================================
 * GestARClimAS - scripts/reset_database.js
 * Script de Limpeza / Reset Total do Banco de Dados Firestore
 * Projeto: projetogeo-1337f
 * ============================================================================
 */

const https = require('https');

const PROJECT_ID = 'projetogeo-1337f';
const API_KEY = 'AIzaSyDmbo0L3SaUSsoOyXMqZC5RuHoz7MpspAk';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const fullUrl = url.includes('?') ? `${url}&key=${API_KEY}` : `${url}?key=${API_KEY}`;
    const parsedUrl = new URL(fullUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Accept': 'application/json'
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

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function listDocuments(collection) {
  const url = `${BASE_URL}/${collection}?pageSize=300`;
  try {
    const res = await makeRequest(url, 'GET');
    if (res.data && res.data.documents) {
      return res.data.documents.map(doc => doc.name);
    }
    return [];
  } catch (err) {
    console.warn(`[Reset] Aviso ao listar documentos da coleção ${collection}:`, err.message);
    return [];
  }
}

async function deleteDocument(docPath) {
  const url = `https://firestore.googleapis.com/v1/${docPath}`;
  try {
    const res = await makeRequest(url, 'DELETE');
    if (res.status !== 200 && res.status !== 204) {
      console.log(`      [Status ${res.status}] Resposta:`, JSON.stringify(res.data));
    }
    return res.status === 200 || res.status === 204;
  } catch (err) {
    console.warn(`[Reset] Erro ao deletar ${docPath}:`, err.message);
    return false;
  }
}

async function resetColecao(collectionName) {
  console.log(`\n🧹 [1/3] Verificando coleção: '${collectionName}'...`);
  const docs = await listDocuments(collectionName);
  console.log(`   Documentos encontrados: ${docs.length}`);

  let deletedCount = 0;
  for (const doc of docs) {
    const ok = await deleteDocument(doc);
    if (ok) deletedCount++;
  }

  console.log(`   ✔ ${deletedCount} documentos excluídos com sucesso da coleção '${collectionName}'.`);
}

async function main() {
  console.log('================================================================');
  console.log(`⚡ GESTARCLIMAS - RESET & REORGANIZAÇÃO DO FIRESTORE`);
  console.log(`⚡ Projeto: ${PROJECT_ID}`);
  console.log('================================================================');

  const colecoes = ['diagnostics', 'password_resets', 'users'];

  for (const col of colecoes) {
    await resetColecao(col);
  }

  console.log('\n================================================================');
  console.log('🎉 Banco de dados Cloud Firestore resetado e pronto para uso!');
  console.log('================================================================');
}

main().catch(err => {
  console.error('Erro fatal no reset:', err);
  process.exit(1);
});
