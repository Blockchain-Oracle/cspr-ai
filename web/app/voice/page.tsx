'use client';

import * as React from 'react';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Sparkles, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { VOICE_AGENT_CONFIG, AGENT_INSTRUCTIONS, ERROR_MESSAGES, detectUserIntent } from '@/lib/voice/agent-config';
import {
  fetchMcpTools,
  convertMcpToolToOpenAI,
  executeMcpTool,
  requiresApproval,
  isFinancialOperation,
  formatToolResultForVoice,
  getToolDescription,
  closeMcpSession,
  type McpTool,
  type OpenAIFunction,
} from '@/lib/voice/mcp-integration';

/**
 * Voice session states
 */
type VoiceSessionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Voice status for UI feedback
 */
type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'muted';

/**
 * Transcript message
 */
interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Voice Page Component
 *
 * Main voice interface for CSPR.AI voice assistant.
 * Uses OpenAI Realtime API with WebRTC for voice-to-voice conversation.
 */
export default function VoicePage() {
  // Session state
  const [sessionState, setSessionState] = React.useState<VoiceSessionState>('disconnected');
  const [voiceStatus, setVoiceStatus] = React.useState<VoiceStatus>('idle');
  const [error, setError] = React.useState<string | null>(null);

  // Audio state
  const [isMuted, setIsMuted] = React.useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = React.useState(false);

  // Transcript state
  const [transcript, setTranscript] = React.useState<TranscriptMessage[]>([]);
  const transcriptRef = React.useRef<HTMLDivElement>(null);

  // MCP Tools state
  const [mcpTools, setMcpTools] = React.useState<OpenAIFunction[]>([]);
  const [mcpToolsLoading, setMcpToolsLoading] = React.useState(true);
  const [mcpError, setMcpError] = React.useState<string | null>(null);

  // Tool approval state
  const [pendingToolCall, setPendingToolCall] = React.useState<{
    callId: string;
    toolName: string;
    arguments: Record<string, any>;
    description: string;
  } | null>(null);

  // WebRTC refs
  const peerConnectionRef = React.useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = React.useRef<RTCDataChannel | null>(null);
  const audioElementRef = React.useRef<HTMLAudioElement | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);

  // Session timeout ref
  const sessionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  /**
   * Add message to transcript
   */
  const addToTranscript = React.useCallback((role: 'user' | 'assistant', content: string) => {
    const message: TranscriptMessage = {
      id: `${Date.now()}-${Math.random()}`,
      role,
      content,
      timestamp: new Date(),
    };

    setTranscript(prev => [...prev, message]);

    // Auto-scroll to bottom
    setTimeout(() => {
      transcriptRef.current?.scrollTo({
        top: transcriptRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 100);
  }, []);

  /**
   * Load MCP tools on mount
   */
  React.useEffect(() => {
    const loadMcpTools = async () => {
      try {
        setMcpToolsLoading(true);
        setMcpError(null);

        const serverUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3001/mcp';
        const tools = await fetchMcpTools(serverUrl);

        // Convert to OpenAI function format
        const openAIFunctions = tools.map(convertMcpToolToOpenAI);
        setMcpTools(openAIFunctions);

        console.log('[MCP] Loaded', openAIFunctions.length, 'tools');
      } catch (error: any) {
        console.error('[MCP] Failed to load tools:', error);
        setMcpError(error.message || 'Failed to load blockchain tools');
      } finally {
        setMcpToolsLoading(false);
      }
    };

    loadMcpTools();
  }, []);

  /**
   * Handle tool approval
   */
  const handleApproveToolCall = React.useCallback(async () => {
    if (!pendingToolCall || !dataChannelRef.current) return;

    try {
      // Execute the tool
      const serverUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3001/mcp';
      const result = await executeMcpTool(
        serverUrl,
        pendingToolCall.toolName,
        pendingToolCall.arguments
      );

      // Format result for voice
      const voiceResponse = formatToolResultForVoice(pendingToolCall.toolName, result);

      // Send function output to Realtime API
      const outputEvent = {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: pendingToolCall.callId,
          output: JSON.stringify(result),
        },
      };
      dataChannelRef.current.send(JSON.stringify(outputEvent));

      // Add to transcript
      addToTranscript('assistant', voiceResponse);

      // Clear pending tool call
      setPendingToolCall(null);
    } catch (error: any) {
      console.error('[Tool] Execution failed:', error);
      setError(`Tool execution failed: ${error.message}`);
      setPendingToolCall(null);
    }
  }, [pendingToolCall, addToTranscript]);

  /**
   * Handle tool rejection
   */
  const handleRejectToolCall = React.useCallback(() => {
    if (!pendingToolCall || !dataChannelRef.current) return;

    // Send error response
    const errorEvent = {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: pendingToolCall.callId,
        output: JSON.stringify({ error: 'User rejected the operation' }),
      },
    };
    dataChannelRef.current.send(JSON.stringify(errorEvent));

    // Add to transcript
    addToTranscript('assistant', 'Operation cancelled.');

    // Clear pending tool call
    setPendingToolCall(null);
  }, [pendingToolCall, addToTranscript]);

  /**
   * Request microphone permission
   */
  const requestMicrophonePermission = React.useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      return stream;
    } catch (error: any) {
      console.error('[Voice] Microphone permission denied:', error);
      setError(ERROR_MESSAGES.microphonePermission);
      return null;
    }
  }, []);

  /**
   * Generate ephemeral token from backend
   */
  const generateEphemeralToken = React.useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/voice/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to generate token');
      }

      const data = await response.json();
      return data.token;
    } catch (error: any) {
      console.error('[Voice] Token generation failed:', error);
      setError(ERROR_MESSAGES.tokenGenerationFailed);
      return null;
    }
  }, []);

  /**
   * Connect to voice session
   */
  const connectSession = React.useCallback(async () => {
    try {
      setSessionState('connecting');
      setError(null);

      // Step 1: Request microphone permission
      const stream = await requestMicrophonePermission();
      if (!stream) {
        setSessionState('error');
        return;
      }
      localStreamRef.current = stream;

      // Step 2: Generate ephemeral token
      const token = await generateEphemeralToken();
      if (!token) {
        setSessionState('error');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      // Step 3: Establish WebRTC connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Add local audio track
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle incoming audio
      const audioEl = new Audio();
      audioEl.autoplay = true;
      audioElementRef.current = audioEl;
      pc.addEventListener('track', e => {
        audioEl.srcObject = e.streams[0];
      });

      // Create data channel for events
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      // Send session configuration
      dc.addEventListener('open', () => {
        const sessionUpdate = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: AGENT_INSTRUCTIONS,
            voice: VOICE_AGENT_CONFIG.voice,
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1',
            },
            turn_detection: VOICE_AGENT_CONFIG.turnDetection,
            temperature: VOICE_AGENT_CONFIG.temperature,
            max_response_output_tokens: VOICE_AGENT_CONFIG.maxResponseTokens,
            tools: mcpTools, // Include MCP blockchain tools
            tool_choice: 'auto', // Let AI decide when to use tools
          },
        };
        dc.send(JSON.stringify(sessionUpdate));
        console.log('[Voice] Session configured with', mcpTools.length, 'tools');
      });

      // Handle data channel messages
      dc.addEventListener('message', (e) => {
        try {
          const event = JSON.parse(e.data);
          handleRealtimeEvent(event);
        } catch (error) {
          console.error('[Voice] Failed to parse event:', error);
        }
      });

      // Create and set local offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Exchange SDP with OpenAI Realtime API
      const sdpResponse = await fetch('https://api.openai.com/v1/realtime', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) {
        throw new Error('Failed to establish WebRTC connection');
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      setSessionState('connected');
      setVoiceStatus('listening');
      addToTranscript('assistant', 'Voice session started. How can I help you with Casper blockchain today?');

      // Set session timeout (30 minutes max)
      sessionTimeoutRef.current = setTimeout(() => {
        disconnectSession();
        setError(ERROR_MESSAGES.sessionExpired);
      }, 30 * 60 * 1000);

    } catch (error: any) {
      console.error('[Voice] Connection failed:', error);
      setError(ERROR_MESSAGES.connectionFailed);
      setSessionState('error');
      cleanup();
    }
  }, [requestMicrophonePermission, generateEphemeralToken, addToTranscript, mcpTools]);

  /**
   * Handle Realtime API events
   */
  const handleRealtimeEvent = React.useCallback((event: any) => {
    console.log('[Voice] Event:', event.type);

    switch (event.type) {
      case 'conversation.item.created':
        if (event.item.type === 'message' && event.item.role === 'user') {
          setVoiceStatus('listening');
        } else if (event.item.type === 'function_call') {
          // AI wants to call a tool
          const toolName = event.item.name;
          const toolArgs = event.item.arguments ? JSON.parse(event.item.arguments) : {};
          const callId = event.item.call_id;

          console.log('[Tool] Function call requested:', toolName, toolArgs);

          // Check if approval is required
          if (requiresApproval(toolName)) {
            // Show approval modal
            setPendingToolCall({
              callId,
              toolName,
              arguments: toolArgs,
              description: getToolDescription(toolName, toolArgs),
            });
          } else {
            // Execute immediately for read-only operations
            const serverUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3001/mcp';
            executeMcpTool(
              serverUrl,
              toolName,
              toolArgs
            )
              .then((result) => {
                const voiceResponse = formatToolResultForVoice(toolName, result);

                // Send function output
                if (dataChannelRef.current) {
                  const outputEvent = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: callId,
                      output: JSON.stringify(result),
                    },
                  };
                  dataChannelRef.current.send(JSON.stringify(outputEvent));
                }

                // Add to transcript
                addToTranscript('assistant', voiceResponse);
              })
              .catch((error) => {
                console.error('[Tool] Execution failed:', error);
                if (dataChannelRef.current) {
                  const errorEvent = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: callId,
                      output: JSON.stringify({ error: error.message }),
                    },
                  };
                  dataChannelRef.current.send(JSON.stringify(errorEvent));
                }
              });
          }
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          addToTranscript('user', event.transcript);
        }
        setVoiceStatus('processing');
        break;

      case 'response.audio_transcript.delta':
        setVoiceStatus('speaking');
        break;

      case 'response.audio_transcript.done':
        if (event.transcript) {
          addToTranscript('assistant', event.transcript);
        }
        setVoiceStatus('listening');
        break;

      case 'response.done':
        setVoiceStatus('listening');
        break;

      case 'error':
        console.error('[Voice] Realtime API error:', event.error);
        setError(event.error?.message || 'An error occurred');
        break;

      default:
        break;
    }
  }, [addToTranscript]);

  /**
   * Disconnect voice session
   */
  const disconnectSession = React.useCallback(() => {
    cleanup();
    setSessionState('disconnected');
    setVoiceStatus('idle');
    addToTranscript('assistant', 'Voice session ended.');
  }, [addToTranscript]);

  /**
   * Cleanup resources
   */
  const cleanup = React.useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
      audioElementRef.current = null;
    }

    // Close MCP session
    closeMcpSession().catch(err => {
      console.error('[Voice] Failed to close MCP session:', err);
    });
  }, []);

  /**
   * Toggle microphone mute
   */
  const toggleMute = React.useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        setVoiceStatus(audioTrack.enabled ? 'listening' : 'muted');
      }
    }
  }, []);

  /**
   * Toggle speaker mute
   */
  const toggleSpeaker = React.useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.muted = !audioElementRef.current.muted;
      setIsSpeakerMuted(audioElementRef.current.muted);
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  React.useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  /**
   * Get status indicator styling
   */
  const getStatusIndicator = () => {
    switch (voiceStatus) {
      case 'listening':
        return {
          color: 'bg-primary',
          text: 'Listening',
          ring: 'ring-primary/20',
        };
      case 'processing':
        return {
          color: 'bg-primary/70',
          text: 'Processing',
          ring: 'ring-primary/20',
        };
      case 'speaking':
        return {
          color: 'bg-primary',
          text: 'Speaking',
          ring: 'ring-primary/20',
        };
      case 'muted':
        return {
          color: 'bg-muted-foreground',
          text: 'Muted',
          ring: 'ring-muted-foreground/20',
        };
      default:
        return {
          color: 'bg-border',
          text: 'Idle',
          ring: 'ring-border',
        };
    }
  };

  const statusIndicator = getStatusIndicator();
  const isConnected = sessionState === 'connected';
  const isConnecting = sessionState === 'connecting';

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full max-w-6xl mx-auto p-4 md:p-6 gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" />
            Voice Assistant
          </h1>
          <p className="text-muted-foreground mt-1">
            Talk naturally with the Casper blockchain
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border bg-card">
          <div className={`relative flex items-center justify-center w-3 h-3 ${statusIndicator.ring} ring-4`}>
            <div className={`w-full h-full rounded-full ${statusIndicator.color} ${isConnected ? 'animate-pulse' : ''}`} />
          </div>
          <span className="text-sm font-medium text-card-foreground">
            {statusIndicator.text}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <Card variant="elevated" className="bg-destructive/10 border-destructive/20">
            <div className="px-4 py-3 flex items-start gap-3">
              <div className="w-1 h-full bg-destructive rounded-full" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0">
        {/* Conversation Transcript */}
        <Card variant="elevated" className="lg:col-span-3 flex flex-col" padding="none">
          <div className="p-6 border-b border-border/50">
            <h2 className="text-lg font-semibold text-card-foreground">Conversation</h2>
          </div>

          <div
            ref={transcriptRef}
            className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 scrollbar-hide"
          >
            {transcript.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3 max-w-md">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Mic className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {isConnected
                      ? 'Start speaking to interact with CSPR.AI...'
                      : 'Connect to start a voice conversation'}
                  </p>
                </div>
              </div>
            ) : (
              transcript.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  } animate-in slide-in-from-bottom duration-200`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-2 ${
                      message.role === 'user'
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Control Panel */}
        <Card variant="elevated" className="lg:col-span-2 flex flex-col" padding="none">
          <div className="p-6 border-b border-border/50">
            <h2 className="text-lg font-semibold text-card-foreground">Controls</h2>
          </div>

          <div className="flex-1 p-6 space-y-4">
            {/* Primary Action Button */}
            {!isConnected && !isConnecting ? (
              <Button
                onClick={connectSession}
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={<Phone className="w-5 h-5" />}
                className="shadow-lg"
              >
                Start Talking
              </Button>
            ) : isConnecting ? (
              <Button
                disabled
                variant="primary"
                size="lg"
                fullWidth
                isLoading
              >
                Connecting...
              </Button>
            ) : (
              <Button
                onClick={disconnectSession}
                variant="destructive"
                size="lg"
                fullWidth
                leftIcon={<PhoneOff className="w-5 h-5" />}
              >
                End Session
              </Button>
            )}

            <div className="h-px bg-border my-4" />

            {/* Secondary Controls */}
            <div className="space-y-3">
              <Button
                onClick={toggleMute}
                disabled={!isConnected}
                variant={isMuted ? "destructive" : "outline"}
                size="md"
                fullWidth
                leftIcon={isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              >
                {isMuted ? 'Unmute Mic' : 'Mute Mic'}
              </Button>

              <Button
                onClick={toggleSpeaker}
                disabled={!isConnected}
                variant={isSpeakerMuted ? "destructive" : "outline"}
                size="md"
                fullWidth
                leftIcon={isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              >
                {isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
              </Button>
            </div>

            {/* Session Info */}
            <div className="mt-auto pt-6 border-t border-border/50 space-y-4">
              {/* MCP Status */}
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-semibold text-card-foreground uppercase tracking-wide">
                    Blockchain Tools
                  </p>
                  {mcpToolsLoading ? (
                    <LoadingSpinner />
                  ) : mcpError ? (
                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                  )}
                </div>
                {mcpToolsLoading ? (
                  <p className="text-xs text-muted-foreground">Loading tools...</p>
                ) : mcpError ? (
                  <p className="text-xs text-destructive">{mcpError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {mcpTools.length} tools available
                  </p>
                )}
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <p>Sessions expire after 5 minutes of inactivity</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <p>Maximum session duration: 30 minutes</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <p>Say "confirm" or "cancel" for transactions</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer Tip */}
      <Card variant="default" className="border-primary/20 bg-primary/5">
        <div className="px-6 py-4 flex items-start gap-4">
          <div className="w-1 h-full bg-primary rounded-full flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-card-foreground">
              <span className="font-semibold">Tip:</span> Use contact names instead of addresses.
              Say <span className="text-primary font-medium">"Send 100 CSPR to Alice"</span> instead
              of speaking the full 66-character address.
            </p>
          </div>
        </div>
      </Card>

      {/* Tool Approval Modal */}
      {pendingToolCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Card variant="elevated" className="w-full max-w-md animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-card-foreground">
                    Approve Transaction
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    The voice assistant wants to perform a blockchain operation
                  </p>
                </div>
              </div>

              {/* Operation Details */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Operation
                  </p>
                  <p className="text-sm font-medium text-card-foreground mt-1">
                    {pendingToolCall.description}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Tool
                  </p>
                  <p className="text-xs font-mono text-card-foreground mt-1">
                    {pendingToolCall.toolName}
                  </p>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-xs text-destructive">
                  Review carefully before approving. This operation may affect your blockchain assets.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleRejectToolCall}
                  variant="outline"
                  size="lg"
                  fullWidth
                  leftIcon={<XCircle className="w-4 h-4" />}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApproveToolCall}
                  variant="primary"
                  size="lg"
                  fullWidth
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                >
                  Approve
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
