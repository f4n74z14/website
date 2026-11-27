import test from "node:test";
import assert from "node:assert/strict";
import { buildTocTree, hasToc } from "./buildTocTree";

test("hasToc requires at least 2 headings within depth range", () => {
  assert.equal(hasToc([]), false);
  assert.equal(hasToc([{ depth: 2, slug: "one", text: "One" }]), false);
  assert.equal(hasToc([{ depth: 1, slug: "h1", text: "H1" }, { depth: 4, slug: "h4", text: "H4" }]), false);
  assert.equal(
    hasToc([
      { depth: 2, slug: "a", text: "A" },
      { depth: 3, slug: "b", text: "B" },
    ]),
    true
  );
});

test("buildTocTree nests h3 under h2 and handles skipped levels gracefully", () => {
  const tree = buildTocTree([
    { depth: 1, slug: "title", text: "Title" },
    { depth: 2, slug: "intro", text: "Intro" },
    { depth: 3, slug: "sub", text: "Sub" },
    { depth: 2, slug: "end", text: "End" },
  ]);

  assert.equal(tree.length, 2);
  assert.equal(tree[0].slug, "intro");
  assert.equal(tree[0].children.length, 1);
  assert.equal(tree[0].children[0].slug, "sub");
  assert.equal(tree[1].slug, "end");
});
