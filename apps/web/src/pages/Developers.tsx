// Developer portal — Swagger UI (CDN, aucune dépendance NPM)
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2, KeyRound, Webhook, ShieldCheck } from "lucide-react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";

const SWAGGER_CSS = "https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css";
const SWAGGER_JS = "https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js";

export default function Developers() {
  useEffect(() => {
    // CSS
    if (!document.querySelector(`link[href="${SWAGGER_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = SWAGGER_CSS;
      document.head.appendChild(link);
    }
    // JS
    const boot = () => {
      // @ts-ignore
      if (window.SwaggerUIBundle) {
        // @ts-ignore
        window.SwaggerUIBundle({
          url: "/api/openapi.yaml",
          dom_id: "#swagger-ui",
          deepLinking: true,
          docExpansion: "list",
          defaultModelsExpandDepth: 0,
        });
      }
    };
    const existing = document.querySelector(`script[src="${SWAGGER_JS}"]`);
    if (existing) {
      boot();
    } else {
      const s = document.createElement("script");
      s.src = SWAGGER_JS;
      s.onload = boot;
      document.body.appendChild(s);
    }
  }, []);

  return (
    <>
      <Helmet>
        <title>API Développeurs — CarboScan</title>
        <meta
          name="description"
          content="Documentation OpenAPI de l'API REST CarboScan : intégrez vos ERP (SAP, Odoo, Sage) et automatisez vos données carbone."
        />
      </Helmet>
      <MainHeader />

      <main className="min-h-screen bg-background">
        <section className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-12">
            <Badge variant="outline" className="mb-3">API v1</Badge>
            <h1 className="text-4xl font-bold tracking-tight mb-3">
              API Développeurs CarboScan
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Intégrez la comptabilité carbone dans vos systèmes existants.
              Documentation OpenAPI, clés API scopées, logs d'utilisation.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mt-8">
              <Card>
                <CardContent className="p-4 flex gap-3 items-start">
                  <KeyRound className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <div className="font-semibold">Clés API scopées</div>
                    <p className="text-sm text-muted-foreground">
                      Générez des clés `ncs_live_` / `ncs_test_` depuis Paramètres → Clés API.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex gap-3 items-start">
                  <Code2 className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <div className="font-semibold">OpenAPI 3.0</div>
                    <p className="text-sm text-muted-foreground">
                      Spec téléchargeable :{" "}
                      <a className="underline" href="/api/openapi.yaml">
                        /api/openapi.yaml
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex gap-3 items-start">
                  <ShieldCheck className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <div className="font-semibold">Sécurité</div>
                    <p className="text-sm text-muted-foreground">
                      Hash SHA-256, RLS par organisation, logs auditables.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-semibold mb-4">Démarrage rapide</h2>
          <Card>
            <CardContent className="p-4">
              <pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
{`# 1. Créer une clé API (Paramètres → Clés API, scope read:activity)
# 2. Appeler l'API
curl -H "x-api-key: ncs_live_REMPLACER_PAR_VOTRE_CLE" \\
  "http://localhost:8080/v1/functions/collect-api?limit=10"`}
              </pre>
            </CardContent>
          </Card>
        </section>

        <section className="container mx-auto px-4 pb-16">
          <h2 className="text-2xl font-semibold mb-4">Référence API</h2>
          <Card>
            <CardContent className="p-2">
              <div id="swagger-ui" />
            </CardContent>
          </Card>
        </section>

        <section className="container mx-auto px-4 pb-16">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Webhook className="w-5 h-5" />
            <p className="text-sm">
              Webhooks sortants et endpoints Calcul / Facteurs d'émission arrivent dans Sprint 2-3.
            </p>
          </div>
        </section>
      </main>
      <NewFooter />
    </>
  );
}
