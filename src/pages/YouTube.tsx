import { ListVideo, Music, PlaySquare, Youtube } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { MediaDownloaderPage, type DownloaderMode } from "@/components/site/MediaDownloaderPage";

const matchesVideo = (value: string) =>
  /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=)/i.test(value);
const matchesShort = (value: string) =>
  /https?:\/\/(?:www\.)?youtube\.com\/shorts\//i.test(value);
const matchesPlaylist = (value: string) =>
  /https?:\/\/(?:www\.)?(?:youtube\.com|music\.youtube\.com)\/.*[?&]list=/i.test(value);

const modes: DownloaderMode[] = [
  {
    id: "video",
    label: "Video",
    description: "Regular YouTube videos and music links",
    icon: Youtube,
    placeholder: "https://www.youtube.com/watch?v=...",
    expectedHint: "youtube.com/watch?v=... or youtu.be/...",
    matches: matchesVideo,
  },
  {
    id: "short",
    label: "Short",
    description: "Short-form vertical videos",
    icon: PlaySquare,
    placeholder: "https://www.youtube.com/shorts/...",
    expectedHint: "youtube.com/shorts/...",
    matches: matchesShort,
  },
  {
    id: "playlist",
    label: "Playlist",
    description: "Playlist items plus thumbnails",
    icon: ListVideo,
    placeholder: "https://www.youtube.com/playlist?list=...",
    expectedHint: "youtube.com/...&list=...",
    matches: matchesPlaylist,
  },
  {
    id: "audio",
    label: "Audio",
    description: "Music-first downloads from video URLs",
    icon: Music,
    placeholder: "https://www.youtube.com/watch?v=...",
    expectedHint: "youtube.com/watch?v=... or youtu.be/...",
    matches: matchesVideo,
  },
];

const YouTube = () => (
  <PageShell>
    <MediaDownloaderPage
    platform="youtube"
    functionName="youtube-download"
    badge="YouTube downloader"
    title="Download YouTube videos, Shorts, audio, playlists, and thumbnails"
    description="Paste a public YouTube or YouTube Music URL to fetch direct media files and playlist assets."
    modes={modes}
    defaultMode="video"
    />
  </PageShell>
);

export default YouTube;
