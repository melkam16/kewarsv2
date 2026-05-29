import React, { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const withProtectedRoute = (Comp, redirectPath = '/access-denied') => (props) => {
  const navigate = useNavigate();
  const { user, userRoles } = useContext(AuthContext);
  const { pathRoles } = props;

  const isRoleAllowed = () => {
    if (!pathRoles || !userRoles) return false;
    const allowedRoles = pathRoles.split(',').map(r => r.trim());
    return userRoles.some(role => allowedRoles.includes(role));
  };

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    } else if (!isRoleAllowed()) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, userRoles, pathRoles, navigate, redirectPath]);

  return <Comp {...props} />;
};

export default withProtectedRoute;