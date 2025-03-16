import axios from "axios";

import fs from "fs";
import path from "path";

const ASAAS_API_URL = "https://sandbox.asaas.com/api/v3"; // "https://api.asaas.com/v3";
const ASAAS_ACCESS_TOKEN = process.env.API_PAYMENT_KEY;

// Função utilitária para requisições com tratamento centralizado de erros
async function apiRequest({ url, method, data, headers = {} }) {
  try {
    console.log(
      "🚀 ~ file: apiRequest.ts:20 ~ apiRequest ~ url:",
      ASAAS_API_URL,
      url
    );
    const response = await axios({
      url: `${ASAAS_API_URL}${url}`,
      method,
      data,
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_ACCESS_TOKEN,
        ...headers,
      },
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}

const salvarImagem = (base64Image, filename) => {
  // Remover prefixo 'data:image/png;base64,' se existir
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const imagePath = path.join("qrcode", filename);

  // Verificar se o diretório 'qrcode' existe; caso contrário, criá-lo
  if (!fs.existsSync("qrcode")) {
    fs.mkdirSync("qrcode", { recursive: true });
    console.log(`Diretório criado: qrcode`);
  }

  // Salvar o arquivo
  fs.writeFileSync(imagePath, buffer);
  console.log(`Imagem salva em: ${imagePath}`);
  return `/qrcode/${filename}`;
};

export const createPaymentPix = async (req, res) => {
  const { value, name, cpfCnpj } = req.body;
  const token = process.env.API_PAYMENT_KEY;

  try {
    const clienteAsaasId = await criarOuObterCliente(token, name, cpfCnpj);
    console.log("clienteAsaasId:", clienteAsaasId);
    const cobranca = await criarCobranca(
      clienteAsaasId,
      value,
      "pagamento de consulta",
      token
    );
    console.log(cobranca.id);

    const { encodedImage, payload } = await obterQrCodePix(cobranca.id, token);

    // Gerar um nome de arquivo único
    const filename = `${cobranca.id}.png`;

    // Salvar a imagem e obter o caminho público
    const imageUrl = salvarImagem(encodedImage, filename);

    console.log("qrCode:", payload);
    res.status(201).json({
      qrcodeUrl: `${req.protocol}://${req.get("host")}${imageUrl}`,
      payload,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ erro: "Erro ao processar a cobrança via Pix." });
  }
};

// Função para criar ou obter cliente no Asaas
async function criarOuObterCliente(token, name, cpfCnpj) {
  try {
    const clienteData = {
      name: name,
      cpfCnpj,
    };

    const existingCustomer = await apiRequest({
      url: `/customers?cpfCnpj=${clienteData.cpfCnpj}`,
      method: "GET",
      token,
    });

    if (existingCustomer.data?.[0]?.id) {
      return existingCustomer.data?.[0]?.id; // Retorna o ID do cliente existente no Asaas
    }

    const cliente = await apiRequest({
      url: "/customers",
      method: "POST",
      data: clienteData,
      token,
    });

    return cliente.id; // Retorna o ID do cliente criado no Asaas
  } catch (error) {
    console.log(error.message);
    throw new Error("Erro ao criar ou obter cliente no Asaas.");
  }
}

// Função para criar a cobrança no Asaas
async function criarCobranca(clienteId, valor, descricao, token) {
  const cobrancaData = {
    customer: clienteId, // ID do cliente no Asaas
    billingType: "PIX",
    value: valor,
    dueDate: new Date().toISOString().split("T")[0], // Data de vencimento no formato YYYY-MM-DD
    description: descricao,
  };

  return await apiRequest({
    url: "/payments",
    method: "POST",
    data: cobrancaData,
    token,
  });
}

// Função para obter o QR Code Pix de uma cobrança
async function obterQrCodePix(paymentId, token) {
  return await apiRequest({
    url: `/payments/${paymentId}/pixQrCode`,
    method: "GET",
    token,
  });
}

// Webhook endpoint para receber notificações do Asaas
export const handleWebhook = async (req, res) => {
  const { event, payment } = req.body;

  if (!event || !payment) {
    return res.status(400).json({ error: "Evento ou pagamento inválido" });
  }

  try {
    if (event === "PAYMENT_RECEIVED") {
    } else if (event === "PAYMENT_REJECTED" || event === "PAYMENT_FAILED") {
    }

    res
      .status(200)
      .json({ message: "Evento recebido, sem alterações necessárias" });
  } catch (error) {
    console.error("Erro ao processar o webhook:", error);
    res.status(404).json({ error: "Erro ao processar o webhook" });
  }
};
