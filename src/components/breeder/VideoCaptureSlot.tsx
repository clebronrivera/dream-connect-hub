// 10-second video capture using MediaRecorder. Same UX contract as
// PhotoCaptureSlot: the parent owns the value, the slot reports the
// uploaded { path, publicUrl } via onUploaded.
//
// Strategy: prefer in-browser recording with getUserMedia + MediaRecorder
// (gives us a hard 10s stop). If the browser doesn't support it (some
// older mobile Safaris), fall back to <input type="file" accept="video/*"
// capture="environment"> which opens the camera app.
//
// Note: iOS Safari prior to 14.3 didn't ship MediaRecorder. The file-
// picker fallback covers those cases.

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RotateCcw, StopCircle, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadBreederVideo } from "@/lib/breeder/api";
import { useBreederAuth } from "@/hooks/use-breeder-auth";

const MAX_DURATION_MS = 10_000;
const MAX_BYTES = 20_000_000;

export interface VideoCaptureSlotProps {
  label: string;
  subjectId: string;
  value?: string | null;
  onUploaded: (result: { path: string; publicUrl: string } | null) => void;
}

type Phase = "idle" | "recording" | "preview" | "uploading";

export function VideoCaptureSlot({
  label,
  subjectId,
  value,
  onUploaded,
}: VideoCaptureSlotProps) {
  const { session } = useBreederAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(MAX_DURATION_MS / 1000);

  // Object-URL cleanup
  useEffect(() => {
    return () => {
      if (draftUrl) URL.revokeObjectURL(draftUrl);
      stopStreamAndTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStreamAndTimer() {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }

  function browserSupportsRecording(): boolean {
    return (
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function" &&
      typeof window !== "undefined" &&
      typeof window.MediaRecorder !== "undefined"
    );
  }

  function pickMimeType(): string {
    const candidates = [
      "video/mp4",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
        return c;
      }
    }
    return "";
  }

  async function startRecording() {
    setError(null);
    if (!browserSupportsRecording()) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => undefined);
      }
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const finalMime = mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const ext = finalMime.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `puppy-${subjectId}.${ext}`, { type: finalMime.split(";")[0] });
        const url = URL.createObjectURL(blob);
        setDraftFile(file);
        setDraftUrl(url);
        setPhase("preview");
        stopStreamAndTimer();
      };
      recorder.start(250);
      setPhase("recording");

      const startedAt = Date.now();
      const tick = setInterval(() => {
        const remaining = Math.max(0, MAX_DURATION_MS - (Date.now() - startedAt));
        setCountdown(Math.ceil(remaining / 1000));
        if (remaining <= 0) clearInterval(tick);
      }, 200);
      stopTimerRef.current = setTimeout(() => {
        clearInterval(tick);
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, MAX_DURATION_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not access camera");
      stopStreamAndTimer();
      setPhase("idle");
    }
  }

  function stopRecordingEarly() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  function discardDraft() {
    if (draftUrl) URL.revokeObjectURL(draftUrl);
    setDraftFile(null);
    setDraftUrl(null);
    setPhase("idle");
  }

  async function commitDraft() {
    if (!draftFile || !session) return;
    if (draftFile.size > MAX_BYTES) {
      setError(`Video too large (${(draftFile.size / 1_000_000).toFixed(1)}MB > 20MB)`);
      return;
    }
    setPhase("uploading");
    setError(null);
    const res = await uploadBreederVideo({
      token: session.token,
      file: draftFile,
      subjectId,
    });
    if (!res.ok) {
      setError(res.error);
      setPhase("preview");
      return;
    }
    onUploaded(res.data);
    if (draftUrl) URL.revokeObjectURL(draftUrl);
    setDraftFile(null);
    setDraftUrl(null);
    setPhase("idle");
  }

  async function handleFilePicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    if (file.size > MAX_BYTES) {
      setError(`Video too large (${(file.size / 1_000_000).toFixed(1)}MB > 20MB)`);
      return;
    }
    setDraftFile(file);
    setDraftUrl(URL.createObjectURL(file));
    setPhase("preview");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function clearExisting() {
    onUploaded(null);
  }

  // Display the persisted video when present and we're not actively
  // re-recording.
  const showPersisted = !!value && phase === "idle" && !draftFile;

  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-video w-full overflow-hidden rounded-xl border bg-black/90">
        {phase === "recording" && (
          <video
            ref={liveVideoRef}
            muted
            playsInline
            autoPlay
            className="h-full w-full object-cover"
          />
        )}
        {phase === "preview" && draftUrl && (
          <video
            ref={previewVideoRef}
            src={draftUrl}
            playsInline
            controls
            className="h-full w-full object-contain"
          />
        )}
        {phase === "uploading" && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-xs">Uploading…</p>
          </div>
        )}
        {showPersisted && value && (
          <video
            src={value}
            playsInline
            controls
            className="h-full w-full object-contain"
          />
        )}
        {phase === "idle" && !value && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/70">
            <Video className="h-10 w-10" aria-hidden />
            <p className="text-sm">{label}</p>
          </div>
        )}
      </div>

      {phase === "idle" && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant={value ? "outline" : "default"}
            className="h-12 flex-1"
            onClick={startRecording}
          >
            {value ? (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Replace video
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Record 10 seconds
              </>
            )}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearExisting}
              aria-label="Remove video"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {phase === "recording" && (
        <Button
          type="button"
          variant="destructive"
          className="h-12"
          onClick={stopRecordingEarly}
        >
          <StopCircle className="mr-2 h-5 w-5" />
          Stop · {countdown}s
        </Button>
      )}

      {phase === "preview" && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1"
            onClick={discardDraft}
          >
            Retake
          </Button>
          <Button type="button" className="h-12 flex-1" onClick={commitDraft}>
            Use this video
          </Button>
        </div>
      )}

      {phase === "uploading" && (
        <Button type="button" disabled className="h-12">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Uploading…
        </Button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        capture="environment"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => handleFilePicked(e.target.files)}
      />

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
