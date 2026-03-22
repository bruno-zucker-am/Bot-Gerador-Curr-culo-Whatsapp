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
  // 1️⃣ Cores e dimensões
  // -------------------------------------------------------
  const primaryColor = "#0a74da"; // azul principal
  const secondaryColor = "#e3f2fd"; // azul claro da barra lateral
  const sectionWidth = 160;
  const mainStart = 180;
  const contentWidth = doc.page.width - mainStart - 30;

  // -------------------------------------------------------
  // 2️⃣ Barra lateral
  // -------------------------------------------------------
  doc.rect(0, 0, sectionWidth, doc.page.height).fill(secondaryColor).stroke();

  // ⚡ Foto 3x4 com borda
  let currentY = 10; // Início padrão
  if (data.foto) {
    try {
      const photoX = 20;
      const photoY = 10;
      const photoWidth = 100;
      const photoHeight = 100;

      // Borda
      doc
        .rect(photoX - 1, photoY - 1, photoWidth + 2, photoHeight + 2)
        .lineWidth(1)
        .strokeColor(primaryColor)
        .stroke();

      // Foto preenchendo borda
      doc.image(data.foto, photoX, photoY, { width: photoWidth, height: photoHeight });
      currentY = photoY + photoHeight + 10; // Ajusta currentY após a foto
    } catch (err) {
      console.log("Erro ao adicionar foto:", err.message);
    }
  }

  // Nome
  if (shouldRender(data.nome)) {
    doc
      .fillColor(primaryColor)
      .fontSize(16)
      .text(cleanText(data.nome), 20, currentY, { width: sectionWidth - 40, align: data.foto ? "left" : "center" });
    currentY += doc.heightOfString(cleanText(data.nome), { width: sectionWidth - 40 }) + 10;
  }

  // Função para desenhar títulos da barra lateral
  const drawSidebarTitle = (title, y) => {
    const fontSize = 10;
    const height = 18;

    doc.save();
    doc.fillColor(primaryColor, 0.2);
    doc.rect(20, y - 5, sectionWidth - 40, height).fill();
    doc.restore();

    doc.fillColor(primaryColor).fontSize(fontSize).text(title, 25, y);

    return y + height + 5;
  };

  // CONTATO
  let hasContactInfo = shouldRender(data.email) || shouldRender(data.numero) || shouldRender(data.endereco);
  if (hasContactInfo) {
    currentY = drawSidebarTitle("Contato", currentY);
    doc.fontSize(10).fillColor("#000000");
    if (shouldRender(data.email)) {
      doc.text(`Email: ${cleanText(data.email)}`, 20, currentY + 5, { width: sectionWidth - 40 });
      currentY += doc.heightOfString(`Email: ${cleanText(data.email)}`, { width: sectionWidth - 40 }) + 5;
    }
    if (shouldRender(data.numero)) {
      doc.text(`Telefone: ${cleanText(data.numero)}`, 20, currentY + 5, { width: sectionWidth - 40 });
      currentY += doc.heightOfString(`Telefone: ${cleanText(data.numero)}`, { width: sectionWidth - 40 }) + 5;
    }
    if (shouldRender(data.endereco)) {
      doc.text(`Endereço: ${cleanText(data.endereco)}`, 20, currentY + 5, { width: sectionWidth - 40 });
      currentY += doc.heightOfString(cleanText(data.endereco), { width: sectionWidth - 40 }) + 5;
    }
    currentY += 10;
  }

  // INFORMAÇÃO PESSOAL
  let hasPersonalInfo = shouldRender(data.dataNascimento) || shouldRender(data.estadoCivil) || shouldRender(data.cnh);
  if (hasPersonalInfo) {
    currentY = drawSidebarTitle("Informação Pessoal", currentY + 20);
    doc.fontSize(10).fillColor("#000000");
    if (shouldRender(data.dataNascimento)) {
      doc.text(`Nascimento: ${cleanText(data.dataNascimento)}`, 20, currentY + 5, { width: sectionWidth - 40 });
      currentY += doc.heightOfString(`Nascimento: ${cleanText(data.dataNascimento)}`, { width: sectionWidth - 40 }) + 5;
    }
    if (shouldRender(data.estadoCivil)) {
      doc.text(`Estado Civil: ${cleanText(data.estadoCivil)}`, 20, currentY + 5, { width: sectionWidth - 40 });
      currentY += doc.heightOfString(`Estado Civil: ${cleanText(data.estadoCivil)}`, { width: sectionWidth - 40 }) + 5;
    }
    if (shouldRender(data.cnh)) {
      doc.text(`CNH: ${cleanText(data.cnh)}`, 20, currentY + 5, { width: sectionWidth - 40 });
      currentY += doc.heightOfString(`CNH: ${cleanText(data.cnh)}`, { width: sectionWidth - 40 }) + 5;
    }
    currentY += 10;
  }

  // CURSOS DE QUALIFICAÇÃO
  if (shouldRender(data.qualificacao)) {
    currentY = drawSidebarTitle("Cursos de Qualificação", currentY + 20);
    data.qualificacao.forEach(curso => {
      if (shouldRender(curso)) {
        doc.fontSize(10).fillColor("#000000").text(`• ${cleanText(curso)}`, 20, currentY + 5, { width: sectionWidth - 40 });
        currentY += doc.heightOfString(`• ${cleanText(curso)}`, { width: sectionWidth - 40 }) + 5;
      }
    });
    currentY += 10;
  }

  // COLUNA PRINCIPAL
  currentY = 30;

  const drawSectionTitleMain = (title, y) => {
    doc.save();
    doc.fillColor(primaryColor, 0.2);
    doc.rect(mainStart, y - 5, contentWidth, 20).fill();
    doc.restore();

    doc.fillColor(primaryColor).fontSize(14).text(title, mainStart + 5, y);

    return y + 25;
  };

  // FORMAÇÃO EDUCACIONAL
  if (shouldRender(data.formacao)) {
    currentY = drawSectionTitleMain("FORMAÇÃO EDUCACIONAL", currentY);
    data.formacao.forEach((form, index) => {
      if (shouldRender(form.instituicao) || shouldRender(form.curso) || shouldRender(form.status)) {
        doc
          .fontSize(10)
          .fillColor("#000000")
          .text(`Instituição: ${cleanText(form.instituicao)}`, mainStart, currentY + 5)
          .text(`Curso: ${cleanText(form.curso)}`, mainStart, currentY + 20)
          .text(`Status: ${cleanText(form.status)}`, mainStart, currentY + 35);
        currentY += 50;
        if (index < data.formacao.length - 1) {
          doc.text("---", mainStart, currentY);
          currentY += 15;
        }
      }
    });
  }

  // OBJETIVO PROFISSIONAL
  if (shouldRender(data.objetivo)) {
    currentY = drawSectionTitleMain("OBJETIVO PROFISSIONAL", currentY + 10);
    doc.fontSize(10).fillColor("#000000").text(cleanText(data.objetivo), mainStart, currentY + 5, { width: contentWidth, paragraphGap: 5 });
    currentY += doc.heightOfString(cleanText(data.objetivo), { width: contentWidth }) + 15;
  }

  // EXPERIÊNCIA PROFISSIONAL
  if (shouldRender(data.experiencia)) {
    currentY = drawSectionTitleMain("EXPERIÊNCIA PROFISSIONAL", currentY + 10);
    data.experiencia.forEach((exp, index) => {
      if (shouldRender(exp.empresa) || shouldRender(exp.cargo) || shouldRender(exp.periodo) || shouldRender(exp.detalhes)) {
        doc
          .fontSize(10)
          .fillColor("#000000")
          .text(`Empresa: ${cleanText(exp.empresa)}`, mainStart, currentY + 5)
          .text(`Cargo: ${cleanText(exp.cargo)}`, mainStart, currentY + 20)
          .text(`Período: ${cleanText(exp.periodo)}`, mainStart, currentY + 35)
          .text(`Descrição: ${cleanText(exp.detalhes)}`, mainStart, currentY + 50);
        currentY += 65;
        if (index < data.experiencia.length - 1) {
          doc.text("---", mainStart, currentY);
          currentY += 15;
        }
      }
    });
  }

  // PERFIL PROFISSIONAL
  if (shouldRender(data.perfil)) {
    currentY = drawSectionTitleMain("PERFIL PROFISSIONAL", currentY + 10);
    doc.fontSize(10).fillColor("#000000").text(cleanText(data.perfil), mainStart, currentY + 5, { width: contentWidth, paragraphGap: 5 });
  }

  doc.end();
};