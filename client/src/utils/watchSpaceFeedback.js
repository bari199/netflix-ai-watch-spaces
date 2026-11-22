const SOUND_KEY = "watchspace.soundEnabled";
const VIBRATION_KEY = "watchspace.vibrationEnabled";

let audioContext;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  audioContext ||= new AudioContextClass();
  return audioContext;
};

// Call this from a real user gesture so later Socket.IO notifications can
// play audio even though they arrive outside the browser's user-activation window.
export const unlockWatchSpaceAudio = () => {
  const context = getAudioContext();
  if (context?.state === "suspended") {
    context.resume().catch(() => {});
  }
};

export const playWatchSpaceFeedback = ({ sound = true, vibration = true } = {}) => {
  if (typeof window === "undefined") return;

  if (
    vibration &&
    localStorage.getItem(VIBRATION_KEY) !== "false" &&
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  ) {
    navigator.vibrate(35);
  }

  if (!sound || localStorage.getItem(SOUND_KEY) === "false") return;

  try {
    const context = getAudioContext();
    if (!context) return;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, now);
    oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  } catch (error) {
    console.warn("WatchSpace feedback is unavailable:", error?.message);
  }
};
