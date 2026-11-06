const rotaRepository = require('../repositories/rotaRepository');
const vendedorRepository = require('../repositories/vendedorRepository');
const Rota = require('../models/Rota');
const logger = require('../utils/logger');
const { AppError } = require('../utils/response');
const { haversineKm } = require('../utils/validators');

// Velocidades médias urbanas (km/h) usadas quando não há Google Maps
const VELOCIDADE_MEDIA_KMH = { driving: 25, walking: 5, bicycling: 12, transit: 15 };
// Fator para converter distância em linha reta em distância por estrada
const FATOR_ESTRADA = 1.3;
const GOOGLE_TIMEOUT_MS = 5000;

/** Estimativa local (sem API externa). */
function estimarRota(origem, destino, modo) {
  const distancia = haversineKm(origem.lat, origem.lng, destino.lat, destino.lng) * FATOR_ESTRADA;
  const tempoMin = Math.max(1, Math.round((distancia / VELOCIDADE_MEDIA_KMH[modo]) * 60));
  return { distancia_km: Math.round(distancia * 100) / 100, tempo_estimado_min: tempoMin, fonte: 'estimativa' };
}

/** Consulta a Directions API do Google Maps. Devolve null em caso de falha. */
async function consultarGoogle(origem, destino, modo) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.set('origin', `${origem.lat},${origem.lng}`);
  url.searchParams.set('destination', `${destino.lat},${destino.lng}`);
  url.searchParams.set('mode', modo);
  url.searchParams.set('language', 'pt-PT');
  url.searchParams.set('key', key);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS) });
    const data = await res.json();
    if (data.status !== 'OK' || !data.routes?.length) {
      logger.warn('Google Directions sem resultado', { status: data.status });
      return null;
    }
    const route = data.routes[0];
    const leg = route.legs[0];
    return {
      distancia_km: Math.round((leg.distance.value / 1000) * 100) / 100,
      tempo_estimado_min: Math.max(1, Math.round(leg.duration.value / 60)),
      polyline: route.overview_polyline?.points ?? null,
      fonte: 'google_maps'
    };
  } catch (err) {
    logger.warn('Falha ao consultar Google Directions', { error: err.message });
    return null;
  }
}

function linkNavegacao(origem, destino, modo) {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', `${origem.lat},${origem.lng}`);
  url.searchParams.set('destination', `${destino.lat},${destino.lng}`);
  url.searchParams.set('travelmode', modo);
  return url.toString();
}

function comNavegacao(rota, extra = {}) {
  const origem = { lat: rota.origem.latitude, lng: rota.origem.longitude };
  const destino = { lat: rota.destino.latitude, lng: rota.destino.longitude };
  return { ...rota, ...extra, link_navegacao: linkNavegacao(origem, destino, rota.modo_transporte) };
}

async function iniciarRota(idUsuario, { id_vendedor, id_produto, latitude_origem, longitude_origem, modo_transporte = 'driving' }) {
  const vendedor = await vendedorRepository.findById(id_vendedor);
  if (!vendedor || !vendedor.ativo) throw AppError.notFound('Vendedor não encontrado');
  if (!vendedor.temLocalizacao()) throw AppError.badRequest('O vendedor ainda não definiu a sua localização');

  const oferta = await vendedorRepository.findOferta(id_vendedor, id_produto);
  if (!oferta || !oferta.disponivel) {
    throw AppError.badRequest('O vendedor não tem este produto disponível');
  }

  const origem = { lat: latitude_origem, lng: longitude_origem };
  const destino = { lat: vendedor.latitude, lng: vendedor.longitude };
  const calculo = (await consultarGoogle(origem, destino, modo_transporte)) || estimarRota(origem, destino, modo_transporte);

  const rota = await rotaRepository.create({
    id_usuario: idUsuario,
    id_vendedor,
    id_produto,
    latitude_origem,
    longitude_origem,
    latitude_destino: destino.lat,
    longitude_destino: destino.lng,
    distancia_km: calculo.distancia_km,
    tempo_estimado_min: calculo.tempo_estimado_min,
    modo_transporte
  });

  return comNavegacao(rota, { fonte_calculo: calculo.fonte, polyline: calculo.polyline ?? null });
}

/** Devolve a rota se pertencer à conta autenticada (utilizador ou vendedor de destino). */
async function obterRota(id, auth) {
  const rota = await rotaRepository.findById(id);
  const dono = auth.tipo === 'usuario' ? rota?.id_usuario : rota?.id_vendedor;
  if (!rota || dono !== auth.id) throw AppError.notFound('Rota não encontrada');
  return comNavegacao(rota);
}

async function listarRotasUsuario(idUsuario, { status, limit, offset }) {
  const [rotas, total] = await Promise.all([
    rotaRepository.findByUsuario(idUsuario, { status, limit, offset }),
    rotaRepository.countByUsuario(idUsuario, { status })
  ]);
  return { rotas: rotas.map((r) => comNavegacao(r)), total };
}

async function listarRotasVendedor(idVendedor, { status, limit, offset }) {
  const [rotas, total] = await Promise.all([
    rotaRepository.findByVendedor(idVendedor, { status, limit, offset }),
    rotaRepository.countByVendedor(idVendedor, { status })
  ]);
  return { rotas, total };
}

async function atualizarStatus(id, idUsuario, novoStatus) {
  const rota = await rotaRepository.findById(id);
  if (!rota || rota.id_usuario !== idUsuario) throw AppError.notFound('Rota não encontrada');
  if (rota.status_rota === novoStatus) return comNavegacao(rota);
  if (!Rota.podeTransitar(rota.status_rota, novoStatus)) {
    throw AppError.conflict(`Não é possível passar de "${rota.status_rota}" para "${novoStatus}"`);
  }
  return comNavegacao(await rotaRepository.updateStatus(id, novoStatus));
}

module.exports = {
  iniciarRota,
  obterRota,
  listarRotasUsuario,
  listarRotasVendedor,
  atualizarStatus,
  estimarRota,
  linkNavegacao
};
