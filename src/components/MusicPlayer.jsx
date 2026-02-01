"use client";
import { useState, useRef, useEffect } from "react";

const ScrollingText = ({ content, width = 30, speed = 200 }) => {
  const [offset, setOffset] = useState(0);
  // Add extra padding to ensure smooth looping
  const text = `${content}     `;

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => (prev + 1) % text.length);
    }, speed);
    return () => clearInterval(interval);
  }, [text.length, speed]);

  const getWindow = () => {
    let result = "";
    for (let i = 0; i < width; i++) {
      result += text[(offset + i) % text.length];
    }
    return result;
  };

  return (
    <span
      style={{
        display: 'inline-block',
        width: `${width}ch`,
        whiteSpace: 'pre',
        verticalAlign: 'bottom',
        overflow: 'hidden'
      }}
    >
      {getWindow()}
    </span>
  );
};

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0.3);
  const [currentTime, setCurrentTime] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio("/crimewave.mp3");
    audioRef.current.volume = volume;
    audioRef.current.loop = true;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    let interactionListener = null;

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {
          // Si falla el autoplay (común en navegadores), esperamos la primera interacción
          interactionListener = () => {
            if (audioRef.current) {
              audioRef.current.play().catch(() => { });
            }
            // Eliminar listeners una vez ejecutado
            ["click", "keydown", "touchstart"].forEach((event) =>
              window.removeEventListener(event, interactionListener)
            );
          };

          // Escuchar interacciones para desbloquear el audio context
          ["click", "keydown", "touchstart"].forEach((event) =>
            window.addEventListener(event, interactionListener)
          );
        });

        intervalRef.current = setInterval(() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }, 1000);
      } else {
        audioRef.current.pause();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (interactionListener) {
        ["click", "keydown", "touchstart"].forEach((event) =>
          window.removeEventListener(event, interactionListener)
        );
      }
    };
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const increaseVolume = () => setVolume((v) => Math.min(v + 0.1, 1));
  const decreaseVolume = () => setVolume((v) => Math.max(v - 0.1, 0));

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressBar = () => {
    const width = 20;
    const pos = Math.floor((currentTime / 180) * width);
    const bar = "▓".repeat(pos) + "░".repeat(width - pos);
    return `[${bar}]`;
  };

  return (
    <>
      <div
        className="fixed bottom-4 right-4 z-100 bg-black/90 border border-[#CFFF33] p-2 font-mono text-xs hidden lg:block"
        style={{ color: "#CFFF33", textShadow: "0 0 5px #CFFF33", minWidth: "260px" }}
      >
        <div className="mb-1 whitespace-pre flex items-center">
          <span>~/music_player.sh | </span>
          <ScrollingText
            content={isPlaying ? "[PLAYING] Crimewaves - Crystal Castles" : "[PAUSED]  Crimewaves - Crystal Castles"}
            width={18}
            speed={200}
          />
        </div>
        <div className="mb-1">{progressBar()}</div>
        <div className="mb-1 flex items-center gap-2">
          <span>[{formatTime(currentTime)}]</span>
          <button
            onClick={togglePlay}
            className="hover:bg-[#CFFF33] hover:text-black px-1 cursor-pointer"
          >
            {isPlaying ? "[II]" : "[> ]"}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <span>VOL:</span>
          <button
            onClick={decreaseVolume}
            className="hover:bg-[#CFFF33] hover:text-black px-1 cursor-pointer"
          >
            [-]
          </button>
          <span>{Math.round(volume * 100)}%</span>
          <button
            onClick={increaseVolume}
            className="hover:bg-[#CFFF33] hover:text-black px-1 cursor-pointer"
          >
            [+]
          </button>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-100 lg:hidden bg-black/95 border-t border-[#CFFF33]"
        style={{ color: "#CFFF33", textShadow: "0 0 5px #CFFF33" }}
      >
        {!isExpanded ? (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full p-3 flex items-center justify-between font-mono text-xs"
          >
            <span>{isPlaying ? "[>] Playing" : "[||] Paused"}</span>
            <span>[+]</span>
          </button>
        ) : (
          <div className="p-3 font-mono text-xs">
            <div className="mb-2 flex items-center justify-between">
              <span>~/music_player.sh</span>
              <button
                onClick={() => setIsExpanded(false)}
                className="hover:bg-[#CFFF33] hover:text-black px-2 cursor-pointer"
              >
                [X]
              </button>
            </div>
            <div className="mb-2">{progressBar()}</div>
            <div className="mb-2 flex items-center justify-between">
              <span>[{formatTime(currentTime)}]</span>
              <button
                onClick={togglePlay}
                className="hover:bg-[#CFFF33] hover:text-black px-3 py-1 cursor-pointer text-sm"
              >
                {isPlaying ? "[II]" : "[> ]"}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span>VOL: {Math.round(volume * 100)}%</span>
              <div className="flex gap-2">
                <button
                  onClick={decreaseVolume}
                  className="hover:bg-[#CFFF33] hover:text-black px-2 cursor-pointer"
                >
                  [-]
                </button>
                <button
                  onClick={increaseVolume}
                  className="hover:bg-[#CFFF33] hover:text-black px-2 cursor-pointer"
                >
                  [+]
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
