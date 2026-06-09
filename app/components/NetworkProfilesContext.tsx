'use client'
import { createContext, useContext } from 'react'

export interface NetworkProfile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  location: string | null
  network_tab: string | null
  network_category: string | null
  network_subcategory: string | null
  is_featured: boolean | null
  is_verified: boolean | null
}

const NetworkProfilesContext = createContext<NetworkProfile[]>([])

export function NetworkProfilesProvider({
  profiles,
  children,
}: {
  profiles: NetworkProfile[]
  children: React.ReactNode
}) {
  return (
    <NetworkProfilesContext.Provider value={profiles}>
      {children}
    </NetworkProfilesContext.Provider>
  )
}

export const useNetworkProfiles = () => useContext(NetworkProfilesContext)
