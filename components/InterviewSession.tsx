import React, { useEffect, useRef, useState } from 'react';
import { GeminiLiveService, GeminiChatService } from '../services/geminiService';
import { DeepResearchData, LogMessage, InterviewMode } from '../types';
import { arrayBufferToBase64, float32ToInt16, pcmToAudioBuffer, base64ToUint8Array } from '../utils/audioUtils';

interface InterviewSessionProps {
  config: DeepResearchData;
  onComplete: (transcript: string) => void;
}

const InterviewSession: React.FC<InterviewSessionProps> = ({ config, onComplete }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'finished'>('idle');
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [inputText, setInputText] = useState('');
  
  // Refs for Audio Handling
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null); 
  const bufferSourceRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Service Refs
  const liveServiceRef = useRef<GeminiLiveService | null>(null);
  const chatServiceRef = useRef<GeminiChatService | null>(null);
  
  const nextStartTimeRef = useRef<number>(0);
  const logsRef = useRef<LogMessage[]>([]); 

  // Canvas Ref for Visualizer
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * Appends or creates a log entry. 
   * For streaming (Voice mode), it merges consecutive fragments from the same role.
   */
  const handleStreamingLog = (role: 'user' | 'model' | 'system', text: string) => {
    setLogs(prev => {
      // If the last log is from the same person, append the text instead of a new line
      if (prev.length > 0 && prev[prev.length - 1].role === role && role !== 'system') {
        const lastLog = prev[prev.length - 1];
        // Ensure we don't double-space if fragments already have them
        const needsSpace = lastLog.text.length > 0 && !lastLog.text.endsWith(' ') && !text.startsWith(' ');
        const updatedText = lastLog.text + (needsSpace ? ' ' : '') + text;
        
        const newLogs = [...prev.slice(0, -1), { ...lastLog, text: updatedText }];
        logsRef.current = newLogs;
        return newLogs;
      }
      
      const newLog = { role, text, timestamp: Date.now() };
      const newLogs = [...prev, newLog];
      logsRef.current = newLogs;
      return newLogs;
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        void handleDisconnect();
    };
  }, []);

  const handleStart = async () => {
    setStatus('connecting');
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
        handleStreamingLog('system', 'API Key missing');
        setStatus('error');
        return;
    }

    if (config.mode === InterviewMode.VOICE) {
        await startVoiceSession();
    } else {
        await startTextSession();
    }
  };

  const startTextSession = async () => {
    try {
        chatServiceRef.current = new GeminiChatService(config);
        await chatServiceRef.current.start((initialMsg) => {
             handleStreamingLog('model', initialMsg);
        });
        setStatus('connected');
    } catch (err) {
        console.error(err);
        setStatus('error');
        handleStreamingLog('system', `Error: ${err}`);
    }
  };

  const startVoiceSession = async () => {
    try {
        liveServiceRef.current = new GeminiLiveService(config);

        // 1. Setup Audio Context
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
        
        // Setup Analyzer for Visualizer
        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 256;

        // 2. Connect to Gemini Live
        handleStreamingLog('system', 'Connecting to Gemini Live...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;

        await liveServiceRef.current.connect(
            // On Audio Data (from Model)
            async (base64Audio) => {
                if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
                
                const ctx = audioContextRef.current;
                const rawBytes = base64ToUint8Array(base64Audio);
                const buffer = pcmToAudioBuffer(rawBytes, ctx);
                
                const source = ctx.createBufferSource();
                bufferSourceRef.current.add(source);
                source.buffer = buffer;
                source.connect(ctx.destination);
                
                if (analyzerRef.current) {
                  source.connect(analyzerRef.current);
                }

                const currentTime = ctx.currentTime;
                const startTime = Math.max(currentTime, nextStartTimeRef.current);
                source.start(startTime);
                nextStartTimeRef.current = startTime + buffer.duration;
                source.onended = () => {
                   bufferSourceRef.current.delete(source);
                };
            },
            // On Transcript (Handles both user and model fragments)
            (text, isUser) => {
                handleStreamingLog(isUser ? 'user' : 'model', text);
            },
            () => {
              setStatus('finished');
            }
        );

        setStatus('connected');
        handleStreamingLog('system', 'Connected. Listening...');

        // 3. Setup Microphone Input Stream
        const inputCtx = new AudioContextClass({ sampleRate: 16000 });
        const source = inputCtx.createMediaStreamSource(stream);
        
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
            if (isMuted || statusRef.current !== 'connected') return;

            const inputData = e.inputBuffer.getChannelData(0);
            const pcmInt16 = float32ToInt16(inputData);
            const base64Data = arrayBufferToBase64(pcmInt16.buffer);
            
            liveServiceRef.current?.sendAudioChunk(base64Data);
        };

        source.connect(processor);
        processor.connect(inputCtx.destination); 

    } catch (err) {
        console.error(err);
        setStatus('error');
        handleStreamingLog('system', `Error: ${err}`);
    }
  };

  // Status Ref Hack for closure
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  // Visualizer Loop
  useEffect(() => {
    if (status !== 'connected' || config.mode === InterviewMode.TEXT) return;
    let animationFrameId: number;

    const render = () => {
      if (!canvasRef.current || !analyzerRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyzerRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyzerRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        const r = barHeight + 25 * (i / bufferLength);
        const g = 250 * (i / bufferLength);
        const b = 50;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [status, config.mode]);


  const handleDisconnect = async () => {
    if (liveServiceRef.current) {
        await liveServiceRef.current.disconnect();
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
            await audioContextRef.current.close();
        } catch (e) {
            console.warn("Error closing AudioContext", e);
        }
        audioContextRef.current = null;
    }
    bufferSourceRef.current.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    bufferSourceRef.current.clear();
  };

  const handleFinish = async () => {
    await handleDisconnect();
    setStatus('finished');
    const fullTranscript = logsRef.current
        .filter(l => l.role !== 'system')
        .map(l => `${l.role.toUpperCase()}: ${l.text}`)
        .join('\n');
    onComplete(fullTranscript);
  };

  const sendTextMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim() || !chatServiceRef.current) return;
      
      const text = inputText;
      setInputText('');
      handleStreamingLog('user', text);

      try {
          let fullResponse = "";
          await chatServiceRef.current.sendMessage(text, (chunk) => {
             fullResponse += chunk;
          });
          handleStreamingLog('model', fullResponse);
      } catch (err) {
          console.error(err);
      }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-slate-900/80 p-4 rounded-xl border border-slate-700 backdrop-blur">
            <div>
                <h2 className="text-xl font-bold text-slate-100">Live Interview</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></span>
                    <span className="text-xs text-slate-400 uppercase tracking-wider">{status === 'idle' ? 'Ready to Start' : status}</span>
                </div>
            </div>
            <div className="text-right text-xs text-slate-500 hidden md:block">
                Context: {config.challenge} <br/> Mode: {config.mode}
            </div>
        </div>

        {/* Start Overlay */}
        {status === 'idle' && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-2xl">
                <button 
                    onClick={handleStart}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-6 px-12 rounded-full text-xl shadow-[0_0_50px_rgba(79,70,229,0.5)] transition-all transform hover:scale-105"
                >
                    Start Interview
                </button>
             </div>
        )}

        {/* Voice Visualizer Area */}
        {config.mode === InterviewMode.VOICE && (
            <div className="flex-1 flex flex-col items-center justify-center relative mb-6 min-h-[250px] bg-slate-950 rounded-2xl border border-slate-800 shadow-inner overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950"></div>
                
                {/* Center Orb */}
                <div className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${status === 'connected' ? 'shadow-[0_0_50px_rgba(79,70,229,0.3)]' : ''}`}>
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c-1.7 0-3 1.2-3 2.6v6.8c0 1.4 1.3 2.6 3 2.6s3-1.2 3-2.6V4.6C15 3.2 13.7 2 12 2z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
                    </div>
                    {/* Rings */}
                    <div className={`absolute inset-0 border-2 border-indigo-500/30 rounded-full ${status === 'connected' ? 'animate-ping' : ''}`}></div>
                </div>

                <div className="absolute bottom-4 text-slate-500 text-sm font-medium animate-pulse">
                    {status === 'connected' ? "Listening... Say 'Hello' to begin." : ""}
                </div>

                <canvas ref={canvasRef} width="600" height="200" className="absolute bottom-0 w-full h-32 opacity-50 pointer-events-none" />
            </div>
        )}

        {/* Transcript Log (Scrollable) */}
        <div className={`flex-1 overflow-y-auto bg-slate-900/50 rounded-xl p-4 mb-6 border border-slate-800 space-y-3 scroll-smooth ${config.mode === InterviewMode.TEXT ? 'min-h-[400px]' : 'max-h-60'}`}>
            {logs.length === 0 && status === 'connected' && <div className="text-slate-500 text-center italic mt-10">Starting conversation...</div>}
            {logs.map((log, i) => (
                <div key={i} className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                        log.role === 'user' 
                        ? 'bg-indigo-900/50 text-indigo-100 border border-indigo-800 shadow-lg shadow-indigo-900/20' 
                        : log.role === 'system'
                        ? 'bg-slate-800 text-slate-400 text-xs text-center w-full italic'
                        : 'bg-slate-800 text-slate-200 border border-slate-700 shadow-lg shadow-black/20'
                    }`}>
                        {log.text}
                    </div>
                </div>
            ))}
            <div ref={scrollRef}></div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4">
             {/* Text Input Area */}
             {config.mode === InterviewMode.TEXT && status === 'connected' && (
                <form onSubmit={sendTextMessage} className="flex gap-2">
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type your answer..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-lg font-bold transition-colors">
                        Send
                    </button>
                </form>
             )}

            <div className="flex justify-center gap-6 mt-2">
                {config.mode === InterviewMode.VOICE && (
                    <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500 shadow-lg shadow-red-900/20' : 'bg-slate-800 text-white hover:bg-slate-700 shadow-lg shadow-black/30'}`}
                    >
                        {isMuted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                        )}
                    </button>
                )}
                
                <button 
                    onClick={handleFinish}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-red-900/30 transition-all flex items-center gap-2"
                >
                    End Interview & Generate Report
                </button>
            </div>
        </div>
    </div>
  );
};

export default InterviewSession;