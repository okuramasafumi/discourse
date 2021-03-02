"use strict";

const Plugin = require("broccoli-plugin");
const bent = require("bent");
const getJSON = bent("json");
const { encode } = require("html-entities");

let bootstrap;
let _proxy;

class DiscourseBootstrap extends Plugin {
  async build() {
    bootstrap = (await getJSON(`${_proxy}/bootstrap.json`)).bootstrap;
  }
}

module.exports = {
  name: require("./package").name,

  isDevelopingAddon() {
    return true;
  },

  contentFor(type) {
    if (!bootstrap) {
      return;
    }

    if (type === "head-tag") {
      let classList = "";
      if (bootstrap.html_classes) {
        classList = ` class="${bootstrap.html_classes}"`;
      }
      return `<head lang="${bootstrap.html_lang}"${classList}>`;
    }

    let html = bootstrap.html;
    if (type === "before-script-load") {
      let content = [];
      content.push(html.before_script_load);
      content.push(`<script src="${html.before_script_load}"></script>`);
      content.push(`<script src="${bootstrap.locale_script}"></script>`);
      (bootstrap.extra_locales || []).forEach((l) =>
        content.push(`<script src="${l}"></script>`)
      );

      return content.join("\n");
    }

    let themeHtml = bootstrap.theme_html;
    if (type === "head") {
      let content = [];

      if (bootstrap.csrf_token) {
        content.push(`<meta name="csrf-param" content="authenticity_token">`);
        content.push(
          `<meta name="csrf-token" content="${bootstrap.csrf_token}">`
        );
      }
      if (bootstrap.theme_ids) {
        content.push(
          `<meta name="discourse_theme_ids" content="${bootstrap.theme_ids}">`
        );
      }

      let setupData = "";
      Object.keys(bootstrap.setup_data).forEach((sd) => {
        setupData += ` data-${sd.replace("_", "-")}="${encode(
          (bootstrap.setup_data[sd] || "").toString()
        )}"`;
      });
      content.push(`<meta id="data-discourse-setup"${setupData} />`);

      (bootstrap.stylesheets || []).forEach((s) => {
        let attrs = [];
        if (s.media) {
          attrs.push(`media="${s.media}"`);
        }
        if (s.target) {
          attrs.push(`data-target="${s.target}"`);
        }
        if (s.theme_id) {
          attrs.push(`data-theme-id="${s.theme_id}"`);
        }
        let link = `<link rel="stylesheet" type="text/css" href="${
          s.href
        }" ${attrs.join(" ")}></script>\n`;
        content.push(link);
      });

      bootstrap.plugin_js.forEach((src) =>
        content.push(`<script src="${src}"></script>`)
      );

      content.push(themeHtml.translations);
      content.push(themeHtml.js);
      content.push(themeHtml.head_tag);
      content.push(html.before_head_close);

      return content.join("\n");
    }

    if (type === "body") {
      let content = [];
      content.push(themeHtml.header);
      content.push(html.header);
      return content.join("\n");
    }

    if (type === "body-footer") {
      let content = [];
      content.push(themeHtml.body_tag);
      content.push(html.before_body_close);
      return content.join("\n");
    }

    if (type === "preloaded") {
      return `<div class="hidden" id="data-preloaded" data-preloaded="${encode(
        JSON.stringify(bootstrap.preloaded)
      )}"></div>`;
    }
  },

  serverMiddleware(config) {
    _proxy = config.options.proxy;
  },

  treeForAddon() {
    return new DiscourseBootstrap([]);
  },
};
