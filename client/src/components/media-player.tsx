import React from "react";

export function YouTubePlayer({
  videoId,
  startSeconds,
}: {
  videoId: string;
  startSeconds?: number;
}) {
  const src = new URL("https://www.youtube.com/embed/" + videoId);
  src.searchParams.set("enablejsapi", "1");
  src.searchParams.set("modestbranding", "1");
  src.searchParams.set("rel", "0");
  if (startSeconds) src.searchParams.set("start", String(startSeconds));

  return (
    <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
      <iframe
        className="absolute inset-0 h-full w-full rounded-lg"
        src={src.toString()}
        title="YouTube player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

export function SpotifyEmbed({ spotifyUri }: { spotifyUri: string }) {
  const id = spotifyUri.split(":").pop();
  const src = `https://open.spotify.com/embed/track/${id}`;

  return (
    <iframe
      className="w-full rounded-lg"
      style={{ height: 152 }}
      src={src}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      title="Spotify player"
    />
  );
}

export function AppleMusicEmbed({ appleMusicUrl }: { appleMusicUrl: string }) {
  const embedSrc = appleMusicUrl.replace(
    "https://music.apple.com/",
    "https://embed.music.apple.com/"
  );

  return (
    <iframe
      className="w-full rounded-lg"
      style={{ height: 175 }}
      src={embedSrc}
      allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
      loading="lazy"
      sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
      title="Apple Music player"
    />
  );
}