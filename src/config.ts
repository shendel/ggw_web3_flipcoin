import getConfig from 'next/config'

const { publicRuntimeConfig } = getConfig()
const { NEXT_PUBLIC_PROJECT_ID } = publicRuntimeConfig

export const TITLE = publicRuntimeConfig?.TITLE || '1.0 - GGWorld Flip Game'
export const SEO_DESC = publicRuntimeConfig?.SEO_DESC || ""

export const MAINNET_CHAIN_ID = publicRuntimeConfig?.CHAIN_ID || 56

export const BACKEND = publicRuntimeConfig?.BACKEND || 'http://localhost:3100'
// MAINNET_GAME_CONTRACT 0x801B2B8b7B86147C88aA346378e626E5481b5e9d
export const GAME_CONTRACT = publicRuntimeConfig?.GAME_CONTRACT || "0x4F27C54ddC97dceab7E9c8b890DCB2B10aa1EBFe"
export const DEPOSIT_CONTRACT = publicRuntimeConfig?.DEPOSIT_CONTRACT || "0x3e149f2481cf2c6F54E3d0e88c407Abd725e757d"
// MAINNET_RANDOM_GENERATOR 0xa2d8526d12fa0a41007d2b5f33da81d0d6716fa9
export const RANDOM_GENERATOR = publicRuntimeConfig?.RANDOM_GENERATOR || '0x33D44b8715349b26B5E16066647a9294F724a65c'

// MAINNET_TOKEN 0xca84fca8cd0e45bcabeef624f7e500f60da1e771
export const TOKEN_ADDRESS = publicRuntimeConfig?.TOKEN_ADDRESS || '0x1f832e8508bD9E95B4F65d252EAc40E70Cfd7A2A'
// Mainnet Eth -> Bsc mainnet

