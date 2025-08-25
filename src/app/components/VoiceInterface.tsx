'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './VoiceInterface.module.css';

interface VoiceInterfaceProps {
  onTranscript: (text: string) => void;
  isProcessing?: boolean;
  onVoiceStateChange?: (isListening: boolean) => void;
}

export default function VoiceInterface({ 
  onTranscript, 
  isProcessing = false,
  onVoiceStateChange 
}: VoiceInterfaceProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Haptic feedback helper
  const triggerHaptic = useCallback((pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
    if (!('vibrate' in navigator)) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30],
      success: [10, 20, 10, 20, 30],
      error: [50, 10, 50, 10, 50]
    };
    
    navigator.vibrate(patterns[pattern]);
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        triggerHaptic('light');
        setPulseAnimation(true);
        if (onVoiceStateChange) onVoiceStateChange(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimText = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimText += transcript;
          }
        }
        
        if (finalTranscript) {
          setTranscript(prev => prev + ' ' + finalTranscript);
          setInterimTranscript('');
          
          // Check for wake word
          if (finalTranscript.toLowerCase().includes('hey estait') || 
              finalTranscript.toLowerCase().includes('okay estait')) {
            setWakeWordActive(true);
            triggerHaptic('success');
            setTimeout(() => setWakeWordActive(false), 2000);
          }
          
          // Auto-submit on complete sentence
          if (finalTranscript.match(/[.!?]$/)) {
            const fullText = transcript + ' ' + finalTranscript;
            onTranscript(fullText.trim());
            setTranscript('');
            triggerHaptic('medium');
          }
        } else {
          setInterimTranscript(interimText);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setPulseAnimation(false);
        triggerHaptic('error');
        if (onVoiceStateChange) onVoiceStateChange(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setPulseAnimation(false);
        if (onVoiceStateChange) onVoiceStateChange(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript, triggerHaptic, onVoiceStateChange]);

  // Initialize audio visualization
  useEffect(() => {
    if (!isListening) return;

    const setupAudioVisualization = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
        
        analyserRef.current.fftSize = 256;
        microphoneRef.current.connect(analyserRef.current);
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        
        const updateVolume = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setVolumeLevel(average / 255);
          
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        };
        
        updateVolume();
      } catch (error) {
        console.error('Error setting up audio visualization:', error);
      }
    };

    setupAudioVisualization();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setTranscript('');
      setInterimTranscript('');
    } else {
      recognitionRef.current.start();
    }
  };

  const handleManualSubmit = () => {
    if (transcript.trim()) {
      onTranscript(transcript.trim());
      setTranscript('');
      setInterimTranscript('');
      triggerHaptic('success');
    }
  };

  return (
    <div className={styles.voiceInterface}>
      {/* Ambient background effect */}
      <div className={`${styles.ambientGlow} ${isListening ? styles.active : ''}`} />
      
      {/* Wake word indicator */}
      {wakeWordActive && (
        <div className={styles.wakeWordIndicator}>
          <span className={styles.wakeWordText}>✨ Estait is listening</span>
        </div>
      )}
      
      {/* Voice visualization */}
      <div className={styles.visualizer}>
        <div className={styles.waveformContainer}>
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={styles.waveformBar}
              style={{
                height: isListening ? `${Math.random() * volumeLevel * 100 + 10}%` : '10%',
                animationDelay: `${i * 0.05}s`
              }}
            />
          ))}
        </div>
        
        {/* Central microphone button */}
        <button
          className={`${styles.micButton} ${isListening ? styles.listening : ''} ${pulseAnimation ? styles.pulse : ''}`}
          onClick={toggleListening}
          disabled={isProcessing}
        >
          <div className={styles.micIconContainer}>
            {isListening ? (
              <svg className={styles.micIcon} viewBox="0 0 24 24" fill="none">
                <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" 
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M19 11a7 7 0 0 1-14 0M12 18v4M8 22h8" 
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="10" className={styles.pulseRing} />
              </svg>
            ) : (
              <svg className={styles.micIcon} viewBox="0 0 24 24" fill="none">
                <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" 
                      fill="currentColor"/>
                <path d="M19 11a7 7 0 0 1-14 0M12 18v4M8 22h8" 
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </div>
          <span className={styles.micLabel}>
            {isListening ? 'Listening...' : 'Tap to speak'}
          </span>
        </button>
      </div>
      
      {/* Transcript display */}
      {(transcript || interimTranscript) && (
        <div className={styles.transcriptContainer}>
          <div className={styles.transcript}>
            <span className={styles.finalText}>{transcript}</span>
            <span className={styles.interimText}>{interimTranscript}</span>
          </div>
          {transcript && (
            <button 
              className={styles.sendButton}
              onClick={handleManualSubmit}
              disabled={isProcessing}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" 
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      )}
      
      {/* Voice command hints */}
      <div className={styles.hints}>
        <div className={styles.hintChip}>Say "Hey Estait" to activate</div>
        <div className={styles.hintChip}>End with "." to send</div>
      </div>
      
      {/* Processing indicator */}
      {isProcessing && (
        <div className={styles.processingOverlay}>
          <div className={styles.processingSpinner}>
            <div className={styles.spinnerRing} />
            <div className={styles.spinnerRing} />
            <div className={styles.spinnerRing} />
          </div>
          <span className={styles.processingText}>Thinking...</span>
        </div>
      )}
    </div>
  );
}