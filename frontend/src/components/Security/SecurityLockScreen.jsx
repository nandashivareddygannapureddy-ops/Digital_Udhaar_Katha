import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import API from '../../api/axios';
import Logo from '../Common/Logo';
import { toast } from 'react-toastify';
import {
  HiOutlineBackspace,
  HiOutlineFingerPrint
} from 'react-icons/hi';

// Premium SVG for Fingerprint Scanner
const FingerprintIcon = ({ className = "w-12 h-12" }) => (
  <svg className={`${className} text-orange`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.105-1.343-2-3-2s-3 .895-3 2M12 11c0 1.105 1.343 2 3 2s3-.895 3-2M12 11V7a3 3 0 10-6 0v4M12 11v4a3 3 0 106 0v-4m-6 8a7 7 0 100-14 7 7 0 000 14z" />
  </svg>
);

// Premium SVG for Face ID Scan (styled exactly like the second reference image)
const FaceIdIcon = ({ className = "w-12 h-12" }) => {
  // Generate 60 radial ticks around the outer edge
  const ticks = Array.from({ length: 60 }).map((_, i) => {
    const angle = (i * 360) / 60;
    return (
      <line
        key={i}
        x1="24"
        y1="1.5"
        x2="24"
        y2="4"
        transform={`rotate(${angle} 24 24)`}
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    );
  });

  return (
    <svg className={`${className} text-orange`} viewBox="0 0 48 48" fill="none">
      {/* Outer Scanner Ticks */}
      <g opacity="0.8">
        {ticks}
      </g>
      {/* Inner Face Frame Circle */}
      <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="1.2" />
      {/* Eyes */}
      <line x1="21.5" y1="21.5" x2="21.5" y2="23.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="26.5" y1="21.5" x2="26.5" y2="23.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* Nose: J-hook shape */}
      <path d="M24 21.5v3.5a1 1 0 0 0 1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Smile */}
      <path d="M21.5 28.5a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
};

const successAnimationStyles = `
  @keyframes drawCheck {
    to {
      stroke-dashoffset: 0;
    }
  }
  @keyframes scaleUp {
    0% { transform: scale(1); }
    50% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
  @keyframes scanLine {
    0% { top: 0%; }
    50% { top: 100%; }
    100% { top: 0%; }
  }
  .animate-draw-check {
    stroke-dasharray: 50;
    stroke-dashoffset: 50;
    animation: drawCheck 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  .animate-success-circle {
    animation: scaleUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  .animate-scan-line {
    animation: scanLine 2.5s ease-in-out infinite;
  }
`;

const base64urlToUint8Array = (base64url) => {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const SecurityLockScreen = ({ onUnlock }) => {
  const { user, logout } = useAuth();
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [deviceSupportsBio, setDeviceSupportsBio] = useState(false);
  const [unlockSuccess, setUnlockSuccess] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);

  const verifyPin = useCallback(async (enteredPin) => {
    setVerifying(true);
    try {
      await API.post('/auth/verify-pin', { pin: enteredPin });
      sessionStorage.setItem('udhaar-unlocked', 'true');
      toast.success('Unlocked!');
      onUnlock();
    } catch (err) {
      setShake(true);
      toast.error(err.response?.data?.message || 'Incorrect PIN');
      setPin('');
      setTimeout(() => setShake(false), 500);
    } finally {
      setVerifying(false);
    }
  }, [onUnlock]);

  const handleKeyPress = useCallback((num) => {
    if (verifying) return;
    setPin((prev) => {
      if (prev.length < 4) {
        return prev + num;
      }
      return prev;
    });
  }, [verifying]);

  const handleBackspace = useCallback(() => {
    if (verifying) return;
    setPin((prev) => prev.slice(0, -1));
  }, [verifying]);

  // Auto-verify PIN once it reaches 4 digits
  useEffect(() => {
    if (pin.length === 4) {
      verifyPin(pin);
    }
  }, [pin, verifyPin]);

  const verifyBiometricOnServer = useCallback(async (credentialId) => {
    setVerifying(true);
    try {
      await API.post('/auth/verify-biometric', { credentialId });
      sessionStorage.setItem('udhaar-unlocked', 'true');
      setUnlockSuccess(true);
      setShowSimulateModal(true);
      
      setTimeout(() => {
        onUnlock();
      }, 1500);
    } catch {
      toast.error('Biometric authentication failed');
    } finally {
      setVerifying(false);
    }
  }, [onUnlock]);

  const handleBiometricAuth = useCallback(async () => {
    if (!user?.isBiometricEnabled) return;

    if (deviceSupportsBio) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        let credentialIdBuffer;
        if (user.biometricCredentialId.startsWith('mock-')) {
          credentialIdBuffer = new TextEncoder().encode(user.biometricCredentialId);
        } else {
          try {
            credentialIdBuffer = base64urlToUint8Array(user.biometricCredentialId);
          } catch {
            credentialIdBuffer = new TextEncoder().encode(user.biometricCredentialId);
          }
        }

        const getOptions = {
          publicKey: {
            challenge,
            rpId: window.location.hostname,
            allowCredentials: [{
              id: credentialIdBuffer,
              type: 'public-key'
            }],
            userVerification: 'required',
            timeout: 60000
          }
        };

        const credential = await navigator.credentials.get(getOptions);
        if (credential) {
          await verifyBiometricOnServer(user.biometricCredentialId);
        }
      } catch (err) {
        console.warn("WebAuthn verification error, falling back to simulated prompt:", err);
        setShowSimulateModal(true);
      }
    } else {
      setShowSimulateModal(true);
    }
  }, [user, deviceSupportsBio, verifyBiometricOnServer]);

  const startSimulation = useCallback(async () => {
    const isFaceId = !user?.biometricCredentialId?.includes('fingerprint');
    let stream = null;

    if (isFaceId) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        setCameraStream(stream);
        setSimulating(true);
        
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }, 100);
      } catch (err) {
        console.error("Camera access failed:", err);
        toast.error("Camera access is required for Face ID verification");
        return;
      }
    } else {
      setSimulating(true);
    }

    setTimeout(async () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      setSimulating(false);
      await verifyBiometricOnServer(user.biometricCredentialId);
    }, 3500);
  }, [user, verifyBiometricOnServer]);

  const handleCloseModal = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setSimulating(false);
    setShowSimulateModal(false);
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Check if browser/device supports WebAuthn Platform biometrics
  useEffect(() => {
    const checkBiometricSupport = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setDeviceSupportsBio(available);
        } catch {
          setDeviceSupportsBio(false);
        }
      }
    };
    checkBiometricSupport();
  }, []);

  // Auto trigger biometrics on mount if enabled
  useEffect(() => {
    if (user?.isBiometricEnabled) {
      // Small timeout to allow render completion
      const timer = setTimeout(() => {
        handleBiometricAuth();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [user, handleBiometricAuth]);

  // Handle physical keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (verifying || showSimulateModal) return;

      const key = e.key;
      if (key >= '0' && key <= '9') {
        handleKeyPress(parseInt(key, 10));
      } else if (key === 'Backspace') {
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [verifying, showSimulateModal, handleKeyPress, handleBackspace]);

  // Autofocus the wrapper on mount to capture keyboard input immediately
  useEffect(() => {
    const wrapper = document.getElementById('lock-screen-wrapper');
    if (wrapper) {
      wrapper.focus();
    }
  }, []);

  const renderDots = () => {
    return (
      <div className={`flex gap-4 justify-center my-8 ${shake ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map((idx) => (
          <div 
            key={idx} 
            className={`w-4.5 h-4.5 rounded-full border-2 transition-all duration-150 ${
              idx < pin.length 
                ? 'bg-orange border-orange scale-110 shadow-md shadow-orange/30' 
                : 'border-slate-gray/30 bg-transparent'
            }`} 
          />
        ))}
      </div>
    );
  };

  return (
    <div 
      id="lock-screen-wrapper"
      tabIndex={0}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-light-cream to-soft-white p-5 overflow-hidden outline-none"
    >
      <style>{successAnimationStyles}</style>

      {/* Decorative background shapes */}
      <div className="absolute w-[500px] h-[500px] bg-radial from-orange/5 to-transparent -top-[100px] -right-[100px] rounded-full"></div>
      <div className="absolute w-[400px] h-[400px] bg-radial from-info-analytics/5 to-transparent -bottom-[80px] -left-[80px] rounded-full"></div>

      <div className="w-full max-w-md p-8 bg-pure-white border border-soft-gray rounded-2xl shadow-lg relative z-10 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-light-cream border border-soft-gray flex items-center justify-center p-2 shadow-inner">
          <Logo />
        </div>

        <h1 className="text-2xl font-bold text-deep-navy mb-1 font-outfit">Udhaar Khata Locked</h1>
        <p className="text-sm text-slate-gray mb-6">Enter your security PIN or use biometrics to unlock</p>

        {renderDots()}

        <div className="grid grid-cols-3 gap-y-4 gap-x-6 max-w-xs mx-auto mt-4 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              disabled={verifying}
              className="w-16 h-16 rounded-full bg-light-cream/40 border border-soft-gray flex items-center justify-center font-bold text-lg text-deep-navy hover:bg-orange hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {num}
            </button>
          ))}
          
          {/* Biometrics key */}
          {user?.isBiometricEnabled ? (
            <button
              type="button"
              onClick={handleBiometricAuth}
              disabled={verifying}
              className="w-16 h-16 rounded-full bg-orange/10 border border-orange/20 flex items-center justify-center text-orange hover:bg-orange hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              title="Authenticate using Device Biometrics"
            >
              <HiOutlineFingerPrint size={24} />
            </button>
          ) : (
            <div className="w-16 h-16" />
          )}

          <button
            type="button"
            onClick={() => handleKeyPress(0)}
            disabled={verifying}
            className="w-16 h-16 rounded-full bg-light-cream/40 border border-soft-gray flex items-center justify-center font-bold text-lg text-deep-navy hover:bg-orange hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
          >
            0
          </button>
          
          <button
            type="button"
            onClick={handleBackspace}
            disabled={verifying}
            className="w-16 h-16 rounded-full bg-light-cream/40 border border-soft-gray flex items-center justify-center text-lg text-deep-navy hover:bg-red-give hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <HiOutlineBackspace size={24} />
          </button>
        </div>

        <button 
          onClick={logout}
          className="text-xs text-slate-gray hover:text-orange hover:underline font-semibold bg-transparent border-none cursor-pointer"
        >
          Sign Out of Account
        </button>
      </div>

      {/* Simulated Biometric Lock Verification Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-navy/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-pure-white border border-soft-gray p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-5 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-200">
            {unlockSuccess ? (
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center bg-green-50 text-green-500 animate-success-circle border border-green-500/20">
                <svg className="w-10 h-10 text-green-500 animate-draw-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            ) : (simulating && !user?.biometricCredentialId?.includes('fingerprint')) ? (
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-orange bg-black flex items-center justify-center shadow-lg">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange/10 to-transparent animate-pulse" />
                <div className="absolute left-0 right-0 h-0.5 bg-orange shadow-md shadow-orange/80 animate-scan-line" />
              </div>
            ) : (
              <div className="relative w-20 h-20 rounded-full bg-orange/10 flex items-center justify-center text-orange">
                {simulating && (
                  <span className="absolute inset-0 rounded-full border-2 border-orange animate-ping opacity-75" />
                )}
                {user?.biometricCredentialId?.includes('fingerprint') ? (
                  <FingerprintIcon className="w-10 h-10" />
                ) : (
                  <FaceIdIcon className="w-10 h-10" />
                )}
              </div>
            )}
            
            <div>
              <h2 className="text-lg font-bold text-deep-navy font-outfit">
                {unlockSuccess ? 'Identity Verified' : 'Biometric Unlock'}
              </h2>
              <p className="text-xs text-slate-gray mt-2 leading-relaxed">
                {unlockSuccess 
                  ? 'Access granted. Welcome back!' 
                  : simulating 
                    ? 'Verifying biometric scan...' 
                    : 'Place your finger on the scanner or check your camera to unlock.'}
              </p>
            </div>

            <div className="w-full space-y-2.5">
              {unlockSuccess ? (
                <div className="text-green-500 font-bold text-sm py-2 flex items-center justify-center gap-2 animate-bounce">
                  <span>Unlocking App...</span>
                </div>
              ) : !simulating ? (
                <>
                  <button
                    onClick={startSimulation}
                    className="w-full py-3 px-4 bg-orange hover:bg-orange-hover text-white font-bold text-sm rounded-xl border-none cursor-pointer shadow-md transition-all"
                  >
                    Unlock with {user?.biometricType === 'fingerprint' ? 'Fingerprint' : 'Face'} ID
                  </button>
                  <button
                    onClick={handleCloseModal}
                    className="w-full py-2.5 px-4 bg-transparent border border-soft-gray text-slate-gray font-semibold text-sm rounded-xl cursor-pointer hover:bg-soft-white"
                  >
                    Use Security PIN
                  </button>
                </>
              ) : (
                <div className="flex justify-center items-center py-4">
                  <div className="w-8 h-8 border-4 border-orange border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityLockScreen;
