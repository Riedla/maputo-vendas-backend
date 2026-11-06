/**
 * Constrói "col1 = ?, col2 = ?" apenas com as colunas permitidas e
 * definidas em `data`. Nunca interpola nomes de colunas vindos do cliente.
 */
function buildSetClause(data, allowedColumns) {
  const columns = [];
  const values = [];
  for (const col of allowedColumns) {
    if (data[col] !== undefined) {
      columns.push(`${col} = ?`);
      values.push(data[col]);
    }
  }
  return { clause: columns.join(', '), values };
}

/** Escapa os caracteres especiais de LIKE (%, _ e \). */
function escapeLike(term) {
  return String(term).replace(/[\\%_]/g, (c) => `\\${c}`);
}

module.exports = { buildSetClause, escapeLike };
