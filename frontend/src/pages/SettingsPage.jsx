import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import Header from '../components/Layout/Header';
import { toast } from 'react-toastify';
import { HiPlus, HiEye, HiEyeOff } from 'react-icons/hi';
import { HiOutlineFingerPrint } from 'react-icons/hi';
import { 
  FiCloud, 
  FiRefreshCw, 
  FiDownload, 
  FiUpload, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiSmartphone, 
  FiMapPin, 
  FiAlertOctagon,
  FiClock
} from 'react-icons/fi';

// Helper to safely convert raw ASCII SVG to a standard Base64 Data URL
const svgToBase64 = (svgMarkup) => {
  return `data:image/svg+xml;base64,${btoa(svgMarkup.trim())}`;
};

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

const FingerprintIcon = ({ className = "w-12 h-12" }) => (
  <svg className={`${className} text-orange`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.105-1.343-2-3-2s-3 .895-3 2M12 11c0 1.105 1.343 2 3 2s3-.895 3-2M12 11V7a3 3 0 10-6 0v4M12 11v4a3 3 0 106 0v-4m-6 8a7 7 0 100-14 7 7 0 000 14z" />
  </svg>
);

const FaceIdIcon = ({ className = "w-12 h-12" }) => {
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
      <g opacity="0.8">
        {ticks}
      </g>
      <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="1.2" />
      <line x1="21.5" y1="21.5" x2="21.5" y2="23.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="26.5" y1="21.5" x2="26.5" y2="23.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M24 21.5v3.5a1 1 0 0 0 1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.5 28.5a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
};

const FaceBiometricGrid = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    {/* Concentric target circles */}
    <div className="absolute w-24 h-24 rounded-full border border-dashed border-orange/40 animate-[spin_20s_linear_infinite]" />
    <div className="absolute w-28 h-28 rounded-full border border-dashed border-orange/20 animate-[spin_30s_linear_infinite_reverse]" />
    {/* Scanner target corners */}
    <div className="absolute inset-0 p-3 flex flex-col justify-between">
      <div className="flex justify-between">
        <div className="w-3 h-3 border-t-2 border-l-2 border-orange/70" />
        <div className="w-3 h-3 border-t-2 border-r-2 border-orange/70" />
      </div>
      <div className="flex justify-between">
        <div className="w-3 h-3 border-b-2 border-l-2 border-orange/70" />
        <div className="w-3 h-3 border-b-2 border-r-2 border-orange/70" />
      </div>
    </div>
  </div>
);

const scanStyles = `
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

const storeSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#E0F2FE"/>
  <rect x="25" y="55" width="50" height="25" rx="2" fill="#0EA5E9"/>
  <path d="M20 45h60l-5 12H25l-5-12z" fill="#0284C7"/>
  <path d="M20 45l5-8h50l5 8H20z" fill="#0369A1"/>
  <rect x="42" y="62" width="16" height="18" rx="1" fill="#F8FAFC"/>
  <circle cx="46" cy="71" r="1.5" fill="#64748B"/>
  <rect x="29" y="62" width="10" height="10" rx="1" fill="#38BDF8"/>
  <rect x="61" y="62" width="10" height="10" rx="1" fill="#38BDF8"/>
</svg>
`;

const maleSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#E6F4F1"/>
  <path d="M22 82c0-8 8-15 17-17h22c9 0 17 7 17 15v6H22v-6z" fill="#0D9488"/>
  <rect x="45" y="52" width="10" height="12" fill="#F3B395"/>
  <circle cx="50" cy="42" r="16" fill="#F8C4AD"/>
  <path d="M34 38c2-10 10-14 16-14s14 4 16 14c-1-5-6-8-16-8s-15 3-16 8z" fill="#2E2219"/>
  <path d="M33 38c0-3 3-8 8-10h18c5 2 8 7 8 10v4h-4c-2-3-6-4-10-4s-8 1-10 4h-2v-4z" fill="#2E2219"/>
  <circle cx="45" cy="42" r="1.8" fill="#2E2219"/>
  <circle cx="55" cy="42" r="1.8" fill="#2E2219"/>
  <path d="M47 48.5c1.5 1.5 4.5 1.5 6 0" stroke="#2E2219" stroke-width="1.8" stroke-linecap="round"/>
</svg>
`;

const femaleSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#FDF2F8"/>
  <path d="M22 82c0-8 8-15 17-17h22c9 0 17 7 17 15v6H22v-6z" fill="#EC4899"/>
  <rect x="45" y="52" width="10" height="12" fill="#F3B395"/>
  <circle cx="50" cy="42" r="16" fill="#F8C4AD"/>
  <path d="M34 44c-1-8 4-16 16-16s17 8 16 16c0 10-2 15-4 17-2-6-5-9-12-9s-10 3-12 9c-2-2-4-7-4-17z" fill="#4B3621"/>
  <path d="M34 35c3-6 10-7 16-7s13 1 16 7" stroke="#4B3621" stroke-width="3" stroke-linecap="round"/>
  <circle cx="45" cy="42" r="1.8" fill="#2E2219"/>
  <circle cx="55" cy="42" r="1.8" fill="#2E2219"/>
  <path d="M47 48.5c1.5 1.5 4.5 1.5 6 0" stroke="#2E2219" stroke-width="1.8" stroke-linecap="round"/>
</svg>
`;

const ledgerSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#FFFBEB"/>
  <rect x="30" y="28" width="40" height="48" rx="4" fill="#F59E0B"/>
  <rect x="34" y="28" width="36" height="48" rx="2" fill="#D97706"/>
  <rect x="26" y="34" width="8" height="3" rx="1.5" fill="#9CA3AF"/>
  <rect x="26" y="44" width="8" height="3" rx="1.5" fill="#9CA3AF"/>
  <rect x="26" y="54" width="8" height="3" rx="1.5" fill="#9CA3AF"/>
  <rect x="26" y="64" width="8" height="3" rx="1.5" fill="#9CA3AF"/>
  <path d="M44 42h12M44 47h9M49 42c3.5 0 5 2 5 4s-1.5 4-5 4h-4l6 7" stroke="#FFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

const presets = [
  { label: 'Store', value: svgToBase64(storeSvg) },
  { label: 'Male Merchant', value: svgToBase64(maleSvg) },
  { label: 'Female Merchant', value: svgToBase64(femaleSvg) },
  { label: 'Ledger Book', value: svgToBase64(ledgerSvg) }
];

const SettingsPage = () => {
  const { user, updateUser, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [form, setForm] = useState({
    name: user?.name || '',
    storeName: user?.storeName || '',
    phone: user?.phone || '',
    upiId: user?.upiId || '',
    avatar: user?.avatar || '',
  });
  const [saving, setSaving] = useState(false);

  // New features states
  const [trashedCustomers, setTrashedCustomers] = useState([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [loginActivities, setLoginActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [locking, setLocking] = useState(false);

  // Cloud backup states
  const [backingUpCloud, setBackingUpCloud] = useState(false);
  const [restoringCloud, setRestoringCloud] = useState(false);
  const [cloudBackupInfo, setCloudBackupInfo] = useState(null);
  const [loadingCloudBackup, setLoadingCloudBackup] = useState(false);

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: null,
    isDanger: false
  });

  const triggerConfirm = ({ title, message, confirmText, cancelText, onConfirm, isDanger = false }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText: confirmText || 'Proceed',
      cancelText: cancelText || 'Cancel',
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      isDanger
    });
  };

  const fetchTrash = async () => {
    setLoadingTrash(true);
    try {
      const { data } = await API.get('/customers/trash');
      setTrashedCustomers(data.data || []);
    } catch (err) {
      console.error('Failed to fetch trash bin:', err);
    } finally {
      setLoadingTrash(false);
    }
  };

  const fetchLoginActivities = async () => {
    setLoadingActivities(true);
    try {
      const { data } = await API.get('/auth/login-activities');
      setLoginActivities(data.data || []);
    } catch (err) {
      console.error('Failed to fetch login activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchCloudBackupStatus = async () => {
    setLoadingCloudBackup(true);
    try {
      const { data } = await API.get('/backup/status');
      if (data.success && data.hasBackup) {
        setCloudBackupInfo(data.backupInfo);
      } else {
        setCloudBackupInfo(null);
      }
    } catch (err) {
      console.error('Failed to fetch cloud backup status:', err);
    } finally {
      setLoadingCloudBackup(false);
    }
  };

  useEffect(() => {
    fetchTrash();
    fetchLoginActivities();
    fetchCloudBackupStatus();
  }, []);

  const handleRestoreCustomer = async (id) => {
    try {
      const { data } = await API.post(`/customers/${id}/restore`);
      toast.success(data.message || 'Customer restored successfully');
      fetchTrash();
    } catch (err) {
      toast.error('Failed to restore customer');
    }
  };

  const handleCreateBackup = async () => {
    setBackingUp(true);
    try {
      const { data } = await API.post('/backup/create');
      toast.success('Database backup completed successfully.');
      
      const blob = new Blob([JSON.stringify(data.payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || 'udhaar_backup.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to create data backup.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleCreateCloudBackup = async () => {
    setBackingUpCloud(true);
    try {
      const { data } = await API.post('/backup/cloud-create');
      toast.success('Cloud backup created successfully.');
      if (data.success) {
        setCloudBackupInfo(data.backupInfo);
      }
    } catch (err) {
      toast.error('Failed to create cloud backup.');
    } finally {
      setBackingUpCloud(false);
    }
  };

  const handleRestoreCloudBackup = async () => {
    if (!cloudBackupInfo) {
      toast.error('No cloud backup found.');
      return;
    }
    triggerConfirm({
      title: 'Confirm Cloud Restoration',
      message: 'Restoring from cloud backup will overwrite all your current customers, transactions, and cashbook records. This action cannot be undone. Are you sure you want to proceed?',
      confirmText: 'Restore Now',
      isDanger: true,
      onConfirm: async () => {
        setRestoringCloud(true);
        try {
          const { data } = await API.post('/backup/cloud-restore');
          toast.success(`Data restored successfully: ${data.summary.customers} customers restored!`);
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (err) {
          toast.error('Failed to restore cloud backup.');
          setRestoringCloud(false);
        }
      }
    });
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Reset file input value
    e.target.value = '';

    triggerConfirm({
      title: 'Confirm Local Restoration',
      message: 'Restoring from a local backup file will overwrite all your current customers, transactions, and cashbook records. This action cannot be undone. Are you sure you want to proceed?',
      confirmText: 'Restore Now',
      isDanger: true,
      onConfirm: async () => {
        setRestoring(true);
        try {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const backupData = JSON.parse(event.target.result);
              const { data } = await API.post('/backup/restore', { backupData });
              toast.success(`Data restored successfully: ${data.summary.customers} customers restored!`);
              
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            } catch (jsonErr) {
              toast.error('Invalid JSON file format.');
              setRestoring(false);
            }
          };
          reader.readAsText(file);
        } catch (err) {
          toast.error('Failed to restore backup.');
          setRestoring(false);
        }
      }
    });
  };

  const handleEmergencyLock = async () => {
    triggerConfirm({
      title: 'ACTIVATE EMERGENCY LOCK?',
      message: 'This will immediately log out all devices using this account and expire your password. You will need to reset your password via email to log back in. Are you sure you want to proceed?',
      confirmText: 'Activate Lock',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        setLocking(true);
        try {
          await API.post('/auth/emergency-lock');
          toast.success('Emergency Lock Activated! Redirecting...');
          setTimeout(() => {
            logout();
            navigate('/login');
          }, 2000);
        } catch (err) {
          toast.error('Failed to activate Emergency Lock');
          setLocking(false);
        }
      }
    });
  };

  // Security Toggling States
  const [deviceSupportsBio, setDeviceSupportsBio] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // UPI Lock States
  const [isUpiUnlocked, setIsUpiUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [verifyPasswordInput, setVerifyPasswordInput] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [showModalPassword, setShowModalPassword] = useState(false);

  useEffect(() => {
    const checkBiometricSupport = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setDeviceSupportsBio(available);
        } catch (e) {
          setDeviceSupportsBio(false);
        }
      }
    };
    checkBiometricSupport();
  }, []);

  const [unlockSuccess, setUnlockSuccess] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const [showUnlockSimulateModal, setShowUnlockSimulateModal] = useState(false);

  const verifyBiometricOnServer = useCallback(async (credentialId) => {
    setVerifyingPassword(true);
    try {
      await API.post('/auth/verify-biometric', { credentialId });
      setUnlockSuccess(true);
      setShowUnlockSimulateModal(true);
      
      setTimeout(() => {
        setIsUpiUnlocked(true);
        setShowPasswordModal(false);
        setShowUnlockSimulateModal(false);
        setUnlockSuccess(false);
        toast.success('UPI ID settings unlocked');
      }, 1500);
    } catch {
      toast.error('Biometric authentication failed');
    } finally {
      setVerifyingPassword(false);
    }
  }, []);

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
        setShowUnlockSimulateModal(true);
      }
    } else {
      setShowUnlockSimulateModal(true);
    }
  }, [user, deviceSupportsBio, verifyBiometricOnServer]);

  const startUnlockSimulation = useCallback(async () => {
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

  const handleCloseUnlockModal = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setSimulating(false);
    setShowUnlockSimulateModal(false);
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Auto trigger biometrics on mount/open of modal if enabled
  useEffect(() => {
    if (showPasswordModal && user?.isBiometricEnabled) {
      const timer = setTimeout(() => {
        handleBiometricAuth();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showPasswordModal, user, handleBiometricAuth]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await API.put('/auth/me', form);
      updateUser(data.data);
      toast.success(t('profileUpdated'));
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const startSimulation = async () => {
    setSimulating(true);
    setTimeout(async () => {
      setSimulating(false);
      setShowSimulateModal(false);
      try {
        const mockCredentialId = `mock-fingerprint-id-${Date.now()}`;
        const { data } = await API.post('/auth/setup-security', {
          isBiometricEnabled: true,
          biometricCredentialId: mockCredentialId
        });
        updateUser(data.data);
        toast.success('Biometric login enabled (Simulated)');
      } catch (err) {
        toast.error('Failed to enable biometric setting');
      }
    }, 2000);
  };

  const handleToggleBiometrics = async () => {
    if (user?.isBiometricEnabled) {
      try {
        const { data } = await API.post('/auth/setup-security', { isBiometricEnabled: false });
        updateUser(data.data);
        toast.success('Biometric login disabled');
      } catch (err) {
        toast.error('Failed to update biometric setting');
      }
    } else {
      if (deviceSupportsBio) {
        try {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);
          const createOptions = {
            publicKey: {
              challenge,
              rp: { name: "Udhaar Khata" },
              user: {
                id: new TextEncoder().encode(user._id),
                name: user.email,
                displayName: user.name
              },
              pubKeyCredParams: [{ type: "public-key", alg: -7 }],
              authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required"
              },
              timeout: 60000
            }
          };
          const credential = await navigator.credentials.create(createOptions);
          if (credential) {
            const { data } = await API.post('/auth/setup-security', {
              isBiometricEnabled: true,
              biometricCredentialId: credential.id
            });
            updateUser(data.data);
            toast.success('Biometric login enabled');
          }
        } catch (err) {
          console.warn("WebAuthn error, falling back to simulated prompt:", err);
          setShowSimulateModal(true);
        }
      } else {
        // Fallback to simulated prompt directly if device doesn't support WebAuthn
        setShowSimulateModal(true);
      }
    }
  };

  return (
    <>
      <Header title={t('settings')} subtitle={t('manageProfile')} />
      <div className="space-y-6 max-w-xl mx-auto md:mx-0">
        
        {/* Profile Card */}
        <div className="bg-pure-white border border-soft-gray rounded-2xl p-7 shadow-sm">
          <h3 className="text-lg font-bold text-deep-navy mb-5 mt-0">{t('storeProfile')}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Profile Picture Section */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-2">{t('profilePicture')}</label>
              <div className="flex items-center gap-6 p-4 bg-soft-white border border-soft-gray rounded-xl w-full flex-wrap sm:flex-nowrap">
                {/* Avatar Preview */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  <div 
                    className="w-20 h-20 rounded-full bg-pure-white border-2 border-orange flex items-center justify-center overflow-hidden cursor-pointer shadow-sm hover:scale-105 transition-transform"
                    onClick={() => fileInputRef.current.click()}
                  >
                    {form.avatar ? (
                      <img src={form.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-gray font-bold">Upload</span>
                    )}
                  </div>
                  {/* Plus badge */}
                  <div className="absolute bottom-0 right-0 bg-orange w-6 h-6 rounded-full flex items-center justify-center text-white border-2 border-pure-white cursor-pointer shadow pointer-events-none">
                    <HiPlus size={14} />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Presets Selection */}
                <div className="space-y-1.5 flex-1">
                  <span className="text-xs font-bold text-slate-gray mb-1.5 block">
                    {t('selectPresetOrUpload')}
                  </span>
                  <div className="flex gap-3 flex-wrap">
                    {presets.map((p, idx) => {
                      const isSelected = form.avatar === p.value;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setForm({ ...form, avatar: p.value })}
                          className={`w-11 h-11 rounded-full bg-pure-white border cursor-pointer flex items-center justify-center overflow-hidden p-0 transition-all ${
                            isSelected 
                              ? 'border-orange ring-2 ring-orange/20 scale-105' 
                              : 'border-soft-gray hover:border-slate-gray/30'
                          }`}
                        >
                          <img src={p.value} alt={p.label} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('yourName')}</label>
              <input className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('storeName')}</label>
              <input className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('phoneNumber')}</label>
              <input className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('upiId')}</label>
              
              <div className="relative flex items-center">
                <input 
                  type="text"
                  disabled={!isUpiUnlocked}
                  className={`w-full pl-4 pr-12 py-2.5 border rounded-xl text-sm transition-all focus:outline-none ${
                    isUpiUnlocked 
                      ? "bg-pure-white border-soft-gray focus:border-orange" 
                      : "bg-soft-white/60 border-soft-gray/50 text-slate-gray/70 cursor-not-allowed select-none"
                  }`} 
                  value={isUpiUnlocked ? form.upiId : (form.upiId ? "••••••••" + (form.upiId.includes('@') ? form.upiId.substring(form.upiId.indexOf('@')) : '') : 'Not Setup')} 
                  onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                  placeholder="e.g. storeowner@upi"
                  required={isUpiUnlocked}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (isUpiUnlocked) {
                      setIsUpiUnlocked(false);
                    } else {
                      setVerifyPasswordInput('');
                      setShowPasswordModal(true);
                    }
                  }}
                  className="absolute right-3 text-slate-gray/70 hover:text-deep-navy cursor-pointer flex items-center justify-center p-1.5 hover:bg-soft-gray/20 rounded-lg transition-all"
                  title={isUpiUnlocked ? "Hide and Lock UPI ID" : "Show and Edit UPI ID"}
                >
                  {isUpiUnlocked ? <HiEye size={18} className="text-orange" /> : <HiEyeOff size={18} />}
                </button>
              </div>

              {isUpiUnlocked && form.upiId && (
                <div className="p-4 bg-soft-white border border-soft-gray rounded-xl flex flex-col items-center gap-3 mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="bg-pure-white border border-soft-gray/60 p-2.5 rounded-xl shadow-sm">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        `upi://pay?pa=${form.upiId}&pn=${encodeURIComponent(form.storeName || 'Merchant')}&cu=INR`
                      )}`} 
                      alt="Merchant UPI QR Code" 
                      className="w-36 h-36 object-contain block bg-pure-white rounded-lg"
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-deep-navy block">Your Store Payment QR Code</span>
                    <span className="text-[10px] text-slate-gray mt-1 block">Generated for UPI ID: <strong className="text-orange">{form.upiId}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const upiUri = `upi://pay?pa=${form.upiId}&pn=${encodeURIComponent(form.storeName || 'Merchant')}&cu=INR`;
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(upiUri)}`;
                      window.open(qrUrl, '_blank');
                    }}
                    className="py-1.5 px-3 bg-light-cream border border-soft-gray hover:border-orange rounded-lg text-[10px] font-bold text-deep-navy hover:text-orange transition-colors cursor-pointer"
                  >
                    Open Full QR Code
                  </button>
                </div>
              )}

              <p className="text-xs text-slate-gray/80 mt-1">
                
              </p>
            </div>
            <button className="inline-flex items-center justify-center px-5 py-2.5 bg-orange hover:bg-orange-hover text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-colors shadow-sm hover:shadow disabled:opacity-50 mt-2" type="submit" disabled={saving}>
              {saving ? t('saving') : t('saveChanges')}
            </button>
          </form>
        </div>

        {/* App Security Card */}
        <div className="bg-pure-white border border-soft-gray rounded-2xl p-7 shadow-sm">
          <h3 className="text-lg font-bold text-deep-navy mb-5 mt-0">App Security</h3>
          <div className="space-y-4">
            
            <div className="flex justify-between items-center py-2.5 border-b border-soft-gray/40">
              <div className="text-left">
                <h4 className="text-sm font-bold text-deep-navy m-0">Security PIN</h4>
                <p className="text-xs text-slate-gray m-0 mt-0.5">Protect your  register with a secure 4-digit PIN</p>
              </div>
              <button 
                onClick={() => navigate('/security-setup')}
                className="px-4 py-2 bg-light-cream border border-soft-gray hover:border-orange rounded-xl text-xs font-bold text-deep-navy hover:text-orange transition-colors cursor-pointer"
              >
                Change PIN
              </button>
            </div>

            <div className="flex justify-between items-center py-2.5">
              <div className="text-left">
                <h4 className="text-sm font-bold text-deep-navy m-0">Biometric Unlock</h4>
                <p className="text-xs text-slate-gray m-0 mt-0.5">Use device fingerprint scanner or face camera to unlock</p>
              </div>
              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={user?.isBiometricEnabled || false} 
                    onChange={handleToggleBiometrics}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-soft-gray rounded-full peer peer-focus:ring-2 peer-focus:ring-orange/20 peer-checked:after:translate-x-full peer-checked:after:border-pure-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-pure-white after:border-soft-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange"></div>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* Delete Protection (Trash Bin) Card */}
        <div className="bg-pure-white border border-soft-gray rounded-2xl p-7 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-deep-navy m-0">Trash Bin (Delete Protection)</h3>
            <span className="bg-orange/10 text-orange text-xs font-bold px-2.5 py-1 rounded-full">
              30 Days Recovery
            </span>
          </div>
          <p className="text-xs text-slate-gray m-0 mb-4 leading-relaxed">
            Customers you delete are kept here for 30 days. Restoring them recovers their balance and full transaction ledger.
          </p>

          {loadingTrash ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-orange border-t-transparent rounded-full animate-spin" />
            </div>
          ) : trashedCustomers.length === 0 ? (
            <div className="text-center py-6 bg-soft-white border border-dashed border-soft-gray/60 rounded-xl">
              <span className="text-xs text-slate-gray">Trash bin is empty</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {trashedCustomers.map((customer) => {
                const deletedDate = new Date(customer.deletedAt);
                const expiryDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                const diffTime = expiryDate - Date.now();
                const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

                return (
                  <div key={customer._id} className="flex justify-between items-center p-3.5 bg-soft-white/60 border border-soft-gray/50 rounded-xl hover:bg-soft-white transition-colors">
                    <div className="text-left">
                      <span className="text-sm font-bold text-deep-navy block">{customer.name}</span>
                      <span className="text-[11px] text-slate-gray block mt-0.5">
                        Balance: <strong className={customer.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}>₹{Math.abs(customer.balance)}</strong>
                      </span>
                      <span className="text-[10px] text-orange block mt-1 font-semibold flex items-center gap-1">
                        <FiClock className="w-3 h-3 text-orange" /> {daysRemaining} days left before permanent deletion
                      </span>
                    </div>
                    <button
                      onClick={() => handleRestoreCustomer(customer._id)}
                      className="px-3 py-1.5 bg-orange/10 hover:bg-orange text-orange hover:text-white rounded-lg text-xs font-bold border border-orange/20 transition-all cursor-pointer"
                    >
                      Restore
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Data Backup & Verification Card */}
        <div className="bg-pure-white border border-soft-gray rounded-2xl p-7 shadow-sm">
          <h3 className="text-lg font-bold text-deep-navy mb-2 mt-0">Data Backup & Restore</h3>
          <p className="text-xs text-slate-gray m-0 mb-6 leading-relaxed">
            Securely back up your entire data to servers or restore from a previously saved copy. A confirmation email is sent for every backup and restoration.
          </p>
          <div className="p-5 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-left">
                <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <FiCloud className="w-3.5 h-3.5" /> Secure Cloud Backup
                </span>
                <h4 className="text-sm font-bold text-deep-navy m-0">1-Click Cloud Backup & Restore</h4>
                <p className="text-[11px] text-slate-gray mt-1 mb-3 leading-relaxed">
                  Save your ledger & cashbook directly to your secure account cloud. Restores instantly without choosing any local files.
                </p>

                {loadingCloudBackup ? (
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[11px] text-slate-gray">Checking cloud status...</span>
                  </div>
                ) : cloudBackupInfo ? (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Last cloud backup: {new Date(cloudBackupInfo.updatedAt).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-gray block">
                      Includes: <strong>{cloudBackupInfo.customersCount}</strong> customers • <strong>{cloudBackupInfo.transactionsCount}</strong> ledger transactions • <strong>{cloudBackupInfo.cashbookCount}</strong> cashbook entries
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-orange font-bold flex items-center gap-1.5">
                    <FiAlertTriangle className="w-3.5 h-3.5 text-orange" /> No cloud backup found. Back up your data to the cloud to prevent loss.
                  </span>
                )}
              </div>

              <div className="flex flex-row md:flex-col gap-2.5 min-w-[180px]">
                <button
                  type="button"
                  disabled={backingUpCloud}
                  onClick={handleCreateCloudBackup}
                  className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold border-none transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {backingUpCloud ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><FiCloud className="w-3.5 h-3.5" /> Backup to Cloud</>
                  )}
                </button>

                <button
                  type="button"
                  disabled={restoringCloud || !cloudBackupInfo}
                  onClick={handleRestoreCloudBackup}
                  className={`flex-1 py-2 px-4 text-white rounded-xl text-xs font-bold border-none transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    !cloudBackupInfo 
                      ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-50' 
                      : 'bg-orange hover:bg-orange-hover'
                  }`}
                >
                  {restoringCloud ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><FiRefreshCw className="w-3.5 h-3.5" /> Restore from Cloud</>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-soft-gray"></div>
            <span className="flex-shrink mx-4 text-[10px] text-slate-gray font-bold uppercase tracking-wider">Or Backup Locally</span>
            <div className="flex-grow border-t border-soft-gray"></div>
          </div>

          {/* Local Storage Backup Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-soft-white border border-soft-gray rounded-xl flex flex-col justify-between">
              <div className="text-left">
                <h4 className="text-xs font-bold text-deep-navy flex items-center gap-1.5 m-0">
                  <FiDownload className="w-3.5 h-3.5 text-slate-gray" /> Download Local File
                </h4>
                <p className="text-[10px] text-slate-gray mt-1 mb-4 leading-relaxed">
                  Downloads a JSON file containing all ledger & cashbook records.
                </p>
              </div>
              <button
                type="button"
                disabled={backingUp}
                onClick={handleCreateBackup}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-deep-navy dark:text-white rounded-xl text-xs font-bold border border-soft-gray transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {backingUp ? (
                  <span className="w-3.5 h-3.5 border-2 border-deep-navy border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Download JSON</>
                )}
              </button>
            </div>

            <div className="p-4 bg-soft-white border border-soft-gray rounded-xl flex flex-col justify-between">
              <div className="text-left">
                <h4 className="text-xs font-bold text-deep-navy flex items-center gap-1.5 m-0">
                  <FiUpload className="w-3.5 h-3.5 text-slate-gray" /> Upload Local File
                </h4>
                <p className="text-[10px] text-slate-gray mt-1 mb-4 leading-relaxed">
                  Upload a previously downloaded backup JSON file to restore data.
                </p>
              </div>
              <label className="relative w-full py-2 bg-light-cream border border-soft-gray hover:border-orange text-deep-navy hover:text-orange rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center">
                {restoring ? (
                  <span className="w-3.5 h-3.5 border-2 border-orange border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Upload JSON File</>
                )}
                <input
                  type="file"
                  accept=".json"
                  disabled={restoring}
                  onChange={handleRestoreBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Login Activity Tracker Card */}
        <div className="bg-pure-white border border-soft-gray rounded-2xl p-7 shadow-sm">
          <h3 className="text-lg font-bold text-deep-navy mb-5 mt-0">Login Activity History</h3>
          <p className="text-xs text-slate-gray m-0 mb-4 leading-relaxed">
            Monitor active devices and IP locations that logged into your store. Suspicious attempts trigger security alerts.
          </p>

          {loadingActivities ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-orange border-t-transparent rounded-full animate-spin" />
            </div>
          ) : loginActivities.length === 0 ? (
            <div className="text-center py-6 bg-soft-white border border-soft-gray rounded-xl">
              <span className="text-xs text-slate-gray">No login activity records found</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {loginActivities.map((activity, idx) => (
                <div key={idx} className="p-3.5 bg-soft-white/60 border border-soft-gray/50 rounded-xl flex justify-between items-start text-left">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-deep-navy block flex items-center gap-1.5">
                      <FiSmartphone className="w-3.5 h-3.5 text-slate-gray" /> {activity.deviceName} ({activity.browser})
                      {idx === 0 && (
                        <span className="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Current
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-gray block flex items-center gap-1">
                      <FiMapPin className="w-3 h-3 text-slate-gray/80" /> IP: {activity.ipAddress} • {activity.location}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-gray font-medium">
                    {new Date(activity.loginTime).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Lock (One Click Lock) Card */}
        <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-7 shadow-sm">
          <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2 mt-0">Emergency Account Lock</h3>
          <p className="text-xs text-red-600/80 dark:text-red-400/80 m-0 mb-5 leading-relaxed">
            If you suspect unauthorized access, click the button below. This will log out all other active sessions, reset/lock your password, and send a security notification email. You will need to reset your password to log back in.
          </p>
          <button
            type="button"
            disabled={locking}
            onClick={handleEmergencyLock}
            className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold border-none cursor-pointer transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            {locking ? (
              <span className="w-4 h-4 border-2 border-pure-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><FiAlertOctagon className="w-4 h-4" /> Activate Emergency Lock</>
            )}
          </button>
        </div>

      </div>

      {/* Simulated Biometric Authenticator Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-navy/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-pure-white border border-soft-gray p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-5 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-200">
            <div className="relative w-20 h-20 rounded-full bg-orange/10 flex items-center justify-center text-orange">
              {simulating && (
                <span className="absolute inset-0 rounded-full border-2 border-orange animate-ping opacity-75" />
              )}
              <svg className="w-10 h-10 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.105-1.343-2-3-2s-3 .895-3 2M12 11c0 1.105 1.343 2 3 2s3-.895 3-2M12 11V7a3 3 0 10-6 0v4M12 11v4a3 3 0 106 0v-4m-6 8a7 7 0 100-14 7 7 0 000 14z" />
              </svg>
            </div>
            
            <div>
              <h2 className="text-lg font-bold text-deep-navy font-outfit">Biometric Verification</h2>
              <p className="text-xs text-slate-gray mt-2 leading-relaxed">
                {simulating 
                  ? 'Configuring device authenticators...' 
                  : 'Please approve the simulated device biometric request to enable biometric login.'}
              </p>
            </div>

            <div className="w-full space-y-2.5">
              {!simulating ? (
                <>
                  <button
                    onClick={startSimulation}
                    className="w-full py-3 px-4 bg-orange hover:bg-orange-hover text-white font-bold text-sm rounded-xl border-none cursor-pointer shadow-md transition-all"
                  >
                   Fingerprint Scan
                  </button>
                  <button
                    onClick={() => setShowSimulateModal(false)}
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

      {/* Password Verification Modal for unlocking UPI */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-navy/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-pure-white border border-soft-gray p-6 rounded-2xl shadow-2xl flex flex-col gap-4 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200 font-sans">
            {!showOtpScreen ? (
              <>
                <div>
                  <h3 className="text-base font-bold text-deep-navy m-0 font-outfit">Verify Account Password</h3>
                  <p className="text-xs text-slate-gray mt-1 leading-relaxed">
                    Please enter your login password to unlock and edit the UPI ID settings.
                  </p>
                </div>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setVerifyingPassword(true);
                  try {
                    await API.post('/auth/verify-password', { password: verifyPasswordInput });
                    setIsUpiUnlocked(true);
                    setShowPasswordModal(false);
                    toast.success('UPI ID settings unlocked');
                  } catch (err) {
                    if (err.response?.data?.requireEmailOtp) {
                      setShowOtpScreen(true);
                      setOtpInput('');
                      toast.info('Verification OTP sent to your registered email address.');
                    } else {
                      toast.error(err.response?.data?.message || 'Verification failed. Incorrect password.');
                    }
                  } finally {
                    setVerifyingPassword(false);
                  }
                }} className="space-y-4">
                  <div className="relative flex items-center">
                    <input
                      type={showModalPassword ? "text" : "password"}
                      required
                      placeholder="Enter password"
                      value={verifyPasswordInput}
                      onChange={(e) => setVerifyPasswordInput(e.target.value)}
                      className="w-full pl-4 pr-12 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalPassword(!showModalPassword)}
                      className="absolute right-3 text-slate-gray/70 hover:text-deep-navy cursor-pointer flex items-center justify-center p-1.5 hover:bg-soft-gray/20 rounded-lg transition-all"
                      title={showModalPassword ? "Hide password" : "Show password"}
                    >
                      {showModalPassword ? <HiEye size={18} /> : <HiEyeOff size={18} />}
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={verifyingPassword}
                      className="flex-1 py-2.5 bg-orange hover:bg-orange-hover text-white font-bold text-xs rounded-xl border-none cursor-pointer shadow-sm transition-colors flex items-center justify-center"
                    >
                      {verifyingPassword ? (
                        <span className="w-4 h-4 border-2 border-pure-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Verify & Unlock'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      disabled={verifyingPassword}
                      className="flex-1 py-2.5 bg-transparent border border-soft-gray text-slate-gray font-semibold text-xs rounded-xl cursor-pointer hover:bg-soft-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>

                  {user?.isBiometricEnabled && (
                    <div className="flex flex-col items-center justify-center pt-3 border-t border-soft-gray/50 mt-3">
                      <span className="text-[10px] font-bold text-slate-gray uppercase tracking-wider mb-2">Or Unlock With Biometrics</span>
                      <button
                        type="button"
                        onClick={handleBiometricAuth}
                        disabled={verifyingPassword}
                        className="w-12 h-12 rounded-full bg-orange/10 border border-orange/20 flex items-center justify-center text-orange hover:bg-orange hover:text-white hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        title="Unlock with Fingerprint or Face ID"
                      >
                        <HiOutlineFingerPrint size={24} />
                      </button>
                    </div>
                  )}
                </form>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-base font-bold text-deep-navy m-0 font-outfit">Email Verification OTP Required</h3>
                  <p className="text-xs text-slate-gray mt-1 leading-relaxed">
                    Incorrect password entered. A 6-digit security code has been sent to your email address. Please enter it to unlock the UPI ID.
                  </p>
                </div>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setVerifyingOtp(true);
                  try {
                    await API.post('/auth/verify-email-otp', { otp: otpInput });
                    setIsUpiUnlocked(true);
                    setShowPasswordModal(false);
                    setShowOtpScreen(false);
                    toast.success('UPI ID settings unlocked via Email OTP');
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
                  } finally {
                    setVerifyingOtp(false);
                  }
                }} className="space-y-4">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP code"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange font-mono text-center tracking-widest text-lg"
                    autoFocus
                  />
                  
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={verifyingOtp}
                      className="flex-1 py-2.5 bg-orange hover:bg-orange-hover text-white font-bold text-xs rounded-xl border-none cursor-pointer shadow-sm transition-colors flex items-center justify-center"
                    >
                      {verifyingOtp ? (
                        <span className="w-4 h-4 border-2 border-pure-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Verify OTP & Unlock'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOtpScreen(false);
                        setShowPasswordModal(false);
                      }}
                      disabled={verifyingOtp}
                      className="flex-1 py-2.5 bg-transparent border border-soft-gray text-slate-gray font-semibold text-xs rounded-xl cursor-pointer hover:bg-soft-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      {/* Simulated Biometric Lock Verification Modal */}
      {showUnlockSimulateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-deep-navy/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-pure-white border border-soft-gray p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-5 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-200">
            <style>{scanStyles}</style>
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
                <FaceBiometricGrid />
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
                  ? 'Access granted. Identity confirmed!' 
                  : simulating 
                    ? 'Verifying biometric scan...' 
                    : 'Place your finger on the scanner or check your camera to unlock.'}
              </p>
            </div>

            <div className="w-full space-y-2.5">
              {unlockSuccess ? (
                <div className="text-green-500 font-bold text-sm py-2 flex items-center justify-center gap-2 animate-bounce">
                  <span>Unlocking field...</span>
                </div>
              ) : !simulating ? (
                <>
                  <button
                    onClick={startUnlockSimulation}
                    className="w-full py-3 px-4 bg-orange hover:bg-orange-hover text-white font-bold text-sm rounded-xl border-none cursor-pointer shadow-md transition-all"
                  >
                    Unlock with {user?.biometricCredentialId?.includes('fingerprint') ? 'Fingerprint' : 'Face'} ID
                  </button>
                  <button
                    onClick={handleCloseUnlockModal}
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

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-deep-navy/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-pure-white border border-soft-gray p-7 rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full flex-shrink-0 ${confirmModal.isDanger ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' : 'bg-orange/10 text-orange'}`}>
                {confirmModal.isDanger ? (
                  <FiAlertOctagon className="w-6 h-6 animate-pulse" />
                ) : (
                  <FiAlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div className="text-left flex-1">
                <h3 className="text-base font-bold text-deep-navy m-0 font-outfit uppercase tracking-wide">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-gray mt-2.5 mb-0 leading-relaxed font-medium">
                  {confirmModal.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4.5 py-2 bg-soft-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-deep-navy dark:text-white rounded-xl text-xs font-bold border border-soft-gray transition-colors cursor-pointer"
              >
                {confirmModal.cancelText}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4.5 py-2 text-white rounded-xl text-xs font-bold border-none transition-colors cursor-pointer shadow-sm ${
                  confirmModal.isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-orange hover:bg-orange-hover'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsPage;
