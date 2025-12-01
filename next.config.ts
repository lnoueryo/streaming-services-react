import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // これがtrueだと何回もレンダリングされてウェブソケットがうまく動かない
  reactStrictMode: false,
};

export default nextConfig;
