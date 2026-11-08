import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://fantazia.pages.dev/",
    title: "Предел фантазии",
    description: "Небольшой блог небольшого человека",
    author: "fantazia",
    profile: "",
    ogImage: "default-og.jpg",
    lang: "ru",
    timezone: "Asia/Bangkok",
    dir: "ltr",
  },
  posts: {
    perPage: 6,
    perIndex: 4,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: false,
    },
    search: "pagefind",
    toc: true,
  },
  socials: [
    { name: "github",   url: "https://github.com/fantazia" },
  ],
});
