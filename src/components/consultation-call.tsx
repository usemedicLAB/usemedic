import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

type ConsultationCallProps = {
  mode: "voice" | "video";
  participantName: string;
  onEnd: () => void;
};

export function ConsultationCall({ mode, participantName, onEnd }: ConsultationCallProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(mode === "video");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;

    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" });
        if (!live) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setReady(true);
      } catch (mediaError) {
        setError(mediaError instanceof Error ? mediaError.message : "Could not start call");
      }
    }

    startMedia();
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);

    return () => {
      live = false;
      window.clearInterval(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [mode]);

  const time = useMemo(() => {
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
    const seconds = (elapsed % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [elapsed]);

  const toggleMic = () => {
    const next = !micOn;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = next; });
    setMicOn(next);
  };

  const toggleCamera = () => {
    const next = !cameraOn;
    streamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next; });
    setCameraOn(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-5">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-card)]">
        <div className="relative flex aspect-[4/5] items-center justify-center bg-[image:var(--gradient-hero)] text-primary-foreground">
          {mode === "video" && ready && cameraOn ? (
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          ) : (
            <div className="text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary-foreground/15 text-3xl font-bold">
                {participantName.slice(0, 2).toUpperCase()}
              </div>
              <p className="mt-5 text-lg font-semibold">{participantName}</p>
              <p className="mt-1 text-sm opacity-80">{error ? error : ready ? time : "Connecting…"}</p>
            </div>
          )}

          {mode === "video" && ready && cameraOn && (
            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-foreground/70 to-transparent p-4 text-primary-foreground">
              <p className="font-semibold">{participantName}</p>
              <p className="text-xs opacity-80">{time}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 p-5">
          <button onClick={toggleMic} className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground" aria-label={micOn ? "Mute" : "Unmute"}>
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          {mode === "video" && (
            <button onClick={toggleCamera} className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground" aria-label={cameraOn ? "Camera off" : "Camera on"}>
              {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
          )}
          <Button onClick={onEnd} variant="destructive" size="icon" className="h-12 w-12 rounded-full" aria-label="End call">
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}