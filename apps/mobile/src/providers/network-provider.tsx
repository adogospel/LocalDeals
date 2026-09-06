import { useNetworkState } from 'expo-network';
import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

type NetworkContextValue = {
  isOffline: boolean;
};

const NetworkContext = createContext<NetworkContextValue>({ isOffline: false });

export function NetworkProvider({ children }: PropsWithChildren) {
  const state = useNetworkState();
  const value = useMemo(
    () => ({
      isOffline: state.isConnected === false || state.isInternetReachable === false,
    }),
    [state.isConnected, state.isInternetReachable],
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  return useContext(NetworkContext);
}

