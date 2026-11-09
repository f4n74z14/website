import satori from "satori";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

export function getBackgroundDataUri(): string {
  const bgPath = path.resolve("./public/og-bg.png");
  if (fs.existsSync(bgPath)) {
    const bgBuffer = fs.readFileSync(bgPath);
    return `data:image/png;base64,${bgBuffer.toString("base64")}`;
  }
  return "";
}

export async function generateOgImage(markup: any): Promise<Response> {
  const regularFontPath = path.resolve("./public/fonts/Inter-Regular.woff2");
  const boldFontPath = path.resolve("./public/fonts/Inter-Bold.woff2");

  if (!fs.existsSync(regularFontPath) || !fs.existsSync(boldFontPath)) {
    throw new Error("Font files are missing in public/fonts/");
  }

  const regularData = fs.readFileSync(regularFontPath);
  const boldData = fs.readFileSync(boldFontPath);

  const svg = await satori(markup, {
    width: 1200,
    height: 630,
    embedFont: true,
    fonts: [
      {
        name: "Inter",
        data: regularData.buffer,
        weight: 400,
        style: "normal",
      },
      {
        name: "Inter",
        data: boldData.buffer,
        weight: 700,
        style: "normal",
      },
    ],
  });

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(pngBuffer), {
    headers: { "Content-Type": "image/png" },
  });
}
