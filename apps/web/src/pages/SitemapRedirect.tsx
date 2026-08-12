import { useEffect } from "react";

/** Force a full browser navigation to the static sitemap.xml (Nginx). */
export default function SitemapRedirect() {
  useEffect(() => {
    window.location.replace("/sitemap.xml");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="text-gray-600">Redirection vers le sitemap…</p>
    </div>
  );
}
