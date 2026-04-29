import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  Facebook,
  Image as ImageIcon,
  Instagram,
  Link2,
  Play,
  Twitter,
  Youtube,
} from "lucide-react";
import type { PlatformKey } from "@/lib/media";

export type PlatformConfig = {
  key: PlatformKey;
  name: string;
  route: string;
  blurb: string;
  icon: LucideIcon;
};

export const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    key: "tiktok",
    name: "TikTok",
    route: "/tiktok",
    blurb: "No-watermark video, HD, audio, and slideshow support.",
    icon: Play,
  },
  {
    key: "instagram",
    name: "Instagram",
    route: "/instagram",
    blurb: "Reels, posts, carousel images, and stories.",
    icon: Instagram,
  },
  {
    key: "facebook",
    name: "Facebook",
    route: "/facebook",
    blurb: "Public reels, videos, posts, images, and stories.",
    icon: Facebook,
  },
  {
    key: "youtube",
    name: "YouTube",
    route: "/youtube",
    blurb: "Videos, Shorts, audio, playlists, and thumbnails.",
    icon: Youtube,
  },
  {
    key: "twitter",
    name: "X / Twitter",
    route: "/twitter",
    blurb: "Tweet videos, images, and direct media variants.",
    icon: Twitter,
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    route: "/linkedin",
    blurb: "Public posts with video and image extraction.",
    icon: BriefcaseBusiness,
  },
  {
    key: "tinyurl",
    name: "TinyURL",
    route: "/tinyurl",
    blurb: "Resolve short links and create fresh shortened URLs.",
    icon: Link2,
  },
];

export const MEDIA_PLATFORM_CONFIGS = PLATFORM_CONFIGS.filter((platform) => platform.key !== "tinyurl");

export const platformByKey = (key: PlatformKey) =>
  PLATFORM_CONFIGS.find((platform) => platform.key === key);

export const thumbnailIcon = ImageIcon;
