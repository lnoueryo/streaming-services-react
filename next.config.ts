import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // これがtrueだと何回もレンダリングされてウェブソケットがうまく動かない
  reactStrictMode: false,
  experimental: {
    // experimentalなので非推奨だが作成するのが面倒なのであえて使う
    authInterrupts: true
  }
};

export default nextConfig;
