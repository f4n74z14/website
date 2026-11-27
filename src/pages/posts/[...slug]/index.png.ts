import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import config from "@/config";
import { getPostSlug } from "@/utils/getPostPaths";
import { postFilter } from "@/utils/postFilter";
import { renderOgCard } from "@/utils/generateOgImage";

export async function getStaticPaths() {
  if (!config.features.dynamicOgImage) {
    return [];
  }

  const posts = await getCollection("posts").then(p =>
    p.filter(post => postFilter(post) && !post.data.ogImage)
  );

  return posts.map(post => ({
    params: { slug: getPostSlug(post.id, post.filePath) },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props }) => {
  if (!config.features.dynamicOgImage) {
    return new Response(null, { status: 404, statusText: "Not found" });
  }

  return renderOgCard({
    title: props.data.title,
    titleSize: 60,
    footerLeft: props.data.author,
    footerRight: config.site.title,
  });
};
