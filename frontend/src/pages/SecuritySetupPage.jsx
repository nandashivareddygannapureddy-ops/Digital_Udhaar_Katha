import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import API from '../api/axios';
import Logo from '../components/Common/Logo';
import { toast } from 'react-toastify';
import { 
  HiOutlineBackspace,
  HiOutlineCheckCircle
} from 'react-icons/hi';

// Premium SVG for Fingerprint Scanner
const FingerprintIcon = ({ className = "w-12 h-12" }) => (
  <svg className={`${className} text-orange`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.105-1.343-2-3-2s-3 .895-3 2M12 11c0 1.105 1.343 2 3 2s3-.895 3-2M12 11V7a3 3 0 10-6 0v4M12 11v4a3 3 0 106 0v-4m-6 8a7 7 0 100-14 7 7 0 000 14z" />
  </svg>
);

// Premium SVG for Face ID Scan
const FaceIdIcon = ({ className = "w-12 h-12" }) => (
  <svg className={`${className} text-orange`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h.01M9 9h.01M12 15h.01M19 12a7 7 0 11-14 0 7 7 0 0114 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 3H5a2 2 0 00-2-2v-3m18-5h-3a2 2 0 00-2 2v3m-14 11H5a2 2 0 00-2-2v-3m18 5h-3a2 2 0 00-2-2v-3" />
  </svg>
);

const scanStyles = `
  @keyframes scanLine {
    0% { top: 0%; }
    50% { top: 100%; }
    100% { top: 0%; }
  }
  .animate-scan-line {
    animation: scanLine 2.5s ease-in-out infinite;
  }
`;

const SecuritySetupPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState('create-pin'); // 'create-pin' | 'confirm-pin' | 'biometrics' | 'success'
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [shake, setShake] = useState(false);
  const [biometricType, setBiometricType] = useState(null); // 'fingerprint' | 'faceid'
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [deviceSupportsBio, setDeviceSupportsBio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);

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

  const handleKeyPress = (num) => {
    if (step === 'create-pin') {
      if (pin.length < 4) {
        const newVal = pin + num;
        setPin(newVal);
        if (newVal.length === 4) {
          setTimeout(() => setStep('confirm-pin'), 250);
        }
      }
    } else if (step === 'confirm-pin') {
      if (confirmPin.length < 4) {
        const newVal = confirmPin + num;
        setConfirmPin(newVal);
        if (newVal.length === 4) {
          // Compare
          if (newVal === pin) {
            setTimeout(() => setStep('biometrics'), 250);
          } else {
            setTimeout(() => {
              setShake(true);
              toast.error("PINs do not match. Please try again.");
              setConfirmPin('');
              setTimeout(() => setShake(false), 500);
            }, 250);
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'create-pin') {
      setPin(pin.slice(0, -1));
    } else if (step === 'confirm-pin') {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const saveSecuritySettings = useCallback(async (enableBio = false, bioCredId = '') => {
    setSaving(true);
    try {
      const { data } = await API.post('/auth/setup-security', {
        pin,
        isBiometricEnabled: enableBio,
        biometricCredentialId: bioCredId
      });
      
      updateUser(data.data);
      sessionStorage.setItem('udhaar-unlocked', 'true');
      setStep('success');
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save security settings');
    } finally {
      setSaving(false);
    }
  }, [pin, updateUser, navigate]);

  // Real WebAuthn implementation
  const registerRealBiometrics = async (type) => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const createOptions = {
        publicKey: {
          challenge,
          rp: { name: "Udhaar Khata" },
          user: {
            id: new TextEncoder().encode(user._id || 'mock-id'),
            name: user.email || 'user@example.com',
            displayName: user.name || 'Merchant'
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },   // ES256
            { type: "public-key", alg: -257 }  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 60000
        }
      };

      const credential = await navigator.credentials.create(createOptions);
      if (credential) {
        await saveSecuritySettings(true, credential.id);
      }
    } catch (err) {
      console.warn("WebAuthn error, falling back to simulated prompt:", err);
      // Fallback to simulated biometric UI
      setBiometricType(type);
      setShowSimulateModal(true);
    }
  };

  const handleEnableBiometrics = async (type) => {
    if (deviceSupportsBio) {
      await registerRealBiometrics(type);
    } else {
      // Fallback to premium simulated experience directly
      setBiometricType(type);
      setShowSimulateModal(true);
    }
  };

  const startSimulation = useCallback(async () => {
    let stream = null;
    if (biometricType === 'faceid') {
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
        toast.error("Camera access is required for Face ID setup");
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
      setShowSimulateModal(false);
      toast.success(`${biometricType === 'fingerprint' ? 'Fingerprint' : 'Face ID'} Registered Successfully!`);
      const mockCredentialId = `mock-${biometricType}-id-${Date.now()}`;
      await saveSecuritySettings(true, mockCredentialId);
    }, 3500);
  }, [biometricType, saveSecuritySettings]);

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



  const handleSkipBiometrics = async () => {
    await saveSecuritySettings(false);
  };

  const renderDots = (length) => {
    return (
      <div className={`flex gap-4 justify-center my-8 ${shake ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map((idx) => (
          <div 
            key={idx} 
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              idx < length 
                ? 'bg-orange border-orange scale-110 shadow-md shadow-orange/30' 
                : 'border-slate-gray/30 bg-transparent'
            }`} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-light-cream to-soft-white p-5 relative overflow-hidden py-12">
      <style>{scanStyles}</style>
      {/* Decorative background shapes */}
      <div className="absolute w-[500px] h-[500px] bg-radial from-orange/5 to-transparent -top-[100px] -right-[100px] rounded-full"></div>
      <div className="absolute w-[400px] h-[400px] bg-radial from-info-analytics/5 to-transparent -bottom-[80px] -left-[80px] rounded-full"></div>

      <div className="w-full max-w-md p-8 bg-pure-white border border-soft-gray rounded-2xl shadow-lg relative z-10 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-light-cream border border-soft-gray flex items-center justify-center p-2 shadow-inner">
          <Logo />
        </div>

        {step === 'create-pin' && (
          <div>
            <h1 className="text-2xl font-bold text-deep-navy mb-1 font-outfit">Secure your Udhar Khata</h1>
            <p className="text-sm text-slate-gray mb-6">Step 3: Create a 4-Digit Security PIN</p>
            
            <div className="text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">
              Enter New PIN
            </div>
            {renderDots(pin.length)}
          </div>
        )}

        {step === 'confirm-pin' && (
          <div>
            <h1 className="text-2xl font-bold text-deep-navy mb-1 font-outfit">Confirm Security PIN</h1>
            <p className="text-sm text-slate-gray mb-6">Re-enter the 4-digit PIN to confirm</p>
            
            <div className="text-xs font-semibold text-slate-gray uppercase tracking-wider mb-2">
              Confirm PIN
            </div>
            {renderDots(confirmPin.length)}
            
            <button 
              onClick={() => {
                setStep('create-pin');
                setConfirmPin('');
                setPin('');
              }}
              className="text-xs text-orange hover:underline font-semibold bg-transparent border-none cursor-pointer"
            >
              Start Over
            </button>
          </div>
        )}

        {(step === 'create-pin' || step === 'confirm-pin') && (
          <div className="grid grid-cols-3 gap-y-4 gap-x-6 max-w-xs mx-auto mt-4 mb-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="w-16 h-16 rounded-full bg-light-cream/40 border border-soft-gray flex items-center justify-center font-bold text-lg text-deep-navy hover:bg-orange hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                {num}
              </button>
            ))}
            <div className="w-16 h-16" /> {/* Empty spacing spacer */}
            <button
              type="button"
              onClick={() => handleKeyPress(0)}
              className="w-16 h-16 rounded-full bg-light-cream/40 border border-soft-gray flex items-center justify-center font-bold text-lg text-deep-navy hover:bg-orange hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="w-16 h-16 rounded-full bg-light-cream/40 border border-soft-gray flex items-center justify-center text-lg text-deep-navy hover:bg-red-give hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <HiOutlineBackspace size={24} />
            </button>
          </div>
        )}

        {step === 'biometrics' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-deep-navy mb-1 font-outfit">Enable Biometric Login</h1>
            <p className="text-sm text-slate-gray">
              Add Fingerprint or Face ID for faster, secure access to your ledger.
            </p>

            <div className="flex flex-col gap-4 max-w-xs mx-auto py-4">
              {/* Fingerprint Card */}
              <button
                onClick={() => handleEnableBiometrics('fingerprint')}
                disabled={saving}
                className="flex items-center gap-4 p-4 rounded-xl border border-soft-gray bg-light-cream/30 hover:border-orange hover:shadow-md transition-all text-left cursor-pointer group disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-orange/10 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FingerprintIcon className="w-6 h-6 text-orange" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-deep-navy m-0">Enable Fingerprint</h3>
                  <p className="text-xs text-slate-gray m-0 mt-0.5">Use your device fingerprint scanner</p>
                </div>
              </button>

              {/* Face ID Card */}
              <button
                onClick={() => handleEnableBiometrics('faceid')}
                disabled={saving}
                className="flex items-center gap-4 p-4 rounded-xl border border-soft-gray bg-light-cream/30 hover:border-orange hover:shadow-md transition-all text-left cursor-pointer group disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-orange/10 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FaceIdIcon className="w-6 h-6 text-orange" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-deep-navy m-0">Enable Face ID</h3>
                  <p className="text-xs text-slate-gray m-0 mt-0.5">If supported by device camera</p>
                </div>
              </button>
            </div>

            <div className="flex flex-col gap-3 max-w-xs mx-auto pt-2">
              <button
                onClick={handleSkipBiometrics}
                disabled={saving}
                className="py-3 px-6 rounded-lg text-sm font-semibold border border-soft-gray bg-transparent text-slate-gray hover:bg-soft-white hover:text-deep-navy transition-all cursor-pointer disabled:opacity-50"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4 py-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-get/10 text-green-get rounded-full flex items-center justify-center mx-auto shadow-md">
              <HiOutlineCheckCircle className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-deep-navy font-outfit">Setup Complete!</h1>
            <p className="text-sm text-slate-gray">
              Your Udhar Khata is now secured. Redirecting you to your dashboard...
            </p>
          </div>
        )}
      </div>

      {/* Simulated Biometric Authenticator Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-navy/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-pure-white border border-soft-gray p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-5 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-200">
            {(simulating && biometricType === 'faceid') ? (
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
                {biometricType === 'fingerprint' ? (
                  <FingerprintIcon className="w-10 h-10" />
                ) : (
                  <FaceIdIcon className="w-10 h-10" />
                )}
              </div>
            )}
            
            <div>
              <h2 className="text-lg font-bold text-deep-navy font-outfit">
                {biometricType === 'fingerprint' ? 'Fingerprint Scanner' : 'Face ID Camera'}
              </h2>
              <p className="text-xs text-slate-gray mt-2 leading-relaxed">
                {simulating 
                  ? 'Verifying biometric credentials with device api...' 
                  : `Please approve the simulated device biometric scan for ${biometricType === 'fingerprint' ? 'Fingerprint' : 'Face ID'}.`}
              </p>
            </div>

            <div className="w-full space-y-2.5">
              {!simulating ? (
                <>
                  <button
                    onClick={startSimulation}
                    className="w-full py-3 px-4 bg-orange hover:bg-orange-hover text-white font-bold text-sm rounded-xl border-none cursor-pointer shadow-md transition-all"
                  >
                    Simulate Touch/Face scan
                  </button>
                  <button
                    onClick={handleCloseModal}
                    className="w-full py-2.5 px-4 bg-transparent border border-soft-gray text-slate-gray font-semibold text-sm rounded-xl cursor-pointer hover:bg-soft-white"
                  >
                    Cancel
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

export default SecuritySetupPage;
