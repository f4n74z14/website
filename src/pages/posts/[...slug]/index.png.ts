import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { html } from "satori-html";
import config from "@/config";
import { getPostSlug } from "@/utils/getPostPaths";
import { postFilter } from "@/utils/postFilter";
import { generateOgImage, getBackgroundDataUri } from "@/utils/generateOgImage";
import { nord } from "@/constants/nord";

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

  const bgDataUri = getBackgroundDataUri();

  const markup = html`
    <div style="
      background-image: ${bgDataUri ? `url(${bgDataUri})` : "none"};
      background-color: ${nord[0]};
      background-size: cover;
      background-position: center;
      width: 88%;
      height: 80%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 80px;
      font-family: 'Inter';
      color: ${nord[6]};
    ">
      <div style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        width: 88%;
        height: 80%;
        margin-top: auto;
        margin-bottom: auto;
      ">
        <div style="
          font-size: 60px;
          font-weight: 700;
          line-height: 1.15;
          max-height: 220px;
          overflow: hidden;
          color: ${nord[6]};
        ">
          ${props.data.title}
        </div>
      </div>

      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        font-size: 26px;
        font-weight: 700;
        color: ${nord[8]};
      ">
        <span>${props.data.author}</span>
        <span>${config.site.title}</span>
      </div>
    </div>
  `;

  return generateOgImage(markup);
};
