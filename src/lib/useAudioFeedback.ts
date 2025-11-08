"use client";
import { useCallback } from 'react';
import audioFeedback from './audioFeedback';

type FeedbackType = 'tap' | 'type' | 'success' | 'error' | 'delete' | 'swipe';

/**
 * Hook for audio feedback
 * Usage: const playSound = useAudioFeedback();
 *        playSound('tap');
 */
export function useAudioFeedback() {
  const play = useCallback((type: FeedbackType) => {
    audioFeedback.play(type);
  }, []);

  return play;
}

/**
 * HOC to add audio feedback to buttons
 * Usage: <button onClick={withAudio(() => handleClick(), 'tap')}>Click</button>
 */
export function withAudio<T extends any[]>(
  callback: (...args: T) => void,
  feedbackType: FeedbackType = 'tap'
) {
  return (...args: T) => {
    audioFeedback.play(feedbackType);
    callback(...args);
  };
}

/**
 * Hook for input field audio feedback
 */
export function useInputAudio() {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Don't play sound for modifier keys
    if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        audioFeedback.play('delete');
      } else {
        audioFeedback.play('type');
      }
    }
  }, []);

  return handleKeyDown;
}

export default audioFeedback;
