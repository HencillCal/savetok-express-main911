import { Book, Video, Play } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { MediaDownloaderPage, type DownloaderMode } from "@/components/site/MediaDownloaderPage";

const matchesCourse = (value: string) => /https?:\/\/(?:www\.)?udemy\.com\/course\//i.test(value);
const matchesLecture = (value: string) => /https?:\/\/(?:www\.)?udemy\.com\/course\/[\w-]+\/learn\/lecture\//i.test(value);

const modes: DownloaderMode[] = [
  {
    id: "preview",
    label: "Preview",
    description: "Public preview lectures (free to watch)",
    icon: Play,
    placeholder: "https://www.udemy.com/course/slug/learn/lecture/12345",
    expectedHint: "udemy.com/course/.../learn/lecture/...",
    matches: matchesLecture,
  },
  {
    id: "course",
    label: "Course",
    description: "Course page — lists preview assets; owner-only downloads need credentials",
    icon: Book,
    placeholder: "https://www.udemy.com/course/slug/",
    expectedHint: "udemy.com/course/...",
    matches: matchesCourse,
  },
  {
    id: "owner",
    label: "Owner",
    description: "Instructor / owner access (requires Udemy API token)",
    icon: Video,
    placeholder: "https://www.udemy.com/course/slug/",
    expectedHint: "udemy.com/course/... (requires credentials)",
    matches: matchesCourse,
  },
];

const Udemy = () => (
  <PageShell>
    <MediaDownloaderPage
      platform="udemy"
      functionName="udemy-download"
      badge="Udemy downloader"
      title="Download Udemy preview videos and course assets"
      description="Paste a Udemy course or lecture URL. Public preview videos are extracted automatically. Owner/purchased content requires API credentials."
      modes={modes}
      defaultMode="preview"
    />
  </PageShell>
);

export default Udemy;
