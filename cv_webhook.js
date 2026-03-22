const axios = require('axios'); // Importa a biblioteca Axios para fazer requisições HTTP
const { v4: uuidv4 } = require('uuid'); // Importa a função para gerar UUIDs únicos
require('dotenv').config(); // carrega as variáveis do arquivo .env

// agora você acessa as variáveis assim:
const MERCADO_PAGO_TOKEN = process.env.MERCADO_PAGO_TOKEN;

// Função para gerar um pagamento PIX
async function gerarPagamento(valor, produtoNome, email) {
    if (isNaN(valor)) { // Verifica se o valor é um número válido
        throw new Error("O valor do pagamento não é um número válido!");
    }

    try {
        // Chama a função que realiza o pagamento via API do Mercado Pago
        const response = await realizarPagamento(valor, email);
        // Retorna os dados formatados da resposta do Mercado Pago
        return formatarRespostaPagamento(response, produtoNome);
    } catch (error) {
        console.error("Erro ao gerar pagamento:", error.response?.data || error.message);
        throw new Error("Erro ao processar pagamento. Tente novamente.");
    }
}

// Função para realizar o pagamento na API do Mercado Pago
async function realizarPagamento(valor, email) {
    return axios.post(
        'https://api.mercadopago.com/v1/payments', // Endpoint da API do Mercado Pago
        {
            transaction_amount: parseFloat(valor), // Converte o valor para número decimal
            payment_method_id: 'pix', // Define o método de pagamento como PIX
            payer: { email: email } // Define o email do pagador
        },
        {
            headers: {
                Authorization: `Bearer ${MERCADO_PAGO_TOKEN}`, // Token de autenticação
                "X-Idempotency-Key": uuidv4() // Gera um ID único para evitar pagamentos duplicados
            }
        }
    );
}

// Função para formatar a resposta da API do Mercado Pago
function formatarRespostaPagamento(response, produtoNome) {
    return {
        nome_produto: produtoNome, // Nome do produto
        qr_code: response.data.point_of_interaction.transaction_data.qr_code_base64, // QR Code em Base64
        copia_cola: response.data.point_of_interaction.transaction_data.qr_code, // Código para copiar e colar
        expiracao: response.data.date_of_expiration, // Data de expiração do pagamento
        payment_id: response.data.id // ID do pagamento gerado pelo Mercado Pago
    };
}

// Função para verificar o status do pagamento
async function verificarPagamento(paymentId) {
    try {
        // Faz uma requisição GET para consultar o pagamento pelo ID
        const response = await axios.get(
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
            {
                headers: { Authorization: `Bearer ${MERCADO_PAGO_TOKEN}` }
 // Token de autenticação
            }
        );
        // Retorna true se o status do pagamento for "approved" (aprovado)
        return response.data.status === "approved";
    } catch (error) {
        console.error("Erro ao verificar pagamento:", error.response?.data || error.message);
        return false; // Retorna false em caso de erro
    }
}

// Exporta as funções para serem utilizadas em outros arquivos
module.exports = { gerarPagamento, verificarPagamento };
