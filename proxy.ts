export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    "/mahasiswa/:path*",
    "/admin/:path*",
    "/kaprodi/:path*",
    "/dosen/:path*",
  ],
};
