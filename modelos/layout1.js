module.exports.render = (doc, data) => {
  // -------------------------------------------------------
  // Função para limpar caracteres invisíveis/estranhos
  // -------------------------------------------------------
  const cleanText = (txt) => {
    if (!txt || txt.toLowerCase() === 'não informado' || txt.toLowerCase() === 'não possui') return "";
    return txt
      .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, ' ')
      .replace(/[^\p{L}\p{N}\s.,;:!?\-()áéíóúàèìòùãõçÁÉÍÓÚÀÈÌÒÙÃÕÇ]/gu, '')
      .replace(/\s+/g, ' ')
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
  // Cabeçalho (foto + nome + contatos)
  // -------------------------------------------------------
  const primaryColor = "#424242";
  const accentColor = "#DCE775";
  const startX = 50;
  const contentWidth = doc.page.width - 100;
  const contentFontSize = 10;

  // Foto opcional com borda
  const photoWidth = 100;
  const photoHeight = 100;
  const photoX = startX;
  const photoY = 10;

  doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);

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

  // Nome e contatos
  const fontSize = 22;
  const lineHeight = 15;
  const totalHeight = fontSize + lineHeight * 2;
  
  // Ajusta posicionamento com base na presença da foto
  const nameX = data.foto ? photoX + photoWidth + 15 : startX; // Se não houver foto, começa em startX
  const nameWidth = data.foto ? doc.page.width - nameX - 50 : contentWidth; // Se não houver foto, usa largura total
  const startY = photoY + (photoHeight / 2) - (totalHeight / 2);

  if (shouldRender(data.nome)) {
    doc
      .fillColor("#FFFFFF")
      .fontSize(fontSize)
      .text(cleanText(data.nome), nameX, startY, { width: nameWidth, align: "center" });
  }

  if (shouldRender(data.endereco)) {
    doc
      .fontSize(contentFontSize)
      .fillColor(accentColor)
      .text(`Endereço: ${cleanText(data.endereco)}`, nameX, startY + fontSize + 5, { width: nameWidth, align: "center" });
  }

  if (shouldRender(data.email) || shouldRender(data.numero)) {
    doc
      .fontSize(contentFontSize)
      .fillColor(accentColor)
      .text(
        `E-mail: ${cleanText(data.email)} | Contato: ${cleanText(data.numero)}`,
        nameX,
        startY + fontSize + 5 + lineHeight,
        { width: nameWidth, align: "center" }
      );
  }

  let currentY = photoY + photoHeight + 20;

  // Função para títulos das seções
  const sectionSpacing = 20;
  const lineSpacing = 10;
  const drawSectionTitle = (title, y, addLine = true) => {
    if (addLine) {
      doc
        .rect(startX, y, contentWidth, 0.1)
        .fillColor("000000")
        .fill();
    }
    doc
      .fillColor(primaryColor)
      .fontSize(14)
      .text(title.toUpperCase(), startX, y + lineSpacing);
    return y + lineSpacing + sectionSpacing;
  };

  // -------------------------------------------------------
  // Informação Pessoal
  // -------------------------------------------------------
  let personalInfoY = currentY;
  let hasPersonalInfo = shouldRender(data.dataNascimento) || shouldRender(data.estadoCivil) || shouldRender(data.cnh);
  if (hasPersonalInfo) {
    personalInfoY = drawSectionTitle("INFORMAÇÃO PESSOAL", personalInfoY, false);
    if (shouldRender(data.dataNascimento)) {
      doc
        .fontSize(contentFontSize)
        .fillColor("444")
        .text(`Nascimento: ${cleanText(data.dataNascimento)}`, startX, personalInfoY);
    }
    if (shouldRender(data.estadoCivil)) {
      doc
        .fontSize(contentFontSize)
        .fillColor("444")
        .text(`Estado Civil: ${cleanText(data.estadoCivil)}`, startX, personalInfoY + (shouldRender(data.dataNascimento) ? 20 : 0));
    }
    if (shouldRender(data.cnh)) {
      doc
        .fontSize(contentFontSize)
        .fillColor("444")
        .text(`CNH: ${cleanText(data.cnh)}`, startX, personalInfoY + (shouldRender(data.dataNascimento) ? 40 : shouldRender(data.estadoCivil) ? 20 : 0));
    }
    currentY = personalInfoY + (shouldRender(data.dataNascimento) ? 20 : 0) + (shouldRender(data.estadoCivil) ? 20 : 0) + (shouldRender(data.cnh) ? 20 : 0);
  }

  // -------------------------------------------------------
  // Formação Educacional
  // -------------------------------------------------------
  if (shouldRender(data.formacao)) {
    currentY = drawSectionTitle("FORMAÇÃO EDUCACIONAL", currentY);
    data.formacao.forEach((form, index) => {
      if (shouldRender(form.instituicao) || shouldRender(form.curso) || shouldRender(form.status)) {
        doc
          .fontSize(contentFontSize)
          .fillColor("444")
          .text(`Instituição: ${cleanText(form.instituicao)}`, startX, currentY)
          .text(`Curso: ${cleanText(form.curso)}`, startX, currentY + 15)
          .text(`Status: ${cleanText(form.status)}`, startX, currentY + 30);
        currentY += 45;
        if (index < data.formacao.length - 1) {
          doc.text("---", startX, currentY);
          currentY += 15;
        }
      }
    });
  }

  // -------------------------------------------------------
  // Objetivo Profissional
  // -------------------------------------------------------
  if (shouldRender(data.objetivo)) {
    currentY = drawSectionTitle("OBJETIVO PROFISSIONAL", currentY);
    doc
      .fontSize(contentFontSize)
      .fillColor("444")
      .text(cleanText(data.objetivo), startX, currentY, { width: contentWidth, paragraphGap: 5 });
    currentY += doc.heightOfString(cleanText(data.objetivo), { width: contentWidth }) + 20;
  }

  // -------------------------------------------------------
  // Experiência Profissional
  // -------------------------------------------------------
  if (shouldRender(data.experiencia)) {
    currentY = drawSectionTitle("EXPERIÊNCIA PROFISSIONAL", currentY);
    data.experiencia.forEach((exp, index) => {
      if (shouldRender(exp.empresa) || shouldRender(exp.cargo) || shouldRender(exp.periodo) || shouldRender(exp.detalhes)) {
        doc
          .fontSize(contentFontSize)
          .fillColor("444")
          .text(`Empresa: ${cleanText(exp.empresa)}`, startX, currentY)
          .text(`Cargo: ${cleanText(exp.cargo)}`, startX, currentY + 15)
          .text(`Período: ${cleanText(exp.periodo)}`, startX, currentY + 30)
          .text(`Descrição: ${cleanText(exp.detalhes)}`, startX, currentY + 45);
        currentY += 60;
        if (index < data.experiencia.length - 1) {
          doc.text("---", startX, currentY);
          currentY += 15;
        }
      }
    });
  }

  // -------------------------------------------------------
  // Cursos de Qualificação
  // -------------------------------------------------------
  if (shouldRender(data.qualificacao)) {
    currentY = drawSectionTitle("CURSOS DE QUALIFICAÇÃO", currentY);
    data.qualificacao.forEach(curso => {
      if (shouldRender(curso)) {
        doc.fontSize(contentFontSize).fillColor("444").text(`• ${cleanText(curso)}`, startX, currentY);
        currentY += 15;
      }
    });
  }

  // -------------------------------------------------------
  // Perfil Profissional
  // -------------------------------------------------------
  if (shouldRender(data.perfil)) {
    currentY = drawSectionTitle("PERFIL PROFISSIONAL", currentY);
    doc
      .fontSize(contentFontSize)
      .fillColor("444")
      .text(cleanText(data.perfil), startX, currentY, { width: contentWidth, paragraphGap: 5 });
  }

  // Finaliza PDF
  doc.end();
};