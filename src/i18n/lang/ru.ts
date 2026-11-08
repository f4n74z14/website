import type { UIStrings } from "../types";

export default {
  nav: {
    home: "Главная",
    posts: "Посты",
    tags: "Теги",
    about: "Обо мне",
    archives: "Архивы",
    search: "Поиск",
  },
  post: {
    publishedAt: "Омубликовано",
    updatedAt: "Обновлено",
    sharePostIntro: "Поделиться:",
    sharePostOn: "Поделиться на {{platform}}",
    sharePostViaEmail: "Поделиться через почту",
    tagLabel: "Теги",
    backToTop: "Наверх",
    tableOfContents: "Оглавление",
    footnoteLabel: "Сноски",
    goBack: "Назад",
    editPage: "Изменить",
    previousPost: "Прошлый пост",
    nextPost: "Следующий пост",
  },
  pagination: {
    prev: "Назад",
    next: "Вперед",
    page: "Стр.",
  },
  home: {
    socialLinks: "Social Links",
    featured: "Горячее",
    recentPosts: "Недавнее",
    allPosts: "Все посты",
  },
  footer: {
    copyright: "Copyright",
    license: "Creative Commons Attribution 4.0 International License (CC BY 4.0)",
  },
  pages: {
    tagTitle: "Tag",
    tagDesc: "All the articles with the tag",

    tagsTitle: "Tags",
    tagsDesc: "All the tags used in posts.",

    postsTitle: "Posts",
    postsDesc: "All the articles I've posted.",

    archivesTitle: "Archives",
    archivesDesc: "All the articles I've archived.",

    searchTitle: "Search",
    searchDesc: "Search any article ...",
  },
  a11y: {
    skipToContent: "Skip to content",
    skipTableOfContents: "Skip table of contents",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    toggleTheme: "Toggle theme",
    searchPlaceholder: "Search posts...",
    noResults: "No results found",
    goToPreviousPage: "Go to previous page",
    goToNextPage: "Go to next page",
  },
  notFound: {
    title: "404 Not Found",
    message: "Page Not Found",
    goHome: "Go back home",
  },
} satisfies UIStrings;
