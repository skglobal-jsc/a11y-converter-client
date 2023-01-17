import $ from "jquery";
import {
  BLOCK_TAGS_EDITOR,
  BLOCK_TYPE,
  HEADER_LEVEL,
  LIST_STYLE,
} from "../constant/index";

const cleanInline = (html: string) => {
  // return sanitizeHtml(html, {
  //   allowedTags: ['a', 'mark'],
  // });
  return html;
};

const parseListItems = (items: any) => {
  const res: any = [];
  items.forEach((item: AnyObject) => {
    if (item.nodeName === "LI") {
      res.push({
        content: cleanInline($(item).html()),
        items: [],
      });
    }
    if (["UL", "OL"].includes(item.nodeName)) {
      if (!res[res.length - 1]?.items) {
        res.push({
          content: "",
          items: [],
        });
      }
      res[res.length - 1].items.push(...parseListItems(item.childNodes));
    }
  });
  return res;
};

export const html2EditorJson = (html: string) => {
  let res: { blocks: any } = {
    blocks: [],
  };
  // Build meta option content
  const htmlDOM = new DOMParser().parseFromString(html, "text/html");
  const meta = {
    lang: $("html", htmlDOM)?.attr("lang"),
    title:
      $("title", htmlDOM)?.text() ??
      $('meta[property="og:title"]')?.attr("content"),
    description:
      $('meta[name="description"]', htmlDOM)?.attr("content") ??
      $('meta[property="og:description"]', htmlDOM)?.attr("content"),
    keywords: $('meta[name="keywords"]', htmlDOM)?.attr("content"),
    favicon: $('link[rel="icon"]', htmlDOM)?.attr("href"),
    image: $('meta[property="og:image"]', htmlDOM)?.attr("content"),
    type: $('meta[property="og:type"]', htmlDOM)?.attr("content"),
  };
  // const metaOpts = buildMetaOptions(meta);
  let groupUnSupportTag: string[] = [];
  $("body", htmlDOM)
    .contents()
    .each((i, el) => {
      if (el.nodeType === 1 || el.nodeType === 3) {
        // random attribute id
        const id = Math.random().toString(36).substring(7);
        // Wrap group other tag into paragraph
        if (BLOCK_TAGS_EDITOR.includes(el.nodeName)) {
          if (groupUnSupportTag.length) {
            const unsupportedId = Math.random().toString(36).substring(7);
            res.blocks.push({
              id: unsupportedId,
              type: BLOCK_TYPE.PARAGRAPH,
              data: {
                text: cleanInline(groupUnSupportTag.join("")),
              },
            });
            groupUnSupportTag = [];
          }
          //TODO: Paragraph
          if (el.nodeName === "P") {
            res.blocks.push({
              id,
              type: BLOCK_TYPE.PARAGRAPH,
              data: {
                text: cleanInline($(el).html()),
              },
            });
          }
          //TODO: Header
          if (["H1", "H2", "H3"].includes(el.nodeName)) {
            res.blocks.push({
              id,
              type: BLOCK_TYPE.HEADER,
              data: {
                text: cleanInline($(el).html()),
                level: (HEADER_LEVEL as any)[el.nodeName],
              },
            });
          }
          //TODO: List
          if (["UL", "OL"].includes(el.nodeName)) {
            const items = parseListItems(el.childNodes as any);
            res.blocks.push({
              id,
              type: BLOCK_TYPE.LIST,
              data: {
                style: (LIST_STYLE as any)[el.nodeName],
                items,
              },
            });
          }
          //TODO: Image
          if (el.nodeName === "IMG") {
            res.blocks.push({
              id,
              type: BLOCK_TYPE.IMAGE,
              data: {
                file: {
                  url: $(el)?.attr("src") ?? "",
                },
                caption: $(el)?.attr("alt") ?? "",
                withBorder: false,
                stretched: false,
                withBackground: false,
              },
            });
          }

          //TODO: Table
          if (el.nodeName === "TABLE") {
            const captionElement = $(el).find("caption");
            const firstRow = $(el).find("tr")?.[0];
            const rows = Array.from($(el).find("tr"));
            let totalRows = rows.length;
            let totalCols = 0;
            const content = rows
              .map((row) => {
                const cols = [
                  ...Array.from($(row).find("th")),
                  ...Array.from($(row).find("td")),
                ];
                if (cols.length > totalCols) {
                  totalCols = cols.length;
                }
                return cols.map((cell) => $(cell).html());
              })
              .map((row) => {
                return row.length < totalCols
                  ? Array(totalCols)
                      .fill("")
                      .map((_, i) => (row[i] ? row[i] : ""))
                  : row;
              });
            const firstRowHeading =
              $(firstRow)?.find("th")?.length === totalCols;
            const headers = Array.from($(el).find("th"))?.map((th) =>
              $(th)?.html()
            );
            const data = {
              withHeadings: !!firstRowHeading,
              content,
              ...(captionElement.length && {
                caption: $(captionElement).html()?.trim(),
              }),
              headers,
            };
            res.blocks.push({
              id,
              type: BLOCK_TYPE.TABLE,
              data,
            });
          }
        } else {
          //Group tag in case not supporting
          if ($(el).html()) {
            groupUnSupportTag.push($(el).html());
          }
        }
      }
    });
  return {
    json: res,
    meta,
  };
};
