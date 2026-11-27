import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import config from "@/config";
import { getContentLocale, getLocaleParam, useTranslations } from "@/i18n";
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

  return posts.map(post => {
    const locale = getContentLocale(post);
    return {
      params: {
        locale: getLocaleParam(locale),
        slug: getPostSlug(post.id, post.filePath),
      },
      props: { post, locale },
    };
  });
}

export const GET: APIRoute = async ({ props }) => {
  if (!config.features.dynamicOgImage) {
    return new Response(null, { status: 404, statusText: "Not found" });
  }

  const t = useTranslations(props.locale);

  return renderOgCard({
    title: props.post.data.title,
    titleSize: 60,
    footerLeft: props.post.data.author,
    footerRight: t.site.title,
  });
};
