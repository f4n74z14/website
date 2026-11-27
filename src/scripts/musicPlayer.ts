import {
  buildStreamUrl,
  clamp,
  createServerPool,
  fetchDiscoveryServers,
  formatTime,
  getAudiusTrackUrl,
  isAbortError,
  resolveTrackIdWithFailover,
} from "@/utils/audius";

const VOLUME_KEY = "fantazia:music-volume";
const DEFAULT_VOLUME = 0.7;
const STREAM_LOAD_TIMEOUT_MS = 8000;

const resolvedTracks = new Map<string, string>();
const serverPool = createServerPool();
let discoveryPromise: Promise<string[]> | null = null;

function warmDiscovery(): Promise<string[]> {
  if (!discoveryPromise) {
    discoveryPromise = fetchDiscoveryServers().then(servers => {
      serverPool.mergeServers(servers);
      return servers;
    });
  }
  return discoveryPromise;
}

function getSavedVolume(): number {
  try {
    const saved = localStorage.getItem(VOLUME_KEY);
    if (saved === null) return DEFAULT_VOLUME;
    const parsed = Number(saved);
    return Number.isFinite(parsed) ? clamp(parsed) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

type MusicPlayerController = {
  player: HTMLElement;
  audio: HTMLAudioElement;
  selectTrack: (link: HTMLElement) => Promise<void>;
  beforeSwap: () => void;
  fadeOutAndPause: (duration?: number) => Promise<void>;
};

function createMusicPlayer(
  player: HTMLElement,
  audio: HTMLAudioElement
): MusicPlayerController {
  const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
    const el = player.querySelector(`#${id}`);
    if (!el) throw new Error(`Music player: element #${id} not found`);
    return el as T;
  };

  const playButton = $<HTMLButtonElement>("music-play");
  const playIcon = $("music-play-icon");
  const pauseIcon = $("music-pause-icon");
  const progress = $<HTMLInputElement>("music-progress");
  const volume = $<HTMLInputElement>("music-volume");
  const currentLabel = $("music-current");
  const durationLabel = $("music-duration");
  const audiusLink = $<HTMLAnchorElement>("music-audius");
  const closeButton = $<HTMLButtonElement>("music-close");
  const loadingIndicator = player.querySelector("#music-loading");

  let userVolume = getSavedVolume();
  let fadeProgress = 1;
  let fadePromise: Promise<void> | null = null;
  let isResolvingTrack = false;
  let isBuffering = false;
  let hasError = false;
  let requestId = 0;
  let resolveController: AbortController | null = null;

  let activeTrackId: string | null = null;
  let activeStreamServer: string | null = null;
  let attemptedStreamServers = new Set<string>();
  let streamWatchdog: ReturnType<typeof setTimeout> | null = null;
  let pendingResumeTime = 0;
  let shouldAutoPlay = false;

  let lastCurrentText = "0:00";
  let lastDurationText = "0:00";

  const clearWatchdog = () => {
    if (streamWatchdog !== null) {
      clearTimeout(streamWatchdog);
      streamWatchdog = null;
    }
  };

  const setTimeText = (
    el: HTMLElement,
    text: string,
    isDuration: boolean
  ) => {
    if (isDuration) {
      if (text !== lastDurationText) {
        lastDurationText = text;
        el.textContent = text;
      }
    } else if (text !== lastCurrentText) {
      lastCurrentText = text;
      el.textContent = text;
    }
  };

  const showPlayer = () => {
    player.inert = false;
    player.setAttribute("aria-hidden", "false");
    player.dataset.open = "true";
  };

  const hidePlayer = () => {
    player.setAttribute("aria-hidden", "true");
    player.inert = true;
    player.dataset.open = "false";
  };

  const updatePlayerUI = () => {
    const isPlaying = !audio.paused && !audio.ended;
    const isLoading = isResolvingTrack || isBuffering;

    playIcon.classList.toggle("hidden", isPlaying);
    pauseIcon.classList.toggle("hidden", !isPlaying);
    player.toggleAttribute("data-error", hasError);

    playButton.disabled =
      isResolvingTrack || (!hasError && !audio.hasAttribute("src"));
    playButton.setAttribute(
      "aria-label",
      hasError ? "Retry audio" : isPlaying ? "Pause" : "Play"
    );
    playButton.title = hasError
      ? "Audio server unavailable — click to retry"
      : "";
    playButton.setAttribute("aria-busy", String(isLoading));

    if (loadingIndicator) {
      loadingIndicator.classList.toggle("hidden", !isLoading);
      loadingIndicator.classList.toggle("flex", isLoading);
    }
  };

  const setBuffering = (value: boolean) => {
    isBuffering = value;
    updatePlayerUI();
  };

  const resetProgressUI = () => {
    progress.value = "0";
    progress.disabled = true;
    progress.style.setProperty("--progress", "0%");
    setTimeText(currentLabel, "0:00", false);
    setTimeText(durationLabel, "0:00", true);
  };

  const resetAudioElement = () => {
    clearWatchdog();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  };

  function fadeOutAndPause(duration = 350): Promise<void> {
    if (audio.paused) return Promise.resolve();
    if (fadePromise) return fadePromise;

    fadePromise = new Promise(resolve => {
      const startTime = performance.now();

      function step(now: number) {
        const progressRatio = Math.min((now - startTime) / duration, 1);
        fadeProgress = 1 - progressRatio;
        audio.volume = userVolume * fadeProgress;

        if (progressRatio < 1) {
          requestAnimationFrame(step);
          return;
        }

        audio.pause();
        fadeProgress = 1;
        audio.volume = userVolume;
        fadePromise = null;
        updatePlayerUI();
        resolve();
      }

      requestAnimationFrame(step);
    });

    return fadePromise;
  }

  // Volume controls
  audio.volume = userVolume;
  volume.value = String(userVolume);
  volume.style.setProperty("--progress", `${userVolume * 100}%`);

  volume.addEventListener("input", () => {
    userVolume = clamp(Number(volume.value));
    audio.volume = userVolume * fadeProgress;
    volume.style.setProperty("--progress", `${userVolume * 100}%`);
  });

  volume.addEventListener("change", () => {
    try {
      localStorage.setItem(VOLUME_KEY, String(userVolume));
    } catch {
      // Storage may be unavailable.
    }
  });

  function updateProgress() {
    const duration = audio.duration;
    const hasDuration = Number.isFinite(duration) && duration > 0;

    progress.disabled = !hasDuration;
    progress.value = hasDuration
      ? String((audio.currentTime / duration) * 100)
      : "0";
    progress.style.setProperty("--progress", `${progress.value}%`);

    setTimeText(currentLabel, formatTime(audio.currentTime), false);
    if (hasDuration) {
      setTimeText(durationLabel, formatTime(duration), true);
    }
  }

  progress.addEventListener("input", () => {
    const duration = audio.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    const percentage = clamp(Number(progress.value), 0, 100);
    const time = (percentage / 100) * duration;
    audio.currentTime = time;
    progress.style.setProperty("--progress", `${percentage}%`);
    setTimeText(currentLabel, formatTime(time), false);
  });

  async function playAudio(): Promise<void> {
    if (isResolvingTrack || !audio.hasAttribute("src")) return;
    if (audio.ended) audio.currentTime = 0;

    try {
      await audio.play();
    } catch (error) {
      if (isAbortError(error)) return;
      isBuffering = false;
      updatePlayerUI();
    }
  }

  function startStreamOnServer(
    trackId: string,
    server: string,
    reqId: number
  ) {
    if (reqId !== requestId) return;

    clearWatchdog();
    hasError = false;
    activeTrackId = trackId;
    activeStreamServer = server;
    attemptedStreamServers.add(server);
    isBuffering = true;

    audio.src = buildStreamUrl(server, trackId);
    audio.load();
    updatePlayerUI();

    streamWatchdog = setTimeout(() => {
      if (reqId === requestId && isBuffering && audio.readyState < 2) {
        void failoverStream(reqId);
      }
    }, STREAM_LOAD_TIMEOUT_MS);

    if (shouldAutoPlay) {
      void playAudio();
    }
  }

  async function failoverStream(reqId: number): Promise<void> {
    if (reqId !== requestId || !activeTrackId) return;

    clearWatchdog();
    if (activeStreamServer) {
      serverPool.markFailed(activeStreamServer);
    }

    if (audio.currentTime > 0 && Number.isFinite(audio.currentTime)) {
      pendingResumeTime = audio.currentTime;
    }

    let nextServer = serverPool
      .getServers()
      .find(s => !attemptedStreamServers.has(s));

    if (!nextServer) {
      await warmDiscovery();
      if (reqId !== requestId || !activeTrackId) return;
      nextServer = serverPool
        .getServers()
        .find(s => !attemptedStreamServers.has(s));
    }

    if (nextServer) {
      startStreamOnServer(activeTrackId, nextServer, reqId);
      return;
    }

    // All known servers failed for this stream.
    shouldAutoPlay = false;
    isBuffering = false;
    hasError = true;
    resetAudioElement();
    resetProgressUI();
    updatePlayerUI();
  }

  audio.addEventListener("loadedmetadata", () => {
    clearWatchdog();
    if (
      pendingResumeTime > 0 &&
      Number.isFinite(audio.duration) &&
      pendingResumeTime < audio.duration
    ) {
      audio.currentTime = pendingResumeTime;
    }
    pendingResumeTime = 0;
    if (activeStreamServer) {
      serverPool.markSuccess(activeStreamServer);
    }
    updateProgress();
  });

  audio.addEventListener("durationchange", updateProgress);
  audio.addEventListener("timeupdate", updateProgress);

  audio.addEventListener("play", updatePlayerUI);
  audio.addEventListener("pause", () => {
    isBuffering = false;
    updatePlayerUI();
  });
  audio.addEventListener("playing", () => {
    clearWatchdog();
    hasError = false;
    setBuffering(false);
  });
  audio.addEventListener("canplay", () => {
    clearWatchdog();
    hasError = false;
    setBuffering(false);
  });
  audio.addEventListener("waiting", () => {
    if (!audio.paused) setBuffering(true);
  });
  audio.addEventListener("stalled", () => {
    if (!audio.paused) setBuffering(true);
  });
  audio.addEventListener("error", () => {
    if (!audio.hasAttribute("src")) return;
    void failoverStream(requestId);
  });
  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    updateProgress();
    updatePlayerUI();
  });

  function togglePlayback() {
    if (isResolvingTrack) return;

    if (hasError && audio.dataset.track) {
      void loadTrack(audio.dataset.track, audio.loop);
      return;
    }

    if (!audio.hasAttribute("src")) return;

    if (audio.paused) {
      shouldAutoPlay = true;
      void playAudio();
    } else {
      shouldAutoPlay = false;
      void fadeOutAndPause();
    }
  }

  playButton.addEventListener("click", togglePlayback);

  async function loadTrack(trackUrl: string, loop: boolean): Promise<void> {
    const currentRequest = ++requestId;
    resolveController?.abort();

    const controller = new AbortController();
    resolveController = controller;

    hasError = false;
    isResolvingTrack = true;
    isBuffering = false;
    activeTrackId = null;
    activeStreamServer = null;
    attemptedStreamServers = new Set();
    pendingResumeTime = 0;
    shouldAutoPlay = true;
    updatePlayerUI();

    await fadeOutAndPause(300);
    if (currentRequest !== requestId) return;

    resetAudioElement();
    audio.dataset.track = trackUrl;
    audio.loop = loop;
    resetProgressUI();
    updatePlayerUI();

    void warmDiscovery();

    try {
      let trackId = resolvedTracks.get(trackUrl);
      let preferredServer = serverPool.getCurrent();

      if (!trackId) {
        try {
          const resolved = await resolveTrackIdWithFailover({
            trackUrl,
            pool: serverPool,
            signal: controller.signal,
          });
          trackId = resolved.id;
          preferredServer = resolved.server;
        } catch (err) {
          if (isAbortError(err)) throw err;
          await warmDiscovery();
          if (currentRequest !== requestId) return;
          const resolved = await resolveTrackIdWithFailover({
            trackUrl,
            pool: serverPool,
            signal: controller.signal,
          });
          trackId = resolved.id;
          preferredServer = resolved.server;
        }
        resolvedTracks.set(trackUrl, trackId);
      }

      if (currentRequest !== requestId) return;
      resolveController = null;
      isResolvingTrack = false;

      startStreamOnServer(trackId, preferredServer, currentRequest);
    } catch (error) {
      if (currentRequest !== requestId) return;
      resolveController = null;
      isResolvingTrack = false;
      isBuffering = false;

      if (!isAbortError(error)) {
        hasError = true;
        shouldAutoPlay = false;
      }

      resetAudioElement();
      resetProgressUI();
      updatePlayerUI();
    }
  }

  async function selectTrack(link: HTMLElement): Promise<void> {
    const rawTrackUrl = link.dataset.audiusTrack?.trim();
    if (!rawTrackUrl) return;

    let trackUrl: string;
    try {
      trackUrl = getAudiusTrackUrl(rawTrackUrl).href;
    } catch {
      return;
    }

    showPlayer();
    audiusLink.href = trackUrl;

    if (audio.dataset.track === trackUrl && !hasError) {
      if (!isResolvingTrack && audio.hasAttribute("src")) {
        togglePlayback();
      }
      return;
    }

    await loadTrack(trackUrl, link.dataset.loop === "true");
  }

  closeButton.addEventListener("click", async () => {
    const closeRequest = ++requestId;
    resolveController?.abort();
    resolveController = null;
    isResolvingTrack = false;
    isBuffering = false;
    hasError = false;
    shouldAutoPlay = false;

    await fadeOutAndPause(250);
    if (closeRequest !== requestId) return;

    resetAudioElement();
    delete audio.dataset.track;
    activeTrackId = null;
    activeStreamServer = null;
    audio.loop = false;
    resetProgressUI();
    updatePlayerUI();
    hidePlayer();
  });

  function beforeSwap() {
    requestId++;
    resolveController?.abort();
    resolveController = null;
    clearWatchdog();
    isResolvingTrack = false;
    isBuffering = false;
    shouldAutoPlay = false;
    audio.pause();

    if (audio.readyState > 0 && Number.isFinite(audio.duration)) {
      audio.currentTime = 0;
    }
    hidePlayer();
    updateProgress();
    updatePlayerUI();
  }

  progress.disabled = true;
  updatePlayerUI();

  return { player, audio, selectTrack, beforeSwap, fadeOutAndPause };
}

let activePlayer: MusicPlayerController | null = null;

function initMusicPlayer(): void {
  const player = document.getElementById("music-player");
  const audio = document.getElementById("music-audio");

  if (!(player instanceof HTMLElement) || !(audio instanceof HTMLAudioElement)) {
    activePlayer = null;
    return;
  }

  if (activePlayer?.player === player && activePlayer.audio === audio) {
    return;
  }

  activePlayer = createMusicPlayer(player, audio);
}

initMusicPlayer();
document.addEventListener("astro:page-load", initMusicPlayer);

document.addEventListener("click", (event: MouseEvent) => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest<HTMLElement>("[data-audius-track]");
  if (!link || !activePlayer) return;

  event.preventDefault();
  void activePlayer.selectTrack(link);
});

document.addEventListener("astro:before-swap", () => {
  activePlayer?.beforeSwap();
});

document.addEventListener("astro:before-preparation", event => {
  const navigationEvent = event as Event & { loader: () => Promise<void> };
  const originalLoader = navigationEvent.loader;

  navigationEvent.loader = async () => {
    await Promise.all([
      originalLoader(),
      activePlayer?.fadeOutAndPause(400) ?? Promise.resolve(),
    ]);
  };
});
