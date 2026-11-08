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
    socialLinks: "Ссылки на соц. сети",
    featured: "Горячее",
    recentPosts: "Недавнее",
    allPosts: "Все посты",
  },
  footer: {
    copyright: "Copyright",
    license: "CC BY 4.0",
  },
  pages: {
    tagTitle: "Тег",
    tagDesc: "Все посты с тегом.",

    tagsTitle: "Теги",
    tagsDesc: "Все теги, используемые в постах.",

    postsTitle: "Посты",
    postsDesc: "Все посты, которые я выложил.",

    archivesTitle: "Архивы",
    archivesDesc: "Все посты, которые я заархивировал.",

    searchTitle: "Поиск",
    searchDesc: "Поиск по всем постам ...",
  },
  a11y: {
    skipToContent: "Перейти к содержанию",
    skipTableOfContents: "Пропустить оглавление",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",
    toggleTheme: "Переключить тему",
    searchPlaceholder: "Искать в постах...",
    noResults: "Не найдено",
    goToPreviousPage: "Пред. страница",
    goToNextPage: "След. страница",
  },
  notFound: {
    title: "404 Не найдено",
    message: "Страница не найдена",
    goHome: "На главную",
  },
} satisfies UIStrings;
