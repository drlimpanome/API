import { Op } from 'sequelize';
import FaixaDivida from '../models/faixaFinanceira.js';
import DddRegiao   from '../models/dddRegiao.js';
import Ticket      from '../models/TbTIcket.js';

// extrai DDD de um número de telefone brasileiro
function extractDDD(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 10) {
    return digits.substr(2, 2);
  }
  if (digits.length === 10) {
    return digits.substr(0, 2);
  }
  return null;
}

// busca região a partir do id do ticket
export async function verifyRegion(idTicket) {
  const tk = await Ticket.findOne({
    where: { id_ticket: idTicket },
    attributes: ['whatsapp_id']
  });
  if (!tk?.whatsapp_id) return null;

  const ddd = extractDDD(tk.whatsapp_id);
  if (!ddd) return null;

  const reg = await DddRegiao.findOne({ where: { ddd } });
  return reg?.sigla_regiao ?? null;
}

// determina a faixa e todos os valores associados (entrada, parcelas, parcela, total)
async function getFaixaData(valor) {
  // busca a menor faixa cuja dívida mínima seja <= valor
  let faixaRow = await FaixaDivida.findOne({
    where: { divida: { [Op.gte]: valor } },
    order: [['divida', 'ASC']]
  });

  // se valor maior que qualquer divida, pega a última faixa
  if (!faixaRow) {
    faixaRow = await FaixaDivida.findOne({
      order: [['divida', 'DESC']]
    });
  }

  return faixaRow;
}

/**
 * Retorna um objeto com:
 * {
 *   faixa, divida, entrada, parcelas, parcela, total, region
 * }
 */
export default async function VerifyFaixa(valorOriginal, idTicket) {
  // valida entrada
  const num = Number(valorOriginal);
  if (!isFinite(num)) throw new Error("Valor inválido para faixa");

  // busca dados da faixa
  let faixaRow = await getFaixaData(num);
  const region = await verifyRegion(idTicket);

  if (!faixaRow) {
    return {
      faixa:         null,
      dividaOriginal: num,          // mantém o valor real
      dividaFaixa:    null,         // sem faixa
      entrada:       null,
      parcelas:     null,
      parcela:       null,
      total:         null,
      region
    };
  }

  return {
    faixa:          faixaRow.faixa,
    dividaOriginal: num,                              // valor real
    dividaFaixa:    parseFloat(faixaRow.divida),      // limite da faixa
    entrada:        parseFloat(faixaRow.entrada),
    parcelas:      faixaRow.parcelas,
    parcela:        parseFloat(faixaRow.parcela),
    total:          parseFloat(faixaRow.total),
    region
  };
}

