// utils/parseMediaLink.ts
export function parseMediaLink(raw: string) {
  try {
    const url = new URL(raw.trim());

    // YouTube
    if (/youtu\.be$|youtube\.com$/.test(url.hostname)) {
      // youtu.be/<id>
      if (url.hostname === "youtu.be") {
        const youtubeId = url.pathname.slice(1);
        const t = url.searchParams.get("t");
        return {
          youtubeId,
          startSeconds: toSeconds(t),
          spotifyUri: null,
          appleMusicUrl: null,
        };
      }

      // youtube.com/watch?v=<id>
      const v = url.searchParams.get("v");
      if (v) {
        const t = url.searchParams.get("t");
        return {
          youtubeId: v,
          startSeconds: toSeconds(t),
          spotifyUri: null,
          appleMusicUrl: null,
        };
      }
    }

    // Spotify
    if (url.hostname.endsWith("open.spotify.com")) {
      const parts = url.pathname.split("/").filter(Boolean); // ['track','<id>']
      if (parts[0] === "track" && parts[1]) {
        return {
          spotifyUri: `spotify:track:${parts[1]}`,
          youtubeId: null,
          startSeconds: null,
          appleMusicUrl: null,
        };
      }
    }

    // Apple Music
    if (
      url.hostname.endsWith("music.apple.com") ||
      url.hostname.endsWith("itunes.apple.com")
    ) {
      return {
        appleMusicUrl: url.toString(),
        youtubeId: null,
        spotifyUri: null,
        startSeconds: null,
      };
    }
  } catch {}

  return {};
}

function toSeconds(t?: string | null) {
  if (!t) return undefined;

  // supports "90" or "1m30s"
  if (/^\d+$/.test(t)) return parseInt(t, 10);

  const m = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/.exec(t);
  if (!m) return undefined;

  const [, h = "0", mnt = "0", s = "0"] = m;
  return +h * 3600 + +mnt * 60 + +s;
}