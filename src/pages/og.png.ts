import type { APIRoute } from "astro";
import { html } from "satori-html";
import config from "@/config";
import { generateOgImage, getBackgroundDataUri } from "@/utils/generateOgImage";
import { nord } from "@/constants/nord";

export const GET: APIRoute = async () => {
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
      box-sizing: border-box
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
          font-size: 64px;
          font-weight: 700;
          margin-bottom: 24px;
          line-height: 1.1;
          color: ${nord[6]};
        ">
          ${config.site.title}
        </div>
        <div style="
          font-size: 28px;
          color: ${nord[4]};
          line-height: 1.4;
        ">
          ${config.site.description}
        </div>
      </div>

      <div style="
        display: flex;
        justify-content: flex-end;
        width: 100%;
        font-size: 26px;
        font-weight: 700;
        color: ${nord[8]};
      ">
        <span>${new URL(config.site.url).hostname}</span>
      </div>
    </div>
  `;

  return generateOgImage(markup);
};
