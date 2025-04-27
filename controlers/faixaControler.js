import { Op } from "sequelize";
import Ticket from "../models/TbTIcket.js";
import FaixaDivida from "../models/faixaFinanceira.js";
import DddRegiao from "../models/dddRegiao.js";

// extrai o DDD de um número de telefone
function extractDDD(phone) {
  const onlyDigits = phone.replace(/\D/g, "");
  if (onlyDigits.startsWith("55") && onlyDigits.length > 10) {
    return onlyDigits.substring(2, 4);
  } else if (onlyDigits.length === 10) {
    return onlyDigits.substring(0, 2);
  }
  return null;
}

// obtém a região a partir do DDD usando a tabela ddd_regioes
async function getRegionByTicketId(idTicket) {
  const tk = await Ticket.findOne({
    where: { id_ticket: idTicket },
    attributes: ["whatsapp_id"],
  });
  if (!tk?.whatsapp_id) return null;

  const ddd = extractDDD(tk.whatsapp_id);
  if (!ddd) return null;

  const reg = await DddRegiao.findOne({ where: { ddd } });
  return reg ? reg.regiao : null;
}

// determina a faixa e todos os valores associados pela tabela faixa_divida
async function getFaixaData(valor) {
  // procura a primeira faixa cujo limite (divida) seja >= valor
  let row = await FaixaDivida.findOne({
    where: { divida: { [Op.gte]: valor } },
    order: [["divida", "ASC"]],
  });

  // se valor for maior do que qualquer limite, pega a última faixa
  if (!row) {
    row = await FaixaDivida.findOne({
      order: [["divida", "DESC"]],
    });
  }

  return row; 
  // row contém: { faixa, divida, entrada, parcelas, parcela, total }
}

app.get("/pdf/:id", async (req, res) => {
  try {
    const idTicket = req.params.id;
    const { status_id, url: fileName, divida } = await getUrlViaId(idTicket);

    if (status_id !== "3") {
      throw new Error("A consulta ainda não foi finalizada.");
    }

    // constrói a URL de download
    const fullUrl = `https://drlimpanome.site/download/${fileName}`;

    // formata a dívida original
    const dividaNum = parseFloat(divida);
    const dividaFmt = formatCurrency(dividaNum);

    // busca os dados da faixa
    const faixaRow = await getFaixaData(dividaNum);

    // busca a região (campo unidade)
    const unidade = await getRegionByTicketId(idTicket);

    // responde com todos os campos do novo modelo
    return res.status(200).json({
      message: "Upload successful",
      url: fullUrl,
      faixa:    faixaRow.faixa,                    // e.g. "FAIXA 10"
      divida:   dividaFmt,                         // formatação moeda
      entrada:  formatCurrency(faixaRow.entrada),
      parcelas: faixaRow.parcelas,
      parcela:  formatCurrency(faixaRow.parcela),
      total:    formatCurrency(faixaRow.total),
      unidade,                                    // string ou null
    });
  } catch (err) {
    console.error(err);
    return res.status(200).json({
      message: "ocorreu um erro",
      error:   err.message,
    });
  }
});
