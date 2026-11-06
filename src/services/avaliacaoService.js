const avaliacaoRepository = require('../repositories/avaliacaoRepository');
const vendedorRepository = require('../repositories/vendedorRepository');
const rotaRepository = require('../repositories/rotaRepository');
const { AppError } = require('../utils/response');

async function criar(idUsuario, { id_vendedor, id_rota = null, nota, comentario = null }) {
  const vendedor = await vendedorRepository.findById(id_vendedor);
  if (!vendedor || !vendedor.ativo) throw AppError.notFound('Vendedor não encontrado');

  if (id_rota) {
    const rota = await rotaRepository.findById(id_rota);
    if (!rota || rota.id_usuario !== idUsuario) throw AppError.notFound('Rota não encontrada');
    if (rota.id_vendedor !== id_vendedor) throw AppError.badRequest('A rota indicada não é para este vendedor');
    if (rota.status_rota === 'cancelada') throw AppError.badRequest('Não é possível avaliar uma rota cancelada');
  }

  if (await avaliacaoRepository.findExistente(idUsuario, id_vendedor, id_rota)) {
    throw AppError.conflict(
      id_rota ? 'Já avaliou este vendedor nesta rota' : 'Já avaliou este vendedor; edite a avaliação existente'
    );
  }

  // Os triggers atualizam a média do vendedor e concluem a rota, se aplicável
  return avaliacaoRepository.create({ id_usuario: idUsuario, id_vendedor, id_rota, nota, comentario });
}

async function obterPropria(id, idUsuario) {
  const avaliacao = await avaliacaoRepository.findById(id);
  if (!avaliacao || avaliacao.id_usuario !== idUsuario) throw AppError.notFound('Avaliação não encontrada');
  return avaliacao;
}

async function atualizar(id, idUsuario, { nota, comentario }) {
  await obterPropria(id, idUsuario);
  return avaliacaoRepository.update(id, { nota, comentario });
}

async function remover(id, idUsuario) {
  await obterPropria(id, idUsuario);
  await avaliacaoRepository.delete(id);
}

async function listarPorVendedor(idVendedor, { limit, offset }) {
  const vendedor = await vendedorRepository.findById(idVendedor);
  if (!vendedor || !vendedor.ativo) throw AppError.notFound('Vendedor não encontrado');

  const [avaliacoes, total, distribuicao] = await Promise.all([
    avaliacaoRepository.findByVendedor(idVendedor, { limit, offset }),
    avaliacaoRepository.countByVendedor(idVendedor),
    avaliacaoRepository.distribuicaoNotas(idVendedor)
  ]);
  return {
    avaliacoes,
    total,
    resumo: { media: vendedor.avaliacao_media, total: vendedor.total_avaliacoes, distribuicao }
  };
}

async function listarPorUsuario(idUsuario, { limit, offset }) {
  const [avaliacoes, total] = await Promise.all([
    avaliacaoRepository.findByUsuario(idUsuario, { limit, offset }),
    avaliacaoRepository.countByUsuario(idUsuario)
  ]);
  return { avaliacoes, total };
}

module.exports = { criar, atualizar, remover, listarPorVendedor, listarPorUsuario };
