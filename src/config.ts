import getConfig from 'next/config'

const { publicRuntimeConfig } = getConfig()
const { NEXT_PUBLIC_PROJECT_ID } = publicRuntimeConfig

export const TITLE = publicRuntimeConfig?.TITLE || '1.0 - GGWorld Flip Game'

export const MAINNET_CHAIN_ID = publicRuntimeConfig?.CHAIN_ID || 97

// MAINNET_GAME_CONTRACT 0x801B2B8b7B86147C88aA346378e626E5481b5e9d
export const GAME_CONTRACT = publicRuntimeConfig?.GAME_CONTRACT || "0x5eeb7cee07a7aB072Fbf70f1FEc8793C276f2CB1"
// MAINNET_RANDOM_GENERATOR 0xa2d8526d12fa0a41007d2b5f33da81d0d6716fa9
export const RANDOM_GENERATOR = publicRuntimeConfig?.RANDOM_GENERATOR || '0x33D44b8715349b26B5E16066647a9294F724a65c'

// MAINNET_TOKEN 0xca84fca8cd0e45bcabeef624f7e500f60da1e771
export const TOKEN_ADDRESS = publicRuntimeConfig?.TOKEN_ADDRESS || '0x1f832e8508bD9E95B4F65d252EAc40E70Cfd7A2A'
// Mainnet Eth -> Bsc mainnet

