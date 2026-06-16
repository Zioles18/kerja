import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

export interface User {
  id: string;     
  nama: string;
  email: string;
  role: string;
  subscription?: string;
  subscriptionStatus?: string;
  profilePic?: string;
  disabledMenus?: string[];
  uid?: string;
  noHp?: string;
  nik?: string;
  status?: string;
  createdAt?: string;
  trialStartedAt?: string;
  adminId?: string;
}

interface AuthContextType {
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, phone: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  loginAsDemo: () => Promise<void>;
  isReadOnly: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        // Clean up previous listener if any
        if (unsubscribeDoc) unsubscribeDoc();

        unsubscribeDoc = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const isOwner = firebaseUser.email === "alitsumberdana@gmail.com" || firebaseUser.email === "owner@datawarga.com";
            const isDemo = firebaseUser.email === "demo@meroket.com";
            
            // Auto-upgrade owner if needed but silently ignore failures because DB is locked
            if (isOwner && userData.role !== "super_admin") {
              try {
                await setDoc(userDocRef, { role: "super_admin" }, { merge: true });
              } catch (e) {
                console.log("Ignored setDoc error for locked DB");
              }
            }

            // Sync demo role if needed
            if (isDemo && userData.role !== "demo") {
              try {
                await setDoc(userDocRef, { role: "demo" }, { merge: true });
              } catch (e) {
                console.log("Ignored setDoc error for demo role");
              }
            }

            // FORCE overriding role locally for UI access
            const finalUserData = { ...userData };
            if (isOwner) {
              finalUserData.role = "super_admin";
            } else if (isDemo) {
              finalUserData.role = "demo";
            }

            const trialDays = 30;
            const createdAt = userData.createdAt || userData.trialStartedAt || new Date().toISOString();
            const trialExpiryDate = new Date(createdAt);
            trialExpiryDate.setDate(trialExpiryDate.getDate() + trialDays);
            const isExpired = new Date() > trialExpiryDate;

            setUser({
              id: firebaseUser.uid,
              ...finalUserData,
              isExpired: isExpired && finalUserData.role === 'demo'
            } as any);
            setLoading(false);
          } else {
            // If user exists in Auth but not in Firestore, create it
            const isOwner = firebaseUser.email === "alitsumberdana@gmail.com" || firebaseUser.email === "owner@datawarga.com";
            const isDemo = firebaseUser.email === "demo@meroket.com";
            const newUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              nama: isDemo ? "Akun Demo" : (firebaseUser.displayName || "User"),
              role: isOwner ? "super_admin" : (isDemo ? "demo" : "admin_rt"),
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(userDocRef, newUser);
              // Snapshot will trigger again and set user state
            } catch (err) {
              console.error("Error creating user doc:", err);
              setLoading(false);
            }
          }
        }, (error) => {
          console.error("Firestore snapshot error:", error);
          setLoading(false);
        });
      } else {
        if (unsubscribeDoc) unsubscribeDoc();
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate("/dashboard");
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      navigate("/dashboard");
    } catch (error) {
      console.error("Email login failed", error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string, phone: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;
      
      // Update profile
      await updateProfile(firebaseUser, { displayName: name });

      // Create user document
      const userDocRef = doc(db, "users", firebaseUser.uid);
      await setDoc(userDocRef, {
        uid: firebaseUser.uid,
        email: email,
        nama: name,
        noHp: phone,
        role: email === "demo@meroket.com" ? "demo" : "admin_rt", // Set demo role for demo account
        subscription: "Gratis", // Set default subscription
        adminId: firebaseUser.uid, // User is their own admin
        createdAt: new Date().toISOString(),
        trialStartedAt: new Date().toISOString()
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Registration failed", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Password reset failed", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const loginAsDemo = async () => {
    try {
      await loginWithEmail("demo@meroket.com", "demo123");
    } catch (error: any) {
      console.error("Demo login failed", error);
      
      // If user doesn't exist or credentials invalid (might be deleted/not created yet)
      // try to register it as a last resort to make the demo work
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          await registerWithEmail("demo@meroket.com", "demo123", "Akun Demo", "08123456789");
          return;
        } catch (regErr) {
          console.error("Demo registration failed", regErr);
        }
      }
      
      // Fallback: if everything fails, at least take them to login page with pre-filled info
      navigate("/login", { state: { email: "demo@meroket.com", password: "demo123" } });
    }
  };

  const isReadOnly = user?.role === 'demo' && (user as any).isExpired;

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, logout, updateUser, loginAsDemo, isReadOnly, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
