import type { APIRoute } from "astro";
import config from "@/config";
import { renderOgCard } from "@/utils/generateOgImage";

export const GET: APIRoute = () =>
  renderOgCard({
    title: config.site.title,
    description: config.site.description,
    titleSize: 64,
    footerRight: new URL(config.site.url).hostname,
  });
