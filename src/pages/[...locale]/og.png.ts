import type { APIRoute } from "astro";
import config from "@/config";
import { getStaticLocalePaths, useTranslations } from "@/i18n";
import { renderOgCard } from "@/utils/generateOgImage";

export const getStaticPaths = () => getStaticLocalePaths();

export const GET: APIRoute = ({ props }) => {
  const t = useTranslations(props.locale);
  return renderOgCard({
    title: t.site.title,
    description: t.site.description,
    titleSize: 64,
    footerRight: new URL(config.site.url).hostname,
  });
};
