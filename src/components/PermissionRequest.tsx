import { useState } from 'react';
import { Mic, Video, AlertCircle, Check, X } from 'lucide-react';

interface PermissionRequestProps {
  isVideoCall: boolean;
  onPermissionsGranted: () => void;
  onCancel: () => void;
}

export default function PermissionRequest({ 
  isVideoCall, 
  onPermissionsGranted, 
  onCancel 
}: PermissionRequestProps) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPermissions = async () => {
    setChecking(true);
    setError(null);

    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera/microphone not available. Please use HTTPS or localhost.');
        setChecking(false);
        return;
      }

      // Request permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideoCall ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      });

      // Stop the stream immediately (we just needed to check permissions)
      stream.getTracks().forEach(track => track.stop());

      // Permissions granted!
      onPermissionsGranted();
    } catch (err: any) {
      console.error('Permission error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Permission denied. Please click "Allow" when your browser asks for camera/microphone access.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera or microphone found. Please check that your devices are connected.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera/microphone is already in use. Please close other apps using them.');
      } else if (err.name === 'OverconstrainedError') {
        setError('Camera/microphone constraints not supported. Try updating your browser.');
      } else {
        setError(`Error: ${err.message || 'Failed to access camera/microphone'}`);
      }
      
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl border border-[#202225] max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center">
            {isVideoCall ? (
              <Video className="w-10 h-10 text-white" />
            ) : (
              <Mic className="w-10 h-10 text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Grant Permissions
          </h2>
          <p className="text-gray-400 text-sm">
            {isVideoCall 
              ? 'This call requires access to your camera and microphone'
              : 'This call requires access to your microphone'
            }
          </p>
        </div>

        {/* Permissions List */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-[#202225] rounded-lg">
            <div className="w-10 h-10 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center">
              <Mic className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm">Microphone Access</div>
              <div className="text-gray-400 text-xs">Required for voice communication</div>
            </div>
            <Check className="w-5 h-5 text-gray-600" />
          </div>

          {isVideoCall && (
            <div className="flex items-center gap-3 p-3 bg-[#202225] rounded-lg">
              <div className="w-10 h-10 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center">
                <Video className="w-5 h-5 text-[#8B5CF6]" />
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold text-sm">Camera Access</div>
                <div className="text-gray-400 text-xs">Required for video call</div>
              </div>
              <Check className="w-5 h-5 text-gray-600" />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-400">{error}</div>
          </div>
        )}

        {/* Info Box */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-xs text-blue-300 leading-relaxed">
            <strong>Note:</strong> Your browser will show a permission popup. 
            Please click "Allow" to enable {isVideoCall ? 'camera and microphone' : 'microphone'} access.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={checking}
            className="flex-1 px-4 py-3 bg-[#202225] text-white rounded-lg font-semibold hover:bg-[#0f0f0f] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={checkPermissions}
            disabled={checking}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white rounded-lg font-semibold hover:from-[#7C3AED] hover:to-[#3b4199] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {checking ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Checking...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Grant Access
              </>
            )}
          </button>
        </div>

        {/* Help Text */}
        <p className="text-center text-xs text-gray-500 mt-4">
          Having trouble? Make sure you're using HTTPS or localhost
        </p>
      </div>
    </div>
  );
}

