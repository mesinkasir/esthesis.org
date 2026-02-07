import { readFileSync } from "fs";
import markdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";
import markdownItAnchor from "markdown-it-anchor";
import markdownItAttrs from "markdown-it-attrs";
import toc from "eleventy-plugin-toc";
import pluginNavigation from "@11ty/eleventy-navigation";
import pluginSyntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import pluginFilters from "./_config/filters.js";
import yaml from "js-yaml";

export default function (eleventyConfig) {
  const isFastBuild = process.env.FAST_BUILD === "1" || false;

  // Plugins
  eleventyConfig.addPlugin(toc, {
    tags: ['h2', 'h3', 'h4', 'h5'],
    wrapper: 'div',
    wrapperClass: 'list-group'
  });
  eleventyConfig.addPlugin(pluginSyntaxHighlight, { preAttributes: { tabindex: 0 } });
  eleventyConfig.addPlugin(pluginNavigation);
  eleventyConfig.addPlugin(pluginFilters);

  // Markdown Configuration
  const slugifyString = (str) =>
  String(str)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  const mdLib = markdownIt({
    html: true,
    breaks: true,
    linkify: true,
    typographer: true
  })
  .use(markdownItAnchor, {
  slugify: slugifyString,
  permalink: markdownItAnchor.permalink.ariaHidden({
    placement: "after",
    class: "header-anchor",
    symbol: ""
  }),
  level: [2, 3, 4] 
})
  .use(markdownItFootnote)
  .use(markdownItAttrs)
  .use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.ariaHidden({
      placement: "after",
      class: "header-anchor",
      symbol: ""
    }),
    level: [1, 2, 3, 4],
    slugify: eleventyConfig.getFilter("slugify")
  });

  eleventyConfig.setLibrary("md", mdLib);
  eleventyConfig.addFilter("md", (content) => mdLib.render(content));

  // Passthrough Copy
  eleventyConfig.addPassthroughCopy({ "public/css": "css" });
  eleventyConfig.addPassthroughCopy({ "public/images": "images" });
  eleventyConfig.addPassthroughCopy({ "public/docs": "docs" });
  eleventyConfig.addPassthroughCopy({ "public/admin": "admin" });
  eleventyConfig.addPassthroughCopy({ "public/images": "images" });
  eleventyConfig.addPassthroughCopy({ "node_modules/pagefind/pagefind-ui.*": "pagefind" });

  eleventyConfig.addWatchTarget("css/**/*.css");
eleventyConfig.addCollection("contributor", function(collectionApi) {
  return collectionApi.getFilteredByGlob("content/contributor/*.md");
});
  // --- DATA EXTENSION FIX ---
  eleventyConfig.addDataExtension("yaml", (contents) => yaml.load(contents));

  // Bundling Logic
  if (!isFastBuild) {
    eleventyConfig.addBundle("css", { toFileDirectory: "dist" });
    eleventyConfig.addBundle("js", { toFileDirectory: "dist" });
    eleventyConfig.addBundle("fontawesome", { toFileDirectory: "dist" });
  } else {
    eleventyConfig.addShortcode("getBundle", () => "");
  }


  // Collections
  const getPosts = (collectionApi) => collectionApi.getFilteredByGlob("content/posts/**/*.md").reverse();
  eleventyConfig.addCollection("posts", (collectionApi) => getPosts(collectionApi));

  eleventyConfig.addCollection("authorPages", (collectionApi) => {
    const authorsData = JSON.parse(readFileSync("./_data/authors.json", "utf-8"));
    const posts = getPosts(collectionApi);
    return Object.entries(authorsData).map(([key, author]) => ({
      key,
      ...author,
      posts: posts.filter(p => p.data.author === key),
      url: `/author/${key}/`
    })).filter(a => a.posts.length > 0);
  });

  // --- RETURN OBJECT FIX ---
  return {
    dir: {
      input: "content",
      output: "_site",
      includes: "../_includes",
      data: "../_data",
    },
    dataTemplateEngine: "njk", 
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}