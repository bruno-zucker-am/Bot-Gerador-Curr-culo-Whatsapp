module.exports.render = (doc, data) => {
  // -------------------------------------------------------
  // Função para limpar caracteres invisíveis/estranhos
  // -------------------------------------------------------
  const cleanText = (txt) => {
    if (!txt || txt.toLowerCase() === 'não informado' || txt.toLowerCase() === 'não possui') return "";
    return String(txt)
      .normalize("NFC") // normaliza acentos
      .replace(/[\u00A0\u200B-\u200D\uFEFF\u00AD]/g, " ") // espaços/quebras invisíveis
      .replace(/\u2011/g, "-") // hífen não quebrável -> normal
      .replace(/\uFFFD/g, "") // replacement char remove
      .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u017F]/g, "") // remove caracteres fora do intervalo ASCII + Latin-1/Latin-Extended-A
      .replace(/\s+/g, " ")
      .trim();
  };

  // Função para verificar se um campo deve ser renderizado
  const shouldRender = (value) => {
    if (!value) return false;
    if (typeof value === 'string' && (value.trim() === '' || value.toLowerCase() === 'não informado' || value.toLowerCase() === 'não possui')) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  };

  // -------------------------------------------------------
  // 1️⃣ Cores e dimensões
  // -------------------------------------------------------
  const primaryColor = "#00796B"; // Verde esmeralda
  const accentColor = "#B2DFDB"; // Verde claro
  const startX = 50;
  const contentWidth = doc.page.width - 100;

  // -------------------------------------------------------
  // Cabeçalho (Nome + Contato + Foto)
  // -------------------------------------------------------
  let currentY = 10; // Início padrão
  const headerHeight = data.foto ? 120 : 100; // Reduz altura sem foto
  doc.rect(0, 0, doc.page.width, headerHeight).fill(accentColor).stroke();

  // Foto à direita (100x100)
  const photoWidth = 100;
  const photoHeight = 100;
  const photoX = doc.page.width - startX - photoWidth;
  const photoY = 10;

  if (data.foto) {
    try {
      doc
        .rect(photoX - 1, photoY - 1, photoWidth + 2, photoHeight + 2)
        .lineWidth(1)
        .strokeColor(accentColor)
        .stroke();
      doc.image(data.foto, photoX, photoY, { width: photoWidth, height: photoHeight });
    } catch (err) {
      console.log("Erro ao adicionar foto:", err.message);
    }
  }

  // Nome (centralizado)
  if (shouldRender(data.nome)) {
    doc
      .fillColor(primaryColor)
      .fontSize(24)
      .text(cleanText(data.nome), 0, currentY, { align: "center", width: doc.page.width });
    currentY += 30;
  }

  // Endereço
  if (shouldRender(data.endereco)) {
    doc
      .fontSize(10)
      .fillColor("#333")
      .text(`Endereço: ${cleanText(data.endereco)}`, 0, currentY, { align: "center", width: doc.page.width });
    currentY += 15;
  }

  // E-mail e Contato
  if (shouldRender(data.email) || shouldRender(data.numero)) {
    doc
      .fontSize(10)
      .fillColor("#333")
      .text(
        `E-mail: ${cleanText(data.email)} | Contato: ${cleanText(data.numero)}`,
        0,
        currentY,
        { align: "center", width: doc.page.width }
      );
    currentY += 15;
  }

  currentY = Math.max(currentY, data.foto ? photoY + photoHeight + 30 : currentY + 30); // Aumenta espaço sem foto

  // -------------------------------------------------------
  // Função auxiliar – título de seção
  // -------------------------------------------------------
  const drawSectionTitle = (title, y, x = startX) => {
    doc
      .fillColor(primaryColor)
      .fontSize(14)
      .text(title.toUpperCase(), x, y);
    doc.rect(x, y + 18, 5, 2).fill(primaryColor).stroke();
    return y + 30;
  };

  // -------------------------------------------------------
  // Formação Educacional + Informação Pessoal
  // -------------------------------------------------------
  let hasFormation = false;
  if (Array.isArray(data.formacao)) {
    hasFormation = data.formacao.some(f => shouldRender(f.curso) || shouldRender(f.instituicao) || shouldRender(f.status));
  }
  let hasPersonalInfo = shouldRender(data.dataNascimento) || shouldRender(data.estadoCivil) || shouldRender(data.cnh);

  if (hasFormation || hasPersonalInfo) {
    currentY += 10; // Espaço extra antes da seção
    const leftColX = startX;
    const rightColX = startX + contentWidth * 0.5 + 10;
    const colWidth = contentWidth * 0.5 - 10;
    let rightColY = currentY;

    // Formação Educacional (coluna esquerda)
    if (hasFormation) {
      currentY = drawSectionTitle("Formação Educacional", currentY, leftColX);
      const formacoes = Array.isArray(data.formacao) ? data.formacao : [];
      formacoes.forEach((f, i) => {
        if (shouldRender(f.curso) || shouldRender(f.instituicao) || shouldRender(f.status)) {
          doc
            .fontSize(10)
            .fillColor("#333")
            .text(cleanText(f.curso), leftColX, currentY, { width: colWidth });
          doc
            .fontSize(10)
            .fillColor("#555")
            .text(`${cleanText(f.instituicao)} ${f.status ? '- ' + cleanText(f.status) : ''}`, leftColX, currentY + 15, { width: colWidth });
          currentY += 40;
        }
      });
    }

    // Informação Pessoal (coluna direita)
    if (hasPersonalInfo) {
      rightColY = drawSectionTitle("Informação Pessoal", rightColY, rightColX);
      if (shouldRender(data.dataNascimento)) {
        doc
          .fontSize(10)
          .fillColor("#333")
          .text(`Nascimento: ${cleanText(data.dataNascimento)}`, rightColX, rightColY, { width: colWidth });
        rightColY += 15;
      }
      if (shouldRender(data.estadoCivil)) {
        doc
          .fontSize(10)
          .fillColor("#333")
          .text(`Estado Civil: ${cleanText(data.estadoCivil)}`, rightColX, rightColY, { width: colWidth });
        rightColY += 15;
      }
      if (shouldRender(data.cnh)) {
        doc
          .fontSize(10)
          .fillColor("#333")
          .text(`CNH: ${cleanText(data.cnh)}`, rightColX, rightColY, { width: colWidth });
        rightColY += 15;
      }
    }

    currentY = Math.max(currentY, rightColY + 15);
    doc.moveTo(startX, currentY).lineTo(doc.page.width - startX, currentY).strokeColor(accentColor).lineWidth(1).stroke();
    currentY += 20;
  }

  // -------------------------------------------------------
  // Objetivo Profissional
  // -------------------------------------------------------
  if (shouldRender(data.objetivo)) {
    currentY = drawSectionTitle("Objetivo Profissional", currentY);
    const objetivoText = Array.isArray(data.objetivo) ? data.objetivo.join(" ") : data.objetivo;
    doc
      .fontSize(10)
      .fillColor("#444")
      .text(cleanText(objetivoText), startX, currentY, { width: contentWidth, paragraphGap: 5 });
    currentY += doc.heightOfString(cleanText(objetivoText), { width: contentWidth }) + 20;
  }

  // -------------------------------------------------------
  // Cursos de Qualificação
  // -------------------------------------------------------
  if (shouldRender(data.qualificacao)) {
    currentY = drawSectionTitle("Cursos de Qualificação", currentY);
    const qualificacoes = Array.isArray(data.qualificacao) ? data.qualificacao : [];
    qualificacoes.forEach(q => {
      if (shouldRender(q)) {
        doc.fontSize(10).fillColor("#555").text(`• ${cleanText(q)}`, startX, currentY, { width: contentWidth });
        currentY += doc.heightOfString(`• ${cleanText(q)}`, { width: contentWidth }) + 3;
      }
    });
    currentY += 10;
    doc.moveTo(startX, currentY).lineTo(doc.page.width - startX, currentY).strokeColor(accentColor).lineWidth(1).stroke();
    currentY += 20;
  }

  // -------------------------------------------------------
  // Experiência Profissional (timeline)
  // -------------------------------------------------------
  if (shouldRender(data.experiencia)) {
    currentY = drawSectionTitle("Experiência Profissional", currentY);
    const timelineDotX = startX + 50;
    const detailsX = startX + 70;
    const experiencias = Array.isArray(data.experiencia) ? data.experiencia : [];
    experiencias.forEach(exp => {
      if (shouldRender(exp.cargo) || shouldRender(exp.empresa) || shouldRender(exp.periodo) || shouldRender(exp.detalhes)) {
        const detalhesSan = cleanText(exp.detalhes);
        const textHeight = doc.heightOfString(detalhesSan, { width: contentWidth - 70 });

        // linha vertical
        doc.moveTo(timelineDotX, currentY + 5)
          .lineTo(timelineDotX, currentY + textHeight + 35)
          .strokeColor(primaryColor).lineWidth(1).stroke();

        // período
        if (shouldRender(exp.periodo)) {
          doc.fillColor(primaryColor).fontSize(10).text(cleanText(exp.periodo), startX, currentY);
        }

        // bolinha
        doc.circle(timelineDotX, currentY + 5, 3).fill("white").strokeColor(primaryColor).lineWidth(2).stroke();

        // cargo - empresa
        if (shouldRender(exp.cargo) || shouldRender(exp.empresa)) {
          doc.fontSize(10).fillColor("#333").text(`${cleanText(exp.cargo)}${exp.empresa ? ' - ' + cleanText(exp.empresa) : ''}`, detailsX, currentY);
        }

        // detalhes
        if (shouldRender(exp.detalhes)) {
          doc.fontSize(10).fillColor("#555").text(detalhesSan, detailsX, currentY + 15, { width: contentWidth - 70, paragraphGap: 5 });
        }

        currentY += textHeight + 45;
      }
    });
  }

  // -------------------------------------------------------
  // Perfil Profissional
  // -------------------------------------------------------
  if (shouldRender(data.perfil)) {
    currentY += 20;
    currentY = drawSectionTitle("Perfil Profissional", currentY);
    const perfilText = Array.isArray(data.perfil) ? data.perfil.join(" ") : data.perfil;
    doc.fontSize(10).fillColor("#444").text(cleanText(perfilText), startX, currentY, { width: contentWidth, paragraphGap: 5 });
  }

  // Finaliza o PDF
  doc.end();
};