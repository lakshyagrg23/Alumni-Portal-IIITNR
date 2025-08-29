import { useAuth } from "@context/AuthContext";

export const useAuthHook = () => {
  return useAuth();
};

// Alias for easier import
export { useAuth } from "@context/AuthContext";

export default useAuth;
