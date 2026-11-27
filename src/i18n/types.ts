export interface UIStrings {
  site: {
    title: string;
    description: string;
  };
  nav: {
    home: string;
    posts: string;
    tags: string;
    about: string;
    thanks: string;
    archives: string;
    search: string;
  };
  post: {
    publishedAt: string;
    updatedAt: string;
    sharePostIntro: string;
    sharePostOn: string;
    sharePostViaEmail: string;
    tagLabel: string;
    backToTop: string;
    /** Optional until v8, so older locale files still type-check. */
    tableOfContents?: string;
    footnoteLabel: string;
    goBack: string;
    editPage: string;
    previousPost: string;
    nextPost: string;
  };
  pagination: {
    prev: string;
    next: string;
    page: string;
  };
  home: {
    heroTitle: string;
    heroParagraphs: string[];
    socialLinks: string;
    featured: string;
    recentPosts: string;
    allPosts: string;
  };
  socials: {
    email: string;
    profile: string;
  };
  footer: {
    copyright: string;
    license: string;
  };
  pages: {
    tagTitle: string;
    tagDesc: string;

    tagsTitle: string;
    tagsDesc: string;

    postsTitle: string;
    postsDesc: string;

    archivesTitle: string;
    archivesDesc: string;

    searchTitle: string;
    searchDesc: string;
    searchDevWarningTitle: string;
    searchDevWarningBody: string;
  };
  music: {
    play: string;
    pause: string;
    retry: string;
    serverUnavailable: string;
    playbackPosition: string;
    loading: string;
    volume: string;
    openOnAudius: string;
    close: string;
  };
  a11y: {
    skipToContent: string;
    /** Optional until v8, so older locale files still type-check. */
    skipTableOfContents?: string;
    breadcrumb: string;
    pagination: string;
    switchLanguage: string;
    openMenu: string;
    closeMenu: string;
    toggleTheme: string;
    searchPlaceholder: string;
    noResults: string;
    goToPreviousPage: string;
    goToNextPage: string;
    copyCode: string;
    codeCopied: string;
    zoomImageGeneral: string;
    zoomImage: string;
    imagePreviewGeneral: string;
    imagePreview: string;
    closeImagePreview: string;
    linkToSection: string;
  };
  notFound: {
    title: string;
    message: string;
    imageAlt: string;
    goHome: string;
  };
}
