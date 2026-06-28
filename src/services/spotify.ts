export type NowPlaying = {
  track: string;
  artist: string;
  isPlaying: boolean;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;
let cachedNowPlaying: { value: NowPlaying | null; expiresAt: number } | null =
  null;

async function getAccessToken(): Promise<string | null> {
  const clientId = import.meta.env.SPOTIFY_CLIENT_ID;
  const clientSecret = import.meta.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = import.meta.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.token;
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 10_000,
  };
  return cachedAccessToken.token;
}

function trackFromItem(item: any): NowPlaying | null {
  if (!item) {
    return null;
  }
  return {
    track: item.name,
    artist: item.artists?.map((a: any) => a.name).join(", ") ?? "",
    isPlaying: false,
  };
}

export async function getNowPlaying(): Promise<NowPlaying | null> {
  if (cachedNowPlaying && cachedNowPlaying.expiresAt > Date.now()) {
    return cachedNowPlaying.value;
  }

  const value = await fetchNowPlaying();
  cachedNowPlaying = { value, expiresAt: Date.now() + 30_000 };
  return value;
}

async function fetchNowPlaying(): Promise<NowPlaying | null> {
  const token = await getAccessToken();
  if (!token) {
    return null;
  }

  const headers = { Authorization: `Bearer ${token}` };

  const current = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    { headers },
  );

  if (current.status === 200) {
    const data = await current.json();
    if (data?.item) {
      return { ...trackFromItem(data.item), isPlaying: Boolean(data.is_playing) } as NowPlaying;
    }
  }

  const recent = await fetch(
    "https://api.spotify.com/v1/me/player/recently-played?limit=1",
    { headers },
  );

  if (recent.ok) {
    const data = await recent.json();
    return trackFromItem(data?.items?.[0]?.track);
  }

  return null;
}
