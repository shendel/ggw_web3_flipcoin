/** @type {import('next').NextConfig} */

const nextConfig = {
  distDir: 'build',
  basePath: (process.env.NODE_ENV == 'production') ? '/_NEXT_GEN_APP' : undefined,
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  publicRuntimeConfig: {
    NODE_ENV: process.env.NODE_ENV,
    CHAIN_ID: 97,
    BACKEND: "http://127.0.0.1:3100", //https://ws.gg.world/random",
    GAME_CONTRACT: "0x66128B21E01b739F5015623f3c6FBa7F527400ad",
    DEPOSIT_CONTRACT: "0x0CE4B81b7693e444174AF6769dE7681bF5E2B82e", //"0xb402085fe60BCAEd082a633aE53e9c2ba8EEbE01",
    TITLE: "Flip A Coin: Heads or Tails? FlipCoin Game - Coin Toss",
    SEO_DESC: "Flip A Coin! – a simple, fast, and provably fair FlipCoin game. Toss the coin, choose heads or tails, and win! Enjoy great fun with a virtual coin flip!",
    RANDOM_GENERATOR: "0xa2d8526d12fa0a41007d2b5f33da81d0d6716fa9", // "0x33D44b8715349b26B5E16066647a9294F724a65c",
    TOKEN_ADDRESS: "0x1f832e8508bD9E95B4F65d252EAc40E70Cfd7A2A",
    NEXT_PUBLIC_PROJECT_ID: "b87a3c44755d7f346d350330ca573223"
  }
}

module.exports = nextConfig
