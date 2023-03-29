import $ from "jquery";
import * as url from "url";
import {
  UN_SUPPORTED_TAGS,
  UN_SUPPORTED_STYLE_TAGS,
  BLOCK_TAGS,
  SECTION_TAGS,
  EDITOR_BLOCK_TAGS,
} from "../constant/index";

declare type ProcessOptions = {
  removeComments?: boolean;
  removeEmptyElements?: boolean;
  removeScriptTypeAttributes?: boolean;
  removeOptionalTags?: string[];
  removeSmallImages?: {
    minWidth: number;
    minHeight: number;
  };
  url?: string; // url of the page
  contentSelectors?: string[]; // selector of the content
  hooks?: {
    before?: string;
    after?: string;
  };
};

const convertRelativeUrlsToAbsolute = (baseUrl: string, href: string) => {
  const parsedUrl = url.parse(href);
  if (!parsedUrl.host) {
    return url.resolve(baseUrl, href);
  }
  return href;
};

const reduceHtml = (htmlDOM: any, opt: any) => {
  // clean head first
  $("head", htmlDOM)
    .contents()
    .each((i, el) => {
      if (el.nodeType === 1) {
        // remove  all except title
        // we need to keep title because it is used to generate the slug
        if (el.nodeName !== "TITLE") {
          $(el).remove();
        }
      } else {
        $(el).remove();
      }
    });
  $("body *", htmlDOM)
    .contents()
    .each((i, el) => {
      if (el.nodeType === 1) {
        // Converts the markup to HTML5 (if it is XHTML for example)
        const nodeName = el.nodeName.toLowerCase();
        // remove unsupported tags
        if (UN_SUPPORTED_TAGS.includes(nodeName)) {
          $(el).remove();
        }
        // if element is a style tag then keep children and remove the style tag
        if (UN_SUPPORTED_STYLE_TAGS.includes(nodeName)) {
          $(el).replaceWith($(el).contents());
        }
        // remove optional tags
        if (
          opt.removeOptionalTags &&
          opt.removeOptionalTags.includes(nodeName)
        ) {
          $(el).remove();
        }
        // fix dom: make sure inside p tag there is no any block tags
        if (nodeName === "p") {
          $(el)
            .contents()
            .each((i, el) => {
              if (el.nodeType === 1 && BLOCK_TAGS.includes(nodeName)) {
                $(el).replaceWith($(el).contents());
              }
            });
        }
        // replace section tags with div. section tags are not supported by EditorJS
        if (SECTION_TAGS.includes(nodeName)) {
          // $(el).replaceWith($("<div>").append($(el).contents())); // Has an error at line
        }
        // if element is EDITOR_BLOCK_TAGS and parent is div then unwrap the element
        if (EDITOR_BLOCK_TAGS.includes(nodeName)) {
          let child = $(el);
          if ($(el).parent().is("div")) {
            $(el).unwrap();
          }
        }
        // remove unnecessary attributes
        // const attributes = Object.keys($(el).attr);
        // attributes.forEach((key) => {
        //   if (!['href', 'src', 'alt', 'height', 'width'].includes(key)) {
        //     delete el.attribs[key];
        //   }
        // });
        // TODO: some cleanup is required here
        // remove empty tags with cheerio, but also keep images:
        if (
          opt.removeEmptyElements &&
          nodeName !== "img" &&
          $(el).find("img").length === 0 &&
          $(el).text().trim().length === 0
        ) {
          $(el).remove();
        }
        // if picture inside [picture] tag then unwrap img from picture
        if (nodeName === "picture") {
          const img = $(el).find("img");
          if (img.length > 0) {
            $(img).unwrap();
          }
        }
        // remove images with small width and height
        if (nodeName === "img" && opt.removeSmallImages) {
          const width = $(el).attr("width");
          const height = $(el).attr("height");
          if (
            width &&
            height &&
            parseInt(width) < opt.removeSmallImages.minWidth &&
            parseInt(height) < opt.removeSmallImages.minHeight
          ) {
            $(el).remove();
          }
        }
      } else if (el.nodeType === 3) {
        // if the element is text and parent is div then wrap it with p tag
        const text = $(el).text().trim();
        if (
          text &&
          el.parentElement?.nodeType === 1 &&
          el.parentElement?.nodeName == "DIV"
        ) {
          $(el).wrap("<p></p>");
        }
      } else if (el.nodeType === 8) {
        if (opt.removeComments) {
          $(el).remove();
        }
      } else {
        // other types of elements are not supported, e.g. script, style, etc.
        $(el).remove();
        // console.warn(`Unsupported element type: ${el.type}`);
      }
    });
  // step 2: after cleaning the html, the DOM now cleaned
  $("body *", htmlDOM).each((i, el) => {
    const nodeName = el.nodeName.toLowerCase();
    // if element is SECTION_TAGS then unwrap children of the element
    if (SECTION_TAGS.includes(nodeName)) {
      $(el).replaceWith($(el).contents());
    }
    // some image has src is relative path, so we need to add domain to it
    if (nodeName === "img" && opt.url) {
      const src = $(el).attr("src");
      if (src) {
        $(el).attr("src", convertRelativeUrlsToAbsolute(opt.url, src));
      } else {
        $(el).remove();
      }
    }
    // some links has href is relative path, so we need to add domain to it
    if (nodeName === "a" && opt.url) {
      const href = $(el).attr("href");
      if (href) {
        $(el).attr("href", convertRelativeUrlsToAbsolute(opt.url, href));
      } else {
        $(el).remove();
      }
    }
  });
};

export const tinyhtml = (html: string, opt?: ProcessOptions) => {
  const options: ProcessOptions = {
    removeComments: true,
    removeEmptyElements: true,
    removeSmallImages: {
      minWidth: 100,
      minHeight: 100,
    },
    removeOptionalTags: [],
    removeScriptTypeAttributes: true,
    ...opt,
  };

  const cleanedHtml = html
    .replace(/\xA0/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  const htmlDOM = new DOMParser().parseFromString(cleanedHtml, "text/html");
  // execute the cleaning process
  // if (options.hooks?.before) {
  //   await executeHookFn(options.hooks.before, $);
  // }

  // select the content of the page using contentSelectors. If doesn't exist then select the whole body
  // if (options.contentSelectors && options.contentSelectors.length > 0) {
  //   const $content = $(options.contentSelectors!.join(','));
  //   const $body = cheerio.load('<body></body>', { decodeEntities: true }, true);
  //   // append the content to the new body
  //   $body('body').append($content);
  //   // replace the body with the new body
  //   $('body').replaceWith($body('body'));
  // }

  // clean and reduce html
  reduceHtml(htmlDOM, options);

  // execute the after hook
  // if (options.hooks?.after) {
  //   await executeHookFn(options.hooks.after, $);
  // }

  return {
    html: $("html", htmlDOM)[0].outerHTML,
  };
};
