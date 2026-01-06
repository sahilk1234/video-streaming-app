import { create } from "zustand";

type ProfileState = {
  profileId: string | null;
  setProfileId: (id: string | null) => void;
};

export const useProfileStore = create<ProfileState>((set) => ({
  profileId: null,
  setProfileId: (profileId) => set({ profileId })
}));
