import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStreamUrl,
  computeFadeFactor,
  computeProgressPercent,
  computeSeekTime,
  createServerPool,
  fetchDiscoveryServers,
  formatTime,
  getAudiusTrackUrl,
  isValidAudiusServer,
  resolveTrackIdWithFailover,
} from "./audius";

test("isValidAudiusServer enforces HTTPS and rejects local or IP hosts", () => {
  assert.equal(
    isValidAudiusServer("https://discoveryprovider.audius.co/"),
    "https://discoveryprovider.audius.co"
  );
  assert.equal(isValidAudiusServer("http://api.audius.co"), null);
  assert.equal(isValidAudiusServer("https://127.0.0.1"), null);
  assert.equal(isValidAudiusServer("https://localhost:3000"), null);
  assert.equal(isValidAudiusServer("https://user:pass@api.audius.co"), null);
});

test("getAudiusTrackUrl validates Audius domain and strips hash", () => {
  const url = getAudiusTrackUrl("https://audius.co/artist/track#section");
  assert.equal(url.href, "https://audius.co/artist/track");
  assert.throws(() => getAudiusTrackUrl("https://evil.example/track"));
  assert.throws(() => getAudiusTrackUrl("http://audius.co/artist/track"));
});

test("createServerPool rotates failed servers to the back and promotes healthy ones", () => {
  const pool = createServerPool([
    "https://s1.audius.co",
    "https://s2.audius.co",
    "https://s3.audius.co",
  ]);
  assert.equal(pool.getCurrent(), "https://s1.audius.co");

  pool.markFailed("https://s1.audius.co");
  assert.deepEqual(pool.getServers(), [
    "https://s2.audius.co",
    "https://s3.audius.co",
    "https://s1.audius.co",
  ]);

  pool.markSuccess("https://s3.audius.co");
  assert.equal(pool.getCurrent(), "https://s3.audius.co");
});

test("resolveTrackIdWithFailover switches to backup server when primary fails", async () => {
  const pool = createServerPool([
    "https://down.audius.co",
    "https://healthy.audius.co",
  ]);
  const called: string[] = [];

  const fakeFetch: typeof fetch = async input => {
    const url = String(input);
    called.push(url);
    if (url.startsWith("https://down.audius.co")) {
      return new Response("Unavailable", { status: 503 });
    }
    return new Response(JSON.stringify({ data: { id: "trk-42" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const result = await resolveTrackIdWithFailover({
    trackUrl: "https://audius.co/artist/song",
    pool,
    fetchImpl: fakeFetch,
  });

  assert.equal(result.id, "trk-42");
  assert.equal(result.server, "https://healthy.audius.co");
  assert.equal(pool.getCurrent(), "https://healthy.audius.co");
  assert.equal(called.length, 2);
  assert.equal(
    buildStreamUrl(result.server, result.id),
    "https://healthy.audius.co/v1/tracks/trk-42/stream"
  );
});

test("resolveTrackIdWithFailover throws when all servers fail", async () => {
  const pool = createServerPool(["https://s1.audius.co", "https://s2.audius.co"]);
  const fakeFetch: typeof fetch = async () => {
    throw new Error("Network down");
  };

  await assert.rejects(
    resolveTrackIdWithFailover({
      trackUrl: "https://audius.co/artist/song",
      pool,
      fetchImpl: fakeFetch,
    }),
    /unavailable/i
  );
});

test("fetchDiscoveryServers filters invalid entries gracefully", async () => {
  const fakeFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        data: [
          "https://node1.audius.co/",
          "http://insecure.audius.co",
          "https://192.168.1.1",
        ],
      }),
      { status: 200 }
    );

  const servers = await fetchDiscoveryServers(fakeFetch);
  assert.deepEqual(servers, ["https://node1.audius.co"]);
});

test("formatTime handles finite and non-finite inputs", () => {
  assert.equal(formatTime(0), "0:00");
  assert.equal(formatTime(65), "1:05");
  assert.equal(formatTime(-5), "0:00");
  assert.equal(formatTime(NaN), "0:00");
});

test("computeFadeFactor applies perceptual ease-out curves and clamps inputs", () => {
  assert.equal(computeFadeFactor(0, "out"), 1);
  assert.equal(computeFadeFactor(0.5, "out"), 0.25);
  assert.equal(computeFadeFactor(1, "out"), 0);
  assert.equal(computeFadeFactor(-1, "out"), 1);
  assert.equal(computeFadeFactor(2, "out"), 0);

  assert.equal(computeFadeFactor(0, "in"), 0);
  assert.equal(computeFadeFactor(0.5, "in"), 0.75);
  assert.equal(computeFadeFactor(1, "in"), 1);
});

test("computeProgressPercent and computeSeekTime preserve sub-percent precision", () => {
  assert.equal(computeProgressPercent(12.34, 200), 6.17);
  assert.equal(computeProgressPercent(250, 200), 100);
  assert.equal(computeProgressPercent(10, 0), 0);
  assert.equal(computeProgressPercent(NaN, 200), 0);

  assert.equal(computeSeekTime(6.17, 200), 12.34);
  assert.equal(computeSeekTime(150, 200), 200);
  assert.equal(computeSeekTime(-10, 200), 0);
  assert.equal(computeSeekTime(50, NaN), 0);
});
