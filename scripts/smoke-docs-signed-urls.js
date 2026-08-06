require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const AWS = require('aws-sdk');
const config = require('../config');
const Habilitacion = require('../models/habilitacion.model');

const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:3457';
const ORIGIN = 'https://haciendavgesell.gob.ar';
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const BUCKET = 'haciendagesell';

const log = (k, ok, extra = '') =>
  console.log((ok ? 'OK ' : 'FAIL ') + k + (extra ? ' - ' + extra : ''));

(async () => {
  await mongoose.connect(config.MONGO_URL, { useNewUrlParser: true });
  const host = (config.MONGO_URL.match(/@([^/]+)/) || [])[1];
  const db = (config.MONGO_URL.match(/\.net\/([^?]+)/) || [])[1];
  log('db_is_test', /test/i.test(db || ''), `${db} @ ${host}`);
  if (!/test/i.test(db || '')) {
    console.error('ABORT: no smoke sobre DB de produccion');
    process.exit(2);
  }

  const hab = await Habilitacion.findOne({
    'documentos.documentos.0': { $exists: true },
    'documentos.documentos.url': { $exists: true, $ne: null },
  })
    .sort({ createdAt: -1 })
    .select('_id nroSolicitud documentos')
    .lean();

  if (!hab) {
    log('find_hab_with_docs', false, 'ninguna en munivgtest');
    process.exit(1);
  }
  const id = String(hab._id);
  const docsMeta = (hab.documentos && hab.documentos.documentos) || [];
  log(
    'find_hab_with_docs',
    true,
    `id=${id} nro=${hab.nroSolicitud} docs=${docsMeta.length}`
  );

  const mongoBefore = JSON.stringify(
    docsMeta.map((d) => ({ n: d.nombreDocumento, u: d.url || null }))
  );

  const res = await fetch(`${BASE}/habilitaciones/documentos/${id}`);
  const body = await res.json();
  log('get_documentos_http', res.status === 200, `status=${res.status}`);
  if (res.status !== 200) {
    console.log(JSON.stringify(body).slice(0, 500));
    process.exit(1);
  }

  const data = body.data || {};
  const names = Object.keys(data);
  log('has_docs_in_response', names.length > 0, `count=${names.length}`);

  let withUrl = 0;
  let withBase64 = 0;
  let withError = 0;
  for (const name of names) {
    const d = data[name];
    if (d.error) withError++;
    if (d.url) withUrl++;
    if (d.data) withBase64++;
  }
  log(
    'response_has_signed_urls',
    withUrl > 0,
    `urls=${withUrl} base64=${withBase64} errors=${withError}`
  );
  log('response_no_base64', withBase64 === 0, `base64_fields=${withBase64}`);

  const firstName = names.find((n) => data[n].url);
  if (!firstName) {
    log('pick_doc', false, 'ninguna url firmada');
    process.exit(1);
  }
  const doc = data[firstName];
  log('pick_doc', true, `${firstName} key=${doc.key}`);

  const getRes = await fetch(doc.url, { headers: { Origin: ORIGIN } });
  const acao = getRes.headers.get('access-control-allow-origin');
  const buf = Buffer.from(await getRes.arrayBuffer());
  log(
    'signed_get',
    getRes.ok && buf.length > 0,
    `status=${getRes.status} bytes=${buf.length} acao=${acao}`
  );

  const enc = encodeURIComponent(firstName);
  const proxyRes = await fetch(
    `${BASE}/habilitaciones/documentos/${id}/file/${enc}`
  );
  const proxyBuf = Buffer.from(await proxyRes.arrayBuffer());
  log(
    'proxy_stream',
    proxyRes.ok && proxyBuf.length > 0,
    `status=${proxyRes.status} bytes=${proxyBuf.length}`
  );

  const head = await s3.headObject({ Bucket: BUCKET, Key: doc.key }).promise();
  log(
    's3_still_exists',
    !!head.ContentLength,
    `size=${head.ContentLength} key=${doc.key}`
  );

  const habAfter = await Habilitacion.findById(id).select('documentos').lean();
  const docsAfter =
    (habAfter.documentos && habAfter.documentos.documentos) || [];
  const mongoAfter = JSON.stringify(
    docsAfter.map((d) => ({ n: d.nombreDocumento, u: d.url || null }))
  );
  log('mongo_unchanged', mongoBefore === mongoAfter, `docs=${docsAfter.length}`);

  await mongoose.disconnect();
  console.log('SMOKE_DOCS_PASS');
})().catch(async (e) => {
  console.error('SMOKE_DOCS_ERROR', e);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
