import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export interface Package {
  id: string;
  name: string;
  price: string;
  duration: string;
  features: string[];
  waLink: string;
}

export interface DesaAdatSettings {
  logo: string | null;
  nama: string;
  profil: string;
  dusun: string[];
  subscriptionPackages?: Package[];
}

import { useAuth } from "./useAuth";

export function useDesaAdat() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<DesaAdatSettings>({
    logo: null,
    nama: "Desa Adat",
    profil: "",
    dusun: [],
    subscriptionPackages: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If user is super_admin or owner, they might want global settings or their own
    // For now, let's scope by user.id if available, otherwise fallback to "desa_adat"
    const settingsId = user?.id || "desa_adat";
    const docRef = doc(db, "settings", settingsId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DesaAdatSettings;
        setSettings(data);
      } else {
        // Reset to default if settings for this admin don't exist
        setSettings({
          logo: null,
          nama: "Desa Adat",
          profil: "",
          dusun: [],
          subscriptionPackages: []
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching desa adat settings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  return { settings, loading };
}
