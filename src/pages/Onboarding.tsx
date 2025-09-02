import { useNavigate } from 'react-router-dom';
import { ProfileSetup } from '@/components/onboarding/ProfileSetup';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Redirect to auth if not logged in
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleComplete = () => {
    navigate('/');
  };

  const handleSkip = () => {
    navigate('/');
  };

  if (!user) {
    return null;
  }

  return <ProfileSetup onComplete={handleComplete} onSkip={handleSkip} />;
};

export default Onboarding;