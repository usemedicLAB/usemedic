import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PhoneOff, Loader2 } from "lucide-react";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { useAuth } from "@/hooks/use-auth";

type ConsultationCallProps = {
  roomName: string;
  mode: "voice" | "video";
  participantName: string;
  onEnd: () => void;
};

export function ConsultationCall({ roomName, mode, participantName, onEnd }: ConsultationCallProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-2 sm:p-5">
      <div className="w-full h-full max-w-5xl overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-card)] flex flex-col">
        <div className="relative flex-1 bg-black text-primary-foreground flex flex-col">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 font-semibold">Connecting to {participantName}...</p>
            </div>
          )}
          <JitsiMeeting
            roomName={roomName}
            configOverwrite={{
              startWithAudioMuted: false,
              startWithVideoMuted: mode === "voice",
              disableModeratorIndicator: true,
              prejoinPageEnabled: false,
            }}
            interfaceConfigOverwrite={{
              DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            }}
            userInfo={{
              displayName: user?.user_metadata?.full_name || "User",
            }}
            onApiReady={(externalApi) => {
              setLoading(false);
            }}
            getIFrameRef={(iframeRef) => {
              iframeRef.style.height = "100%";
              iframeRef.style.width = "100%";
            }}
          />
        </div>

        <div className="flex items-center justify-center gap-3 p-4 bg-card">
          <Button onClick={onEnd} variant="destructive" size="lg" className="rounded-full gap-2 font-semibold">
            <PhoneOff className="h-5 w-5" /> End Call
          </Button>
        </div>
      </div>
    </div>
  );
}