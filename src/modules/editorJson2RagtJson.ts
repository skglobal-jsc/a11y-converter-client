import { BLOCK_TYPE, } from '../constant/index'

const dfsTree = (root: any, arr: any) => {
  arr.push(root.content);
  root.items.forEach((item: any) => {
    dfsTree(item, arr);
  });
};

const splitSentences = (rawText: any, lang = "en") => {
  const htmlElementRegex =
    /<(?:([A-Za-z0-9][A-Za-z0-9]*)\b[^>]*>(?:.*?)<\/\1>|[A-Za-z0-9][A-Za-z0-9]*\b[^>]*\/>)/gm;
  const htmlElements = rawText.match(htmlElementRegex) ?? [];
  let noHtml = rawText;
  htmlElements.forEach(
    (element: any, idx: any) =>
      (noHtml = noHtml.replace(element, `htmlElementNo${idx}`))
  );
  const regexSplitSentences =
    lang === "ja"
      ? /(?<!\w\.\w.)(?<=\。|\？|\！|\：|\n)/g
      : /(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\:|\!|\n)\s/g;
  const noHtmlSentences = noHtml
    .split(regexSplitSentences)
    .filter((sentences: any) => !!sentences);
  const sentences = noHtmlSentences.map((sentence: any) => {
    htmlElements.forEach(
      (element: any, idx: any) =>
        (sentence = sentence.replace(`htmlElementNo${idx}`, element))
    );
    return sentence;
  });
  return sentences;
};

const getMetaByDfs = (root: any, parentId: any, arr: any) => {
  if (root.content) {
    // random attribute id
    const id = Math.random().toString(36).substring(7);
    const sentences = splitSentences(root.content);
    sentences.forEach((sentence: any) => {
      const htmlTagRegex = /<\/?[a-z][a-z0-9]*[^<>]*>|<!--.*?-->/gim;
      const aTagRegex = /<a.+?\s*href\s*=\s*["\']?(?<href>[^"\'\s>]+)["\']?/gi;

      if (sentence.trim()) {
        arr.push({
          parentId,
          id,
          ui: sentence,
          polly: sentence.replace(htmlTagRegex, ""),
          ssml: "",
          user: "",
          actions: [...sentence.matchAll(aTagRegex)].map(
            (item) => item.groups?.href
          ),
        });
      }
    });
    root.items.forEach((item: any) => {
      getMetaByDfs(item, id, arr);
    });
  } else {
    root.items.forEach((item: any) => {
      getMetaByDfs(item, "root", arr);
    });
  }
};

export const editorJson2RagtJson = (editorJson: AnyObject, lang = "en") => {
  const getListAnnotation = (data: any) => {
    let itemsArr: any = [];
    dfsTree(data, itemsArr);

    itemsArr = itemsArr.filter((item: AnyObject) => item);
    if (lang === "ja") {
      return `これは${
        data.style === "ordered" ? "番号付き" : "箇条書きの"
      }リストで, ${data.items.length}個の項目と${
        itemsArr.length - data.items.length
      }個のサブ項目があります。`;
    }
    if (lang === "vi") {
      return `Đây là danh sách được ${
        data.style === "ordered" ? "đánh số" : "gạch đầu dòng"
      }, danh sách có ${data.items.length} mục chính và ${
        itemsArr.length - data.items.length
      } mục phụ.`;
    }
    return `This is ${
      data.style === "ordered" ? "Numbered" : "Bulleted"
    } list, there are ${data.items.length} items and ${
      itemsArr.length - data.items.length
    } sub items`;
  };
  const getImageAnnotation = (alt: string) => {
    if (alt) {
      const annotation: any = {
        ja: `ここに「${alt}」の画像があります。`,
        vi: `Đây là hình ảnh về ${alt}`,
        en: `This image is about ${alt}.`,
      };
      return annotation[lang] || annotation.en;
    } else {
      const annotation: any = {
        ja: "ここに画像があります。",
        vi: "Đây là một bức hình",
        en: "There is a image",
      };
      return annotation[lang] || annotation.en;
    }
  };
  const buildMetaTable = (data: any) => {
    const content = [...data.content];
    const withHeadings = data.withHeadings;
    const totalRows = content?.length ?? 0;
    const totalCols = content[0]?.length ?? 0;
    if (lang === "ja") {
      let annotation = `この下に、縦${totalRows}行、横${totalCols}列の表があります。\n`;
      if (data.caption) {
        annotation += `表のタイトルは${data.caption}、です。\n`;
      }
      if (data.headers?.length) {
        annotation += `見出し行は左から${data.headers.join("、")}です。`;
      } else if (withHeadings) {
        annotation += `見出し行は左から${content[0].join("、")}です。`;
      }
      const meta: any = [
        {
          id: Math.random().toString(36).substring(7),
          ui: annotation,
          polly: annotation,
          ssml: "",
          user: "",
          actions: [],
          isAutogenerated: true,
        },
      ];
      content.forEach((row, idx) => {
        const polly =
          idx === 0
            ? `データの1行目、${row.join("、")}、`
            : idx === row.length - 1
            ? `${idx + 1}行目、${row.join("、")}です。`
            : `${idx + 1}行目、${row.join("、")}、`;
        let ui = `<tr tabindex="0" aria-label="${polly}">`;
        row.forEach((cell: string) => {
          ui =
            withHeadings && idx === 0
              ? ui.concat(`<th aria-hidden="true">${cell}</th>`)
              : ui.concat(`<td aria-hidden="true">${cell}</td>`);
        });
        ui = ui.concat("</tr>");
        meta.push({
          ui,
          polly,
          ssml: "",
          user: "",
          actions: [],
        });
      });
      meta.push({
        id: Math.random().toString(36).substring(7),
        ui: `表の終わりです。`,
        polly: `表の終わりです。`,
        ssml: "",
        user: "",
        actions: [],
        isAutogenerated: true,
      });
      return meta;
    } else if (lang === "vi") {
      let annotation = `Đây là dữ liệu dạng bảng, có ${totalRows} dòng, ${totalCols} cột.\n`;
      if (data.caption) {
        annotation += `Tiêu đề của bảng là ${data.caption}.\n`;
      }
      if (data.headers?.length) {
        annotation += `Các ô tiêu đề của bảng là ${data.headers.join(", ")}.`;
      } else if (withHeadings) {
        annotation += `Các ô tiêu đề của bảng là ${content[0].join(", ")}.`;
      }
      const meta: any = [
        {
          id: Math.random().toString(36).substring(7),
          ui: annotation,
          polly: annotation,
          ssml: "",
          user: "",
          actions: [],
          isAutogenerated: true,
        },
      ];
      content.forEach((row, idx) => {
        const polly =
          idx === 0
            ? `Dữ liệu hàng thứ nhất là ${row.join(", ")}.`
            : `Hàng thứ ${idx + 1}: ${row.join(", ")}.`;
        let ui = `<tr tabindex="0" aria-label="${polly}">`;
        row.forEach((cell: string) => {
          ui =
            withHeadings && idx === 0
              ? ui.concat(`<th aria-hidden="true">${cell}</th>`)
              : ui.concat(`<td aria-hidden="true">${cell}</td>`);
        });
        ui = ui.concat("</tr>");
        meta.push({
          ui,
          polly,
          ssml: "",
          user: "",
          actions: [],
        });
      });
      meta.push({
        id: Math.random().toString(36).substring(7),
        ui: `Kết thúc bảng.`,
        polly: `Kết thúc bảng.`,
        ssml: "",
        user: "",
        actions: [],
        isAutogenerated: true,
      });
      return meta;
    } else {
      let annotation = `This is table with ${totalRows} rows, ${totalCols} columns.\n`;
      if (data.caption) {
        annotation += `The title of the table is ${data.caption}.\n`;
      }
      if (data.headers?.length) {
        annotation += `The table headers are ${data.headers.join(", ")}.`;
      } else if (withHeadings) {
        annotation += `The table headers are ${content[0].join(", ")}.`;
      }
      const meta: any = [
        {
          id: Math.random().toString(36).substring(7),
          ui: annotation,
          polly: annotation,
          ssml: "",
          user: "",
          actions: [],
          isAutogenerated: true,
        },
      ];
      content.forEach((row, idx) => {
        const polly =
          idx === 0
            ? `The first line of data is ${row.join(", ")}.`
            : `Line ${idx + 1}: ${row.join(", ")}.`;
        let ui = `<tr tabindex="0" aria-label="${polly}">`;
        row.forEach((cell: string) => {
          ui =
            withHeadings && idx === 0
              ? ui.concat(`<th aria-hidden="true">${cell}</th>`)
              : ui.concat(`<td aria-hidden="true">${cell}</td>`);
        });
        ui = ui.concat("</tr>");
        meta.push({
          ui,
          polly,
          ssml: "",
          user: "",
          actions: [],
        });
      });
      meta.push({
        id: Math.random().toString(36).substring(7),
        ui: `End table.`,
        polly: `End table.`,
        ssml: "",
        user: "",
        actions: [],
        isAutogenerated: true,
      });
      return meta;
    }
  };

  //TODO: Generate meta data for each block
  const blocks = editorJson.blocks.map((block: any) => {
    let meta: any = [];
    //TODO: Paragraph, Header
    if ([BLOCK_TYPE.HEADER, BLOCK_TYPE.PARAGRAPH].includes(block.type)) {
      const sentences = splitSentences(block.data.text, lang);
      meta = sentences
        .filter((sentence: string) => sentence.trim())
        .map((sentence: string) => {
        const htmlTagRegex = /<\/?[a-z][a-z0-9]*[^<>]*>|<!--.*?-->/gim;
        const aTagRegex =
          /<a.+?\s*href\s*=\s*["\']?(?<href>[^"\'\s>]+)["\']?/gi;
        return {
          ui: sentence?.trim(),
          polly: sentence.replace(htmlTagRegex, "")?.trim(),
          ssml: "",
          user: "",
          actions: [...sentence.matchAll(aTagRegex)]
            .filter((item) => item && item.groups && item.groups?.href)
            .map((item) => item.groups?.href),
        };
      });
    }

    //TODO: List
    if (block.type === BLOCK_TYPE.LIST) {
      let items: any = [];
      getMetaByDfs(block.data, "id", items);
      meta = [...items];
      meta = [
        {
          ui: getListAnnotation(block.data),
          polly: getListAnnotation(block.data),
          ssml: "",
          user: "",
          actions: [],
          isAutogenerated: true,
        },
        ...meta,
      ];
    }

    //TODO: Image
    if (block.type === BLOCK_TYPE.IMAGE) {
      meta = [
        {
          ui: block.data.caption,
          polly: getImageAnnotation(block.data.caption),
          ssml: "",
          user: "",
          actions: [],
        },
      ];
    }

    //TODO: Table
    if (block.type === BLOCK_TYPE.TABLE) {
      meta = buildMetaTable(block.data);
    }
    return {
      ...block,
      meta,
    };
  });

  return {
    ...editorJson,
    blocks,
  };
};