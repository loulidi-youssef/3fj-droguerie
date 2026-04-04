/** @type {import('next').NextConfig} */
const storageRemotePatterns = [];

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    storageRemotePatterns.push({
      protocol: supabaseUrl.protocol.replace(":", ""),
      hostname: supabaseUrl.hostname,
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    // Ignore invalid URL and keep default config.
  }
}

const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: storageRemotePatterns,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
