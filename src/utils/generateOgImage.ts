import satori from "satori";
import sharp from "sharp";
import { html } from "satori-html";
import fs from "node:fs";
import path from "node:path";
import { nord } from "@/constants/nord";

let cachedBgDataUri: string | undefined;
let cachedFonts:
  | { regular: ArrayBuffer; bold: ArrayBuffer }
  | undefined;

export function getBackgroundDataUri(): string {
  if (cachedBgDataUri !== undefined) return cachedBgDataUri;

  const bgPath = path.resolve("./public/og-bg.png");
  cachedBgDataUri = fs.existsSync(bgPath)
    ? `data:image/png;base64,${fs.readFileSync(bgPath).toString("base64")}`
    : "";
  return cachedBgDataUri;
}

function getFonts() {
  if (cachedFonts) return cachedFonts;

  const regularFontPath = path.resolve("./public/fonts/Inter-Regular.woff2");
  const boldFontPath = path.resolve("./public/fonts/Inter-Bold.woff2");

  if (!fs.existsSync(regularFontPath) || !fs.existsSync(boldFontPath)) {
    throw new Error("Font files are missing in public/fonts/");
  }

  cachedFonts = {
    regular: fs.readFileSync(regularFontPath).buffer,
    bold: fs.readFileSync(boldFontPath).buffer,
  };
  return cachedFonts;
}

export async function generateOgImage(markup: unknown): Promise<Response> {
  const { regular, bold } = getFonts();

  const svg = await satori(markup, {
    width: 1200,
    height: 630,
    embedFont: true,
    fonts: [
      { name: "Inter", data: regular, weight: 400, style: "normal" },
      { name: "Inter", data: bold, weight: 700, style: "normal" },
    ],
  });

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(pngBuffer), {
    headers: { "Content-Type": "image/png" },
  });
}

type OgCardOptions = {
  title: string;
  description?: string;
  titleSize?: number;
  footerLeft?: string;
  footerRight?: string;
};

export async function renderOgCard({
  title,
  description,
  titleSize = 60,
  footerLeft,
  footerRight,
}: OgCardOptions): Promise<Response> {
  const bgDataUri = getBackgroundDataUri();
  const hasBothFooter = Boolean(footerLeft && footerRight);

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
      box-sizing: border-box;
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
          font-size: ${titleSize}px;
          font-weight: 700;
          margin-bottom: ${description ? "24px" : "0"};
          line-height: ${description ? "1.1" : "1.15"};
          ${description ? "" : "max-height: 220px; overflow: hidden;"}
          color: ${nord[6]};
        ">
          ${title}
        </div>
        ${
          description
            ? `<div style="font-size: 28px; color: ${nord[4]}; line-height: 1.4;">${description}</div>`
            : ""
        }
      </div>

      <div style="
        display: flex;
        justify-content: ${hasBothFooter ? "space-between" : "flex-end"};
        align-items: center;
        width: 100%;
        font-size: 26px;
        font-weight: 700;
        color: ${nord[8]};
      ">
        ${footerLeft ? `<span>${footerLeft}</span>` : ""}
        ${footerRight ? `<span>${footerRight}</span>` : ""}
      </div>
    </div>
  `;

  return generateOgImage(markup);
}
