import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); 
  const [userPermissions, setUserPermissions] = useState(null);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Use onSnapshot to listen for live permission changes!
        unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role || 'GUEST');
            setUserPermissions(data.permissions || {});
            setRequirePasswordChange(!!data.requirePasswordChange);
            setIsActive(data.active !== false); // default to true if undefined
          } else {
            // Default master for existing dev sessions if doc doesn't exist
            setUserRole('ADMIN'); 
            setUserPermissions({ '*': true }); // Master key
            setRequirePasswordChange(false);
            setIsActive(true);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error obteniendo datos del usuario:", error);
          setLoading(false);
        });

      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserPermissions(null);
        setRequirePasswordChange(false);
        setIsActive(true);
        setLoading(false);
        if (unsubscribeDoc) unsubscribeDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  // Helper function to check permissions
  const hasPermission = (moduleName) => {
    if (userRole === 'ADMIN') return true; // Force master override for admins
    if (!userPermissions) return false;
    if (userPermissions['*'] === true) return true; // Master Override
    return userPermissions[moduleName] === true;
  };

  const value = {
    currentUser,
    userRole,
    userPermissions,
    requirePasswordChange,
    isActive,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
