const SOUND_KEY = "watchspace.soundEnabled";
const VIBRATION_KEY = "watchspace.vibrationEnabled";

let audioContext;

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

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    audioContext ||= new AudioContextClass();

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

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
