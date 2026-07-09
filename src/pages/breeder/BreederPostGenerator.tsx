import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Copy, Download, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import { listAllBreederPuppies } from "@/lib/breeder/api";
import { generatePostCopy, type PostCopy } from "@/lib/post-generator";

const ALL_PUPPIES_QK = ["breeder", "allPuppies"] as const;

const PLATFORM_LABELS = {
  facebook: "Facebook Marketplace",
  craigslist: "Craigslist",
  instagram: "Instagram",
  tiktok: "TikTok",
} as const;

export default function BreederPostGenerator() {
  const { puppyId } = useParams<{ puppyId: string }>();
  const navigate = useNavigate();
  const { session } = useBreederAuth();
  const [zipping, setZipping] = useState(false);

  const { data: puppies, isLoading } = useQuery({
    queryKey: ALL_PUPPIES_QK,
    enabled: !!session,
    queryFn: async () => {
      if (!session) throw new Error("No breeder session");
      const res = await listAllBreederPuppies(session.token);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const puppy = useMemo(() => puppies?.find((p) => p.id === puppyId), [puppies, puppyId]);
  const posts = useMemo(() => (puppy ? generatePostCopy(puppy) : null), [puppy]);

  const handleDownloadPhotoPack = async () => {
    if (!puppy?.photos?.length) {
      toast.error("This puppy has no photos yet.");
      return;
    }
    setZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const results = await Promise.allSettled(
        puppy.photos.map(async (url, i) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch photo ${i + 1}`);
          const blob = await res.blob();
          const ext = url.split(".").pop()?.split("?")[0] || "jpg";
          zip.file(`${puppy.name}-${i + 1}.${ext}`, blob);
        })
      );
      const failures = results.filter((r) => r.status === "rejected").length;
      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${puppy.name}-photos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      if (failures > 0) {
        toast.warning(`Photo pack downloaded — ${failures} photo(s) couldn't be fetched.`);
      } else {
        toast.success("Photo pack downloaded");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to build photo pack");
    } finally {
      setZipping(false);
    }
  };

  if (!puppyId) {
    return <div className="p-6 text-sm text-muted-foreground">Missing puppy id.</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!puppy || !posts) {
    return (
      <div className="mx-auto max-w-screen-sm px-4 py-6 text-sm text-muted-foreground">
        Puppy not found.{" "}
        <button type="button" className="underline" onClick={() => navigate("/breeder/puppies")}>
          Back to puppies
        </button>
        .
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-md space-y-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">Generate Post — {puppy.name}</h1>
        <p className="text-sm text-muted-foreground">
          Copy-ready posts for each platform. Nothing is auto-posted — copy and paste yourself.
        </p>
      </header>

      <Button
        variant="outline"
        onClick={handleDownloadPhotoPack}
        disabled={zipping || !puppy.photos?.length}
      >
        <Download className="mr-2 h-4 w-4" />
        {zipping ? "Building photo pack..." : "Download photo pack"}
      </Button>

      {(Object.keys(posts) as (keyof typeof posts)[]).map((platform) => (
        <PlatformCard key={platform} label={PLATFORM_LABELS[platform]} copy={posts[platform]} />
      ))}
    </div>
  );
}

function PlatformCard({ label, copy }: { label: string; copy: PostCopy }) {
  const [copied, setCopied] = useState(false);

  const fullText = [copy.title, copy.body, copy.hashtags.map((h) => `#${h}`).join(" ")]
    .filter(Boolean)
    .join("\n\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success(`${label} copy copied`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">{label}</CardTitle>
        <Button size="sm" variant="outline" onClick={handleCopy}>
          {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
          Copy
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="font-semibold">{copy.title}</p>
        <p className="whitespace-pre-line text-muted-foreground">{copy.body}</p>
        {copy.hashtags.length > 0 && (
          <p className="text-primaryDeep">{copy.hashtags.map((h) => `#${h}`).join(" ")}</p>
        )}
      </CardContent>
    </Card>
  );
}
