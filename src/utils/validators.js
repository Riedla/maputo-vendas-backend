/** Funções puras de validação e cálculo geográfico. */

const EARTH_RADIUS_KM = 6371;

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Telefone moçambicano: 8X XXX XXXX (móvel, operadoras 82-87),
 * com prefixo opcional +258 / 258 / 00258. Espaços e hífens são ignorados.
 */
function isValidPhoneMZ(phone) {
  if (typeof phone !== 'string') return false;
  const digits = phone.replace(/[\s-]/g, '');
  return /^(?:\+?258|00258)?8[2-7]\d{7}$/.test(digits);
}

/** Normaliza um telefone moçambicano para o formato +2588XXXXXXXX. */
function normalizePhoneMZ(phone) {
  const digits = String(phone).replace(/\D/g, '');
  const local = digits.slice(-9);
  return `+258${local}`;
}

function isValidLatitude(lat) {
  const n = Number(lat);
  return lat !== '' && lat !== null && Number.isFinite(n) && n >= -90 && n <= 90;
}

function isValidLongitude(lng) {
  const n = Number(lng);
  return lng !== '' && lng !== null && Number.isFinite(n) && n >= -180 && n <= 180;
}

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

/** Distância em km entre dois pontos (fórmula de Haversine). */
function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Caixa delimitadora (bounding box) em torno de um ponto, usada para
 * pré-filtrar por índice antes de calcular a distância exata.
 */
function boundingBox(lat, lng, radiusKm) {
  const dLat = radiusKm / 111.32;
  const cosLat = Math.cos(toRadians(lat));
  const dLng = radiusKm / (111.32 * Math.max(cosLat, 0.000001));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng
  };
}

/** Interpreta paginação a partir da query string, com limites seguros. */
function parsePagination(query, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = {
  EARTH_RADIUS_KM,
  isValidEmail,
  isValidPhoneMZ,
  normalizePhoneMZ,
  isValidLatitude,
  isValidLongitude,
  haversineKm,
  boundingBox,
  parsePagination
};
