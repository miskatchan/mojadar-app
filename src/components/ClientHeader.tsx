"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, User, Volume2, VolumeX } from "lucide-react";
import audioFeedback from "@/lib/audioFeedback";

export default function ClientHeader() {
  const [audioEnabled, setAudioEnabled] = useState(() => audioFeedback.isEnabled());

  const toggleAudio = () => {
    const newState = audioFeedback.toggle();
    setAudioEnabled(newState);
    // Play feedback to demonstrate the change
    if (newState) {
      audioFeedback.play('success');
    }
  };

  return (
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/70 border-b border-gray-200/50 shadow-lg">
      <div className="gradient-teal px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white p-2">
              <Image src="/logo.png" alt="HisabGuru" width={56} height={56} className="object-contain" />
            </div>
            <div className="text-white">
              <h1 className="text-xl font-bold tracking-tight">HisabGuru</h1>
              <p className="text-xs font-medium opacity-90">AI Financial Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href="/notifications" 
              onClick={() => audioFeedback.play('tap')}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all"
            >
              <Bell className="h-5 w-5 text-white" strokeWidth={2.5} />
            </Link>
            <button 
              onClick={toggleAudio}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all"
              title={audioEnabled ? "Mute sounds" : "Enable sounds"}
            >
              {audioEnabled ? (
                <Volume2 className="h-5 w-5 text-white" strokeWidth={2.5} />
              ) : (
                <VolumeX className="h-5 w-5 text-white" strokeWidth={2.5} />
              )}
            </button>
            <button 
              onClick={() => audioFeedback.play('tap')}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all"
            >
              <User className="h-5 w-5 text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
