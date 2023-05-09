import $ from "jquery";
import { BLOCK_TYPE, CLASS_NAME } from "../constant/index";
import {
  _applyCssRules,
  _applyGoogleAnalytics,
  _applyMeta,
  _applySocialMeta,
} from "../utils/css";

declare type PlayerBarOption = {
  show?: boolean
  ragtId?: string
  ragtClientId?: string
}

declare type MetaOptions = {
  title?: string;
  cssLinks?: string[];
  meta?: {};
  socialMeta?: {};
  lang?: string;
  favicon?: string;
  googleAnalyticsId?: string;
};

const ragtPlayerInfo = {
  name: "wc-ragt-player",
  script:
    "https://ragt-dev.s3.ap-southeast-1.amazonaws.com/public/ragt-player/ragt-player.js",
};

const dfsTree = (root: any, arr: any) => {
  arr.push(root.content);
  root.items.forEach((item: any) => {
    dfsTree(item, arr);
  });
};

const ragtJson2A11Y = (
  ragtJson: any,
  metaOpt: MetaOptions = {},
  playerBarOption?: PlayerBarOption,
) => {
  const htmlDefault = `<!DOCTYPE html><html><head></head><body></body></html>`;
  const htmlDOM = new DOMParser().parseFromString(htmlDefault, "text/html");
  // add lang attribute to html tag
  $("html", htmlDOM).attr("lang", metaOpt.lang || "en");

  // namespace html tag
  $("html", htmlDOM).attr("xmlns", "http://www.w3.org/1999/xhtml");

  // add title attribute to head tag
  if (metaOpt.title) {
    $("head", htmlDOM).append(`<title>${metaOpt.title}</title>`);
  }

  // add favicon attribute to head tag
  if (metaOpt.favicon) {
    $("head", htmlDOM).append(
      `<link rel="icon" type="image/x-icon" href="${metaOpt.favicon}">`
    );
  }

  // add ragt player script to head tag
  if (
    playerBarOption?.show &&
    playerBarOption?.ragtId &&
    playerBarOption?.ragtClientId
  ) {
    $("head", htmlDOM).append(
      `<script type="module" crossorigin="true" src="${
        ragtPlayerInfo.script
      }?v=${Math.random()}"></script>`
    );
  }

  // apply meta tags
  _applyMeta(htmlDOM, metaOpt.meta);
  _applySocialMeta(htmlDOM, metaOpt.socialMeta);

  // apply google analytics, if needed
  if (metaOpt.googleAnalyticsId) {
    _applyGoogleAnalytics(htmlDOM, metaOpt.googleAnalyticsId);
  }

  // apply css
  _applyCssRules(htmlDOM, metaOpt.cssLinks);

  // add ragt player to body
  if (
    playerBarOption?.show &&
    playerBarOption?.ragtId &&
    playerBarOption?.ragtClientId
  ) {
    $("body", htmlDOM).append(
      `<${ragtPlayerInfo.name} id="${playerBarOption.ragtId}" ragt-client-id="${playerBarOption.ragtClientId}"></${ragtPlayerInfo.name}>`
    );
  }

  ragtJson.blocks.forEach((block: any) => {
    //TODO: Paragraph
    if (block.type === BLOCK_TYPE.PARAGRAPH) {
      $("body", htmlDOM).append(
        `<p id="${block.id}" tabindex="0">
          ${(block?.meta || [])?.map((item: any) => item.ui)?.join(" ")}
        </p>`
      );
    }
    //TODO: Header
    if (block.type === BLOCK_TYPE.HEADER) {
      $("body", htmlDOM).append(
        `<h${block.data.level} id="${block.id}" tabindex="0">
          ${(block?.meta || [])?.map((item: any) => item.ui)?.join(" ")}
        </h${block.data.level}>`
      );
    }

    //TODO: List
    const dfsRender = (
      htmlDOM: Document,
      parentNode: any,
      style: string,
      items: any,
      id?: string
    ) => {
      if (id) {
        parentNode.append(`<${style} id="${id}"></${style}>`);
        items.forEach((item: any) => {
          $(`#${id}`, htmlDOM).append(`<li tabindex="0">${item.content}</li>`);
          if (item.items.length > 0) {
            dfsRender(htmlDOM, $(`#${id}`, htmlDOM), style, item.items);
          }
        });
      } else {
        // random an id
        const autoId = Math.random().toString(36).substring(2, 15);
        parentNode.append(`<${style} id="${autoId}"></${style}>`);
        items.forEach((item: any) => {
          $(`#${autoId}`, htmlDOM).append(
            `<li tabindex="0">${item.content}</li>`
          );
          if (item.items.length > 0) {
            dfsRender(htmlDOM, $(`#${autoId}`, htmlDOM), style, item.items);
          }
        });
        $(`#${autoId}`, htmlDOM).removeAttr("id");
      }
    };
    if (block.type === BLOCK_TYPE.LIST) {
      const styleTag = block.data.style === "unordered" ? "ul" : "ol";
      dfsRender(
        htmlDOM,
        $("body", htmlDOM),
        styleTag,
        block.data.items,
        block.id
      );
    }
    //TODO: Image
    if (block.type === BLOCK_TYPE.IMAGE) {
      $('body', htmlDOM).append(
        `<p tabindex="0" class="${CLASS_NAME.annotation}">${block.meta[0]?.ui}</p>`
      );
      $("body", htmlDOM).append(
        `<img id="${block.id}" src="${block.data?.file?.url || ""}" alt="${
          block.data.caption
        }" aria-hidden="true"></img>`
      );
    }

    //TODO: Table
    if (block.type === BLOCK_TYPE.TABLE) {
      $("body", htmlDOM).append(
        `<p id="${block.meta[0].id}" tabindex="0" class="${CLASS_NAME.annotation}">${block.meta[0].ui}</p>`
      );
      if (block.data?.caption) {
        $('body', htmlDOM).append(
          `<h4 id="${block.meta[1].id}" tabindex="0" aria-label="${block.meta[1].polly}">${block.meta[1].ui}</h4>`
        );
      }
      let bodyTable = ''
      for(let i = (block.data?.caption ? 2 : 1); i < block?.meta?.length - 1; i++) {
        bodyTable += block?.meta[i]?.ui || ''
      }
      const table = `<table id="${block.id}">${bodyTable}</table>`;
      $('body', htmlDOM).append(table);
      $('body', htmlDOM).append(
        `<p id="${
          block.meta[block.meta.length - 1].id
        }" tabindex="0" class="${CLASS_NAME.annotation}">${
          block.meta[block.meta.length - 1].polly
        }</p>`
      );
    }
  });

  return `<!DOCTYPE html>${htmlDOM.documentElement.outerHTML}`;
};

export default ragtJson2A11Y