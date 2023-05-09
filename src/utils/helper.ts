export const buildMetaOptions = (opt: {
  lang?: string;
  title?: string;
  description?: string;
  keywords?: string;
  favicon?: string;
  image?: string;
  type?: string;
}) => {
  const metaOptions = {
    ...(!!opt.lang && { lang: opt.lang }),
    ...(!!opt.title && { title: opt.title }),
    ...(!!opt.favicon && { favicon: opt.favicon }),
    meta: {
      ...(!!opt.description && { description: opt.description }),
      ...(!!opt.keywords && { keywords: opt.keywords }),

      ...(!!opt.title && { 'twitter:title': opt.title }),
      ...(!!opt.description && { 'twitter:description': opt.description }),
      ...(!!opt.image && { 'twitter:image': opt.image }),
      ...(!!opt.image && { 'twitter:card': 'summary_large_image' }),
    },
    socialMeta: {
      ...(!!opt.title && { 'og:title': opt.title }),
      ...(!!opt.description && { 'og:description': opt.description }),
      ...(!!opt.image && { 'og:image': opt.image }),
      ...(!!opt.type && { 'og:type': opt.type }),
    },
  };
  return metaOptions;
};