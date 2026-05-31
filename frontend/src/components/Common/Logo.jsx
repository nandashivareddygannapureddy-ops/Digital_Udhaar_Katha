import React from 'react';

const Logo = ({ size = '100%' }) => {
  return (
    <img 
      src="/logo.png" 
      alt="Udhaar Khata Logo" 
      style={{ width: size, height: size, display: 'block', objectFit: 'contain', borderRadius: '8px' }} 
    />
  );
};

export default Logo;
