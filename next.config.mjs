/** @type {import('next').NextConfig} */
const storageRemotePatterns = [];
const isProduction = process.env.NODE_ENV === "production";

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    storageRemotePatterns.push({
      protocol: supabaseUrl.protocol.replace(":", ""),
      hostname: supabaseUrl.hostname,
      pathname: "/storage/v1/object/**",
    });
  } catch {
    // Ignore invalid URL and keep default config.
  }
}

const getSupabaseOrigins = () => {
  const origins = new Set(["https://*.supabase.co", "wss://*.supabase.co"]);
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!rawUrl) {
    return [...origins];
  }

  try {
    const supabaseUrl = new URL(rawUrl);
    origins.add(supabaseUrl.origin);

    const wsProtocol = supabaseUrl.protocol === "https:" ? "wss:" : "ws:";
    origins.add(`${wsProtocol}//${supabaseUrl.host}`);
  } catch {
    // Ignore invalid URL and keep wildcard Supabase origins.
  }

  return [...origins];
};

const buildContentSecurityPolicy = () => {
  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (!isProduction) {
    scriptSrc.push("'unsafe-eval'");
  }

  const connectSrc = ["'self'", ...getSupabaseOrigins()];
  if (!isProduction) {
    connectSrc.push(
      "http://localhost:*",
      "http://127.0.0.1:*",
      "https://localhost:*",
      "https://127.0.0.1:*",
      "ws://localhost:*",
      "ws://127.0.0.1:*",
      "wss://localhost:*",
      "wss://127.0.0.1:*",
    );
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-src 'self' https://www.google.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (isProduction) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
};

const nextConfig = {
  images: {
    remotePatterns: storageRemotePatterns,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: buildContentSecurityPolicy(),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
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
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-site",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(isProduction
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
