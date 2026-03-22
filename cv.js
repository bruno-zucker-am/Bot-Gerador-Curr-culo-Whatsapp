/* ==============================================================
   BOT WHATSAPP – GERAÇÃO DE CURRÍCULO COM ESCOLHA DE MODELO.
   ============================================================== */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { gerarPagamento, verificarPagamento } = require('./cv_webhook');

// ★ IMPORTA TODOS OS LAYOUTS DE UMA VEZ
const layoutModules = {
    layout1: require('./layouts/layout1'),
    layout2: require('./layouts/layout2'),
    layout3: require('./layouts/layout3')
};

/* --------------------------------------------------------------
   CONFIGURAÇÃO DO CLIENTE
   -------------------------------------------------------------- */
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('✅ Bot está pronto!'));

/* --------------------------------------------------------------
   ESTADOS DE USUÁRIO (mantidos em memória)
   -------------------------------------------------------------- */
let userData = {};      // Dados coletados por chat
let step = {};          // Etapa atual de cada chat
let paymentStatus = {}; // pendente / aprovado
let paymentIds = {};    // IDs dos pagamentos
let reminders = {};    // Temporizadores (caso precise cancelar)

/* --------------------------------------------------------------
   FUNÇÃO AUXILIAR – ENVIAR PREVIEWS DOS MODELOS
   -------------------------------------------------------------- */
async function enviarPreviews(chatId) {
    for (let i = 1; i <= 5; i++) {
        const imgPath = path.join(__dirname, 'modelos', `modelo${i}.png`);
        if (fs.existsSync(imgPath)) {
            const media = MessageMedia.fromFilePath(imgPath);
            await client.sendMessage(chatId, media, { caption: `Modelo M${i}` });
        }
    }
}

/* --------------------------------------------------------------
   MANIPULAÇÃO DE MENSAGENS
   -------------------------------------------------------------- */
client.on('message', async message => {
    const chatId = message.from;
    const msg = message.body.trim();

    // ---------------------------------------------------------
    // Dados do contato (nome exibido)
    // ---------------------------------------------------------
    const contact = await message.getContact();
    const nomeContato = contact.pushname || "usuário(a)";

    // Simula "digitando..."
    const chat = await message.getChat();
    chat.sendStateTyping();
    await new Promise(resolve => setTimeout(resolve, 800));

    console.log(`📩 Mensagem de ${nomeContato} (${chatId}): ${msg}`);

    /* ==================== COMANDOS GLOBAIS ==================== */
    if (msg.toLowerCase() === 'status') {
        if (paymentStatus[chatId] === 'pendente')
            return message.reply("🕐 Aguardando o pagamento PIX...");
        if (paymentStatus[chatId] === 'aprovado')
            return message.reply("✅ Pagamento já foi confirmado.");
        return message.reply("ℹ️ Nenhum pagamento encontrado. Digite *menu* para recomeçar.");
    }

    if (msg.toLowerCase() === 'cancelar') {
        if (reminders[chatId]) {
            clearTimeout(reminders[chatId]);
            delete reminders[chatId];
        }
        delete step[chatId];
        delete userData[chatId];
        delete paymentStatus[chatId];
        delete paymentIds[chatId];
        return message.reply("❌ Processo cancelado. Digite *menu* para recomeçar.");
    }

    if (msg.toLowerCase() === 'feedback') {
        if (step[chatId] === 'feedback') {
            message.reply("📝 Obrigado pelo seu feedback! Ele será considerado para melhorias futuras.");
            delete step[chatId];
        } else {
            message.reply("📝 Por favor, envie seu feedback sobre o serviço.");
            step[chatId] = 'feedback';
        }
        return;
    }

    /* ==================== INÍCIO DO FLUXO ==================== */
    if (!step[chatId]) {
        step[chatId] = 'menu';
        userData[chatId] = {};
        return message.reply(
            "🌟 **Bem Vindo(a) a GLOBAL-CURRÍCULO-RESUME!** 🌟\n\n" +
            "📝 Seu currículo pronto em menos de 3 minutos por apenas *R$ 15,50*! 💰\n" +
            "Escolha uma opção:\n\n" +
            "1️⃣ *Gerar Currículo*\n" +
            "2️⃣ *Ver Modelos*\n" +
            "3️⃣ *Como Funciona (Video Tutorial)*\n\n" +
            "🔔 *Digite a opção desejada e pressione Enter!*"
        );
    }

    /* ==================== MENU PRINCIPAL ==================== */
    if (step[chatId] === 'menu') {
        // Verifica se é uma escolha de modelo direta (M1-M3)
        const upperMsg = msg.toUpperCase();
        let modeloNum = null;
        if (upperMsg.startsWith('M') && upperMsg.length === 2) {
            modeloNum = parseInt(upperMsg[1], 10);
        }
        if (Number.isInteger(modeloNum) && modeloNum >= 1 && modeloNum <= 3) {
            userData[chatId].modeloEscolhido = modeloNum; // guarda a escolha
            step[chatId] = 'nome';
            return message.reply("👤 *CONTATO:*\nDigite seu *Nome Completo*");
        }

        switch (msg) {
            case '1':
                // ★ Primeiro pedimos o modelo antes de coletar os dados
                step[chatId] = 'escolha_modelo';
                return message.reply(
                    "📄 *Escolha o modelo do currículo* (digite M1‑M2-M3). " +
                    "Caso ainda não saiba, digite *2* para ver os previews."
                );

            case '2':
                // ★ Envia as 3 imagens de preview
                await enviarPreviews(chatId);
                return message.reply(
                    "✅ *Modelos enviados.* Digite o modelo desejado (M1‑M2-M3)."
                );

            case '3':
                return message.reply(
                    "📽️ Veja o vídeo tutorial de como funciona!\n🔗 [Assista aqui](https://www.facebook.com/share/v/19caFse14G/)"
                );

            default:
                return message.reply("⚠️ Opção inválida. Digite 1, 2 ou 3.");
        }
    }

    /* ==================== ETAPAS DE COLETA ==================== */
    switch (step[chatId]) {
        // -------------------------------------------------------
        // 1️⃣ ESCOLHA DO MODELO
        // -------------------------------------------------------
        case 'escolha_modelo': {
            const upperMsg = msg.toUpperCase();
            let modeloNum = null;
            if (upperMsg.startsWith('M') && upperMsg.length === 2) {
                modeloNum = parseInt(upperMsg[1], 10);
            }
            if (Number.isInteger(modeloNum) && modeloNum >= 1 && modeloNum <= 3) {
                userData[chatId].modeloEscolhido = modeloNum; // guarda a escolha
                step[chatId] = 'nome';
                return message.reply("👤 *CONTATO:*\nDigite seu *Nome Completo*");
            }
            // Se quiser ver os previews novamente:
            if (msg === '2') {
                await enviarPreviews(chatId);
                return message.reply(
                    "✅ Modelos enviados. Digite o modelo desejado (M1‑M2-M3)."
                );
            }
            return message.reply(
                "❌ Modelo inválido. Digite M1 a M3 ou *2* para visualizar os modelos."
            );
        }

        // -------------------------------------------------------
        // 2️⃣ COLETA DOS DADOS
        // -------------------------------------------------------
        case 'nome':
            userData[chatId].nome = msg;
            step[chatId] = 'endereco';
            return message.reply("🏠 *CONTATO:*\nDigite seu Endereço: *Rua, Número, Bairro*");

        case 'endereco':
            userData[chatId].endereco = msg;
            step[chatId] = 'numero';
            return message.reply("📞 *CONTATO:*\nDigite seu Número. Ex: *(11) 99153-3981*");

        case 'numero':
            userData[chatId].numero = msg;
            step[chatId] = 'email';
            return message.reply("📧 *CONTATO:*\nDigite seu *Email*");

        case 'email':
            userData[chatId].email = msg;
            step[chatId] = 'cnh';
            return message.reply("🚗 *INFORMAÇÕES PESSOAIS:*\nDigite sua *CNH* Ex: A/B (Digite 'Pular' se não tiver)");

        case 'cnh':
            userData[chatId].cnh = msg.toLowerCase() === 'pular' ? 'Não possui' : msg; // Sempre string
            step[chatId] = 'data_nascimento';
            return message.reply("📅 *INFORMAÇÕES PESSOAIS:*\nDigite sua *Data de Nascimento* (DD/MM/AAAA)");

        case 'data_nascimento':
            userData[chatId].dataNascimento = msg;
            step[chatId] = 'estado_civil';
            return message.reply("💍 *INFORMAÇÕES PESSOAIS:*\nDigite seu *Estado Civil*");

        case 'estado_civil':
            userData[chatId].estadoCivil = msg;
            step[chatId] = 'formacao';
            return message.reply(
                "🎓 *FORMAÇÃO EDUCACIONAL:*\n" +
                "Digite suas formações no formato: *Instituição, Curso, Status*. " +
                "Para múltiplas formações, separe cada uma com Enter. Exemplo:\n" +
                "FACULDADE ABC, Administração de Sistemas, Cursando\n" +
                "FACULDADE XYZ, Análise de Sistemas, Concluído\n\n" +
                "Digite 'Pular' se não houver formação."
            );

        case 'formacao':
            if (msg.toLowerCase() === 'pular') {
                userData[chatId].formacao = [];
                step[chatId] = 'objetivo';
            } else {
                // Divide as linhas e processa cada formação
                const formacoes = msg.split('\n').map(line => line.trim()).filter(line => line);
                userData[chatId].formacao = formacoes.map(formacao => {
                    const [instituicao, curso, status] = formacao.split(',').map(item => item.trim());
                    return { instituicao, curso, status };
                });
                step[chatId] = 'objetivo';
            }
            return message.reply(
                "🎯 *OBJETIVO PROFISSIONAL:*\n" +
                "Descreva seu objetivo profissional. Ex: *Busco oportunidades para aplicar minhas habilidades.* ou digite 'Pular'."
            );

        case 'objetivo':
            userData[chatId].objetivo = msg.toLowerCase() === 'pular' ? '' : msg; // Armazena como string
            step[chatId] = 'experiencia';
            return message.reply(
                "💼 *EXPERIÊNCIA PROFISSIONAL:*\n" +
                "Digite suas experiências no formato: *Empresa, Cargo, Período, Descrição*. " +
                "Para múltiplas experiências, separe cada uma com Enter. Exemplo:\n" +
                "Luxos ABC, Operador, 2010-2015, Trabalhava como Operador\n" +
                "Empresa XYZ, Analista, 2016-2020, Gestão de projetos\n\n" +
                "Digite 'Pular' se não houver experiência."
            );

        case 'experiencia':
            if (msg.toLowerCase() === 'pular') {
                userData[chatId].experiencia = [];
                step[chatId] = 'cursos';
            } else {
                // Divide as linhas e processa cada experiência
                const experiencias = msg.split('\n').map(line => line.trim()).filter(line => line);
                userData[chatId].experiencia = experiencias.map(exp => {
                    const [empresa, cargo, periodo, ...desc] = exp.split(',').map(item => item.trim());
                    return {
                        empresa,
                        cargo,
                        periodo,
                        detalhes: desc.join(', ')
                    };
                });
                step[chatId] = 'cursos';
            }
            return message.reply(
                "📚 *CURSOS DE QUALIFICAÇÃO:*\n" +
                "Digite os cursos, um por linha. Exemplo:\n" +
                "Informática Básica\n" +
                "Informática Avançada\n" +
                "Agente de Portaria\n\n" +
                "Digite 'Pular' se não houver cursos."
            );

        case 'cursos':
            if (msg.toLowerCase() === 'pular') {
                userData[chatId].cursos = [];
                step[chatId] = 'perfil';
            } else {
                // Divide as linhas para os cursos
                userData[chatId].cursos = msg.split('\n').map(line => line.trim()).filter(line => line);
                step[chatId] = 'perfil';
            }
            return message.reply(
                "📝 *PERFIL PROFISSIONAL:*\n" +
                "Descreva seu perfil profissional. Ex: *Profissional dedicado, com habilidades em tecnologia.* ou digite 'Pular'."
            );

        case 'perfil':
            userData[chatId].perfil = msg.toLowerCase() === 'pular' ? '' : msg; // Armazena como string
            step[chatId] = 'foto';
            return message.reply("📸 *Deseja Adicionar Uma Foto no Currículo?*\nResponda com *Sim* ou *Não*.");

        // -------------------------------------------------------
        // 3️⃣ RECEBIMENTO DA FOTO (se houver)
        // -------------------------------------------------------
        case 'foto':
            if (msg.toLowerCase() === 'sim') {
                step[chatId] = 'receber_foto';
                return message.reply("📷 *Envie sua Foto para o Currículo*.");
            }
            // Se não quiser foto, vai direto ao pagamento
            step[chatId] = 'pagamento';
            message.reply("💸 Gerando pagamento via PIX. Aguarde...");
            return gerarPagamentoPIX(chatId, client);

        case 'receber_foto':
            if (message.hasMedia) {
                const media = await message.downloadMedia();
                const ext = media.mimetype.split('/')[1]; // jpeg, png, etc.
                const valid = ['jpeg', 'jpg', 'png'];
                if (!valid.includes(ext)) {
                    return message.reply("❌ Formato de imagem inválido. Envie PNG, JPG ou JPEG.");
                }

                const dir = path.join(__dirname, 'cv');
                if (!fs.existsSync(dir)) fs.mkdirSync(dir);
                const filePath = path.join(dir, `foto_${chatId}.${ext}`);

                try {
                    fs.writeFileSync(filePath, media.data, 'base64');
                    userData[chatId].fotoPath = filePath;
                    step[chatId] = 'pagamento';
                    message.reply("✅ Foto recebida! Gerando pagamento via PIX. Aguarde...");
                    return gerarPagamentoPIX(chatId, client);
                } catch (e) {
                    console.error('Erro ao salvar foto:', e);
                    return message.reply("❌ Falha ao salvar a foto. Tente novamente.");
                }
            }
            return message.reply("❌ Por favor, envie uma foto válida.");

        // -------------------------------------------------------
        // 4️⃣ ESPERA PELO PAGAMENTO
        // -------------------------------------------------------
        case 'aguardando_pagamento':
            return message.reply("⏳ Ainda aguardando a confirmação do pagamento. Digite *status* para checar.");
    }
});

/* ==============================================================
   FUNÇÃO DE GERAÇÃO DE PAGAMENTO (PIX)
   ============================================================== */
async function gerarPagamentoPIX(chatId, client) {
    try {
        const nomeProduto = "Currículo Vitae";
        const emailFallback = `${chatId.replace(/[@:\-]/g, '')}@curriculoszap.com`;

        const pagamento = await gerarPagamento(15.50, nomeProduto, emailFallback);

        paymentIds[chatId] = pagamento.payment_id;
        paymentStatus[chatId] = 'pendente';

        // Salva o QR Code temporariamente
        const qrPath = path.join(__dirname, 'cv', `qrcode_${chatId}.jpg`);
        fs.writeFileSync(qrPath, Buffer.from(pagamento.qr_code, 'base64'));

        const qrMedia = MessageMedia.fromFilePath(qrPath);

        // Mensagens de pagamento
        await client.sendMessage(chatId,
            "📄 *Pagamento Requerido*\n\n" +
            `💰 Valor: R$ 15,50\n` +
            `📅 Vencimento: ${new Date(pagamento.expiracao).toLocaleString('pt-BR')}\n\n` +
            `Copie e Código Abaixo e Cole no App do Seu Banco Pra Efetuar o Pagamento:`
        );
        await client.sendMessage(chatId, "🔗 *PIX Copia e Cola:*");
        await client.sendMessage(chatId, pagamento.copia_cola);
        await client.sendMessage(chatId, "⏳ Aguarde a confirmação automática. Você também pode digitar *status* a qualquer momento.");

        step[chatId] = 'aguardando_pagamento';

        // Verifica a cada 15 s
        const interval = setInterval(async () => {
            const aprovado = await verificarPagamento(pagamento.payment_id);
            if (aprovado) {
                clearInterval(interval);
                paymentStatus[chatId] = 'aprovado';
                await client.sendMessage(chatId, "✅ Pagamento confirmado! Gerando seu currículo...");
                // ★ Verifica se os dados existem antes de gerar
                if (!userData[chatId] || !userData[chatId].modeloEscolhido) {
                    await client.sendMessage(chatId, "❌ Erro: Dados incompletos. Inicie o processo novamente com *menu*.");
                    try { fs.unlinkSync(qrPath); } catch (_) {}
                    delete paymentIds[chatId];
                    delete paymentStatus[chatId];
                    delete step[chatId];
                    delete userData[chatId];
                    return;
                }
                // ★ CHAMA A FUNÇÃO PASSANDO O NÚMERO DO MODELO ESCOLHIDO
                gerarCurriculo(chatId, userData[chatId].modeloEscolhido);
                // Remove QR Code
                try { fs.unlinkSync(qrPath); } catch (_) {}
                delete paymentIds[chatId];
                delete paymentStatus[chatId];
            }
        }, 15000);
    } catch (err) {
        console.error('Erro no pagamento:', err);
        client.sendMessage(chatId, "❌ Erro ao processar o pagamento. Tente novamente mais tarde.");
    }
}

/* ==============================================================
   FUNÇÃO DE GERAÇÃO DO CURRÍCULO (USANDO O LAYOUT ESCOLHIDO)
   ============================================================== */
function gerarCurriculo(chatId, modeloNumero) {
    // Verificação adicional de segurança
    if (!userData[chatId]) {
        console.error(`❌ userData não encontrado para ${chatId}`);
        client.sendMessage(chatId, "❌ Erro interno: Dados perdidos. Inicie novamente com *menu*.");
        return;
    }

    const filePath = path.join(__dirname, 'cv', `curriculo_${chatId}.pdf`);
    const doc = new PDFDocument();

    // Salva o PDF em disco
    doc.pipe(fs.createWriteStream(filePath));

    // ---------- Seleciona o layout correto ----------
    const layoutKey = `layout${modeloNumero}`;            // ex.: "layout3"
    const layout = layoutModules[layoutKey];              // objeto com a função render
    if (!layout) {
        console.error(`❌ Layout ${modeloNumero} não encontrado!`);
        client.sendMessage(chatId, "❌ Erro interno: layout de currículo não encontrado.");
        return;
    }

    // ---------- Prepara os dados para evitar erros de undefined/forEach ----------
    const data = {
        nome: userData[chatId].nome || "",
        email: userData[chatId].email || "",
        numero: userData[chatId].numero || "",
        endereco: userData[chatId].endereco || "",
        dataNascimento: userData[chatId].dataNascimento || "",
        estadoCivil: userData[chatId].estadoCivil || "",
        cnh: userData[chatId].cnh || "", // Garante que seja string
        formacao: Array.isArray(userData[chatId].formacao) ? userData[chatId].formacao : [],
        experiencia: Array.isArray(userData[chatId].experiencia) ? userData[chatId].experiencia : [],
        qualificacao: Array.isArray(userData[chatId].cursos) ? userData[chatId].cursos : [],
        objetivo: userData[chatId].objetivo || "", // Garante que seja string
        perfil: userData[chatId].perfil || "", // Garante que seja string
        foto: userData[chatId].fotoPath || null,
        modeloEscolhido: modeloNumero
    };

    // Log para debug
    console.log(`📋 Dados preparados para modelo ${modeloNumero}:`, data);

    // ---------- Renderiza o PDF ----------
    try {
        layout.render(doc, data); // ← função exportada por layoutX.js
    } catch (e) {
        console.error('Erro ao renderizar layout:', e);
        console.error('Stack trace:', e.stack);
        client.sendMessage(chatId, "❌ Ocorreu um erro ao montar o currículo. Tente novamente com *menu*. (Detalhes no console para debug).");
        // Limpa o PDF parcial se houver erro
        try { fs.unlinkSync(filePath); } catch (_) {}
        return;
    }

    // ---------- Envia o PDF ----------
    setTimeout(() => {
        if (fs.existsSync(filePath)) {
            const pdfMedia = MessageMedia.fromFilePath(filePath);
            client.sendMessage(chatId, pdfMedia);
            console.log(`📄 Currículo modelo ${modeloNumero} enviado para ${chatId}`);
        } else {
            console.error(`❌ PDF não gerado para ${chatId}`);
            client.sendMessage(chatId, "❌ Erro ao gerar o arquivo. Tente novamente.");
        }

        // Limpeza de arquivos temporários
        if (userData[chatId]?.fotoPath) {
            try { fs.unlinkSync(userData[chatId].fotoPath); } catch (_) {}
        }
        try { fs.unlinkSync(filePath); } catch (_) {}

        // Reseta o estado do usuário
        delete step[chatId];
        delete userData[chatId];

        client.sendMessage(chatId,
            "📝 Seu currículo foi enviado! Digite *feedback* se quiser comentar sobre nosso serviço."
        );
    }, 2000);
}

/* ==============================================================
   TRATAMENTO DE ERROS GLOBAIS
   ============================================================== */
process.on('uncaughtException', err => console.error('⚠️ Erro não tratado:', err));
process.on('unhandledRejection', reason => console.error('⚠️ Promessa rejeitada sem catch:', reason));

/* ==============================================================
   INICIALIZA O BOT
   ============================================================== */
client.initialize();