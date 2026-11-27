import test from "node:test";
import assert from "node:assert/strict";
import {
  rehypeFootnoteLabel,
  resolveContentFileLocale,
} from "./rehypeFootnoteLabel";

const LABELS = { ru: "Сноски", en: "Footnotes" } as const;

test("resolveContentFileLocale infers locale from path and frontmatter", () => {
  assert.equal(
    resolveContentFileLocale({
      path: "/app/src/content/posts/_prog/rustpocalypse.mdx",
    }),
    "ru"
  );
  assert.equal(
    resolveContentFileLocale({
      path: "/app/src/content/posts/en/_prog/rustpocalypse.mdx",
    }),
    "en"
  );
  assert.equal(
    resolveContentFileLocale({
      history: ["C:\\repo\\src\\content\\pages\\en\\about.mdx"],
    }),
    "en"
  );
  assert.equal(
    resolveContentFileLocale({
      path: "/app/src/content/posts/custom.mdx",
      data: { astro: { frontmatter: { lang: "en" } } },
    }),
    "en"
  );
});

test("rehypeFootnoteLabel rewrites footnote-label heading text for file locale", () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "section",
        properties: { dataFootnotes: true },
        children: [
          {
            type: "element",
            tagName: "h2",
            properties: { id: "footnote-label", className: ["sr-only"] },
            children: [{ type: "text", value: "Footnotes" }],
          },
        ],
      },
    ],
  };

  rehypeFootnoteLabel(LABELS)(tree, {
    path: "/app/src/content/posts/_prog/rustpocalypse.mdx",
  });

  const heading = tree.children[0].children[0];
  assert.deepEqual(heading.children, [{ type: "text", value: "Сноски" }]);
});
