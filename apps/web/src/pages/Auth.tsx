import React, { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Eye, EyeOff, Mail, Lock, User, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analytics } from "@/lib/analytics";
import type { AuthUser } from "@/integrations/api/client";

const AUTH_HERO_SRC = "/brand/auth-hero.jpg";

const postLoginPath = (user?: AuthUser | null) => {
  const role = user?.role ?? user?.platformRole;
  if (role === "superadmin" || role === "financeur") {
    return "/superadmin/dashboard";
  }
  return "/app/dashboard";
};

const Auth: React.FC = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, refresh, user } = useAuth();

  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    company: "",
  });

  useEffect(() => {
    const fromLogout = (location.state as { loggedOut?: boolean } | null)?.loggedOut;
    if (isAuthenticated && !fromLogout) {
      navigate(postLoginPath(user), { replace: true });
    }
  }, [isAuthenticated, location.state, navigate, user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("reset");
    if (token) setResetToken(token);
  }, [location.search]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await api.login(signInData.email, signInData.password);
      if (data.mfaRequired && data.mfaToken) {
        setMfaToken(data.mfaToken);
        toast({
          title: "Double authentification",
          description: "Saisissez le code de votre application TOTP.",
        });
        return;
      }
      await refresh();
      analytics.login();
      toast({
        title: t("auth.messages.signInSuccess", "Connexion réussie"),
        description: t("auth.messages.signInSuccessDesc", "Redirection en cours..."),
      });
      navigate(postLoginPath(data.user), { replace: true });
    } catch (error) {
      logger.error(error);
      toast({
        title: t("auth.messages.signInError", "Erreur de connexion"),
        description: error instanceof Error ? error.message : t("auth.messages.unexpectedError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: t("auth.password", "Mot de passe"),
        description: t("auth.messages.passwordMismatch", "Les mots de passe ne correspondent pas."),
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      await api.register({
        email: signUpData.email,
        password: signUpData.password,
        fullName: signUpData.fullName,
        companyName: signUpData.company || "Mon organisation",
      });
      await refresh();
      toast({ title: t("auth.messages.signUpSuccess", "Inscription réussie") });
      navigate("/app/dashboard");
    } catch (error) {
      logger.error(error);
      toast({
        title: t("auth.messages.signUpError", "Erreur d'inscription"),
        description: error instanceof Error ? error.message : t("auth.messages.unexpectedError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6F8]">
      {/* Mobile hero strip */}
      <div className="relative h-36 sm:h-44 md:hidden overflow-hidden">
        <img
          src={AUTH_HERO_SRC}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[40%_55%]"
          decoding="sync"
          loading="eager"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#073F35]/45 to-transparent" />
      </div>

      <div className="grid md:grid-cols-2 md:min-h-screen">
        {/* Left: welcome + card form */}
        <main className="flex items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-[420px] space-y-6">
            <div className="space-y-2 text-center">
              <div className="flex justify-center">
                <BrandLogo variant="light" className="h-9" priority />
              </div>
              <h1 className="text-[1.65rem] font-bold tracking-tight text-[#1F2937]">
                {t("auth.welcome", "Bienvenue sur CarboScan")}
              </h1>
              <p className="text-sm text-[#6B7280]">
                {t("auth.subtitle", "Connectez-vous ou créez votre compte")}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5 space-y-1 text-center">
                <h2 className="text-lg font-bold text-[#1F2937]">
                  {t("auth.authentication", "Authentification")}
                </h2>
                <p className="text-sm text-[#9CA3AF]">
                  {t("auth.accessDashboard", "Accédez à votre tableau de bord carbone")}
                </p>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-[#F3F4F6] p-1">
                  <TabsTrigger
                    value="signin"
                    className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-sm"
                  >
                    {t("auth.signIn", "Connexion")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-sm"
                  >
                    {t("auth.signUp", "Inscription")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-5">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-semibold text-[#374151]">
                        {t("auth.email", "Email")}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={t("auth.placeholders.email", "votre@email.com")}
                          className="h-11 rounded-lg border-[#D1D5DB] bg-white pl-10"
                          value={signInData.email}
                          onChange={(e) =>
                            setSignInData({ ...signInData, email: e.target.value })
                          }
                          required
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-semibold text-[#374151]">
                        {t("auth.password", "Mot de passe")}
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder={t("auth.placeholders.password", "••••••••")}
                          className="h-11 rounded-lg border-[#D1D5DB] bg-white pl-10 pr-10"
                          value={signInData.password}
                          onChange={(e) =>
                            setSignInData({ ...signInData, password: e.target.value })
                          }
                          required
                          minLength={8}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="text-sm font-medium text-[#16A34A] hover:text-[#15803D]"
                          onClick={async () => {
                            try {
                              await api.forgotPassword(signInData.email);
                              toast({
                                title: t("auth.forgotPassword", "Mot de passe oublié ?"),
                                description:
                                  "Si un compte existe, un lien de réinitialisation a été émis (valable 1 h). En développement, le jeton peut apparaître dans les logs API.",
                              });
                            } catch {
                              toast({
                                title: t("auth.forgotPassword", "Mot de passe oublié ?"),
                                description:
                                  "Si un compte existe, un lien de réinitialisation a été émis (valable 1 h).",
                              });
                            }
                          }}
                        >
                          {t("auth.forgotPassword", "Mot de passe oublié ?")}
                        </button>
                      </div>
                    </div>

                    {mfaToken ? (
                      <div className="space-y-2">
                        <Label>Code MFA</Label>
                        <Input
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value)}
                          placeholder="123456"
                        />
                        <Button
                          type="button"
                          className="h-11 w-full rounded-lg bg-[#16A34A] text-white"
                          disabled={isLoading}
                          onClick={async () => {
                            setIsLoading(true);
                            try {
                              const data = await api.verifyMfa(mfaToken, mfaCode);
                              await refresh();
                              navigate(postLoginPath(data.user), { replace: true });
                            } catch (error) {
                              toast({
                                title: "Code MFA invalide",
                                description: error instanceof Error ? error.message : "",
                                variant: "destructive",
                              });
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                        >
                          Valider le code
                        </Button>
                      </div>
                    ) : null}

                    {resetToken ? (
                      <div className="space-y-2 rounded-md border p-3">
                        <Label>Nouveau mot de passe</Label>
                        <Input
                          type="password"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                        />
                        <Button
                          type="button"
                          onClick={async () => {
                            try {
                              await api.resetPassword(resetToken, resetPassword);
                              setResetToken(null);
                              toast({ title: "Mot de passe mis à jour" });
                            } catch (error) {
                              toast({
                                title: "Réinitialisation impossible",
                                description: error instanceof Error ? error.message : "",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Réinitialiser
                        </Button>
                      </div>
                    ) : null}

                    <Button
                      type="submit"
                      className="h-11 w-full rounded-lg bg-[#16A34A] text-base font-semibold text-white hover:bg-[#15803D]"
                      disabled={isLoading}
                    >
                      {isLoading
                        ? t("auth.buttons.signInLoading", "Connexion...")
                        : t("auth.buttons.signIn", "Se connecter")}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-5">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[#374151]">
                        {t("auth.fullName", "Nom complet")}
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                        <Input
                          className="h-11 rounded-lg border-[#D1D5DB] bg-white pl-10"
                          placeholder={t("auth.placeholders.fullName", "Votre nom complet")}
                          value={signUpData.fullName}
                          onChange={(e) =>
                            setSignUpData({ ...signUpData, fullName: e.target.value })
                          }
                          required
                          autoComplete="name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[#374151]">
                        {t("auth.company", "Entreprise")}
                      </Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                        <Input
                          className="h-11 rounded-lg border-[#D1D5DB] bg-white pl-10"
                          placeholder={t("auth.placeholders.company", "Nom de votre entreprise")}
                          value={signUpData.company}
                          onChange={(e) =>
                            setSignUpData({ ...signUpData, company: e.target.value })
                          }
                          required
                          autoComplete="organization"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[#374151]">
                        {t("auth.email", "Email")}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                        <Input
                          type="email"
                          className="h-11 rounded-lg border-[#D1D5DB] bg-white pl-10"
                          placeholder={t("auth.placeholders.email", "votre@email.com")}
                          value={signUpData.email}
                          onChange={(e) =>
                            setSignUpData({ ...signUpData, email: e.target.value })
                          }
                          required
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[#374151]">
                        {t("auth.password", "Mot de passe")}
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                        <Input
                          type={showSignUpPassword ? "text" : "password"}
                          className="h-11 rounded-lg border-[#D1D5DB] bg-white pl-10 pr-10"
                          placeholder={t("auth.placeholders.password", "••••••••")}
                          value={signUpData.password}
                          onChange={(e) =>
                            setSignUpData({ ...signUpData, password: e.target.value })
                          }
                          required
                          minLength={8}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                          onClick={() => setShowSignUpPassword((v) => !v)}
                          aria-label={showSignUpPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        >
                          {showSignUpPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[#374151]">
                        {t("auth.confirmPassword", "Confirmer le mot de passe")}
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                        <Input
                          type="password"
                          className="h-11 rounded-lg border-[#D1D5DB] bg-white pl-10"
                          placeholder={t("auth.placeholders.password", "••••••••")}
                          value={signUpData.confirmPassword}
                          onChange={(e) =>
                            setSignUpData({
                              ...signUpData,
                              confirmPassword: e.target.value,
                            })
                          }
                          required
                          minLength={8}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="h-11 w-full rounded-lg bg-[#16A34A] text-base font-semibold text-white hover:bg-[#15803D]"
                      disabled={isLoading}
                    >
                      {isLoading
                        ? t("auth.buttons.signUpLoading", "Inscription...")
                        : t("auth.buttons.signUp", "Créer un compte")}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>

            <div className="text-center">
              <Link
                to="/"
                className="text-sm font-medium text-[#4B5563] transition-colors hover:text-[#111827]"
              >
                {t("auth.buttons.backToHome", "← Retour à l'accueil")}
              </Link>
            </div>
          </div>
        </main>

        {/* Right visual panel */}
        <aside className="relative hidden md:block min-h-screen overflow-hidden">
          <img
            src={AUTH_HERO_SRC}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[35%_70%]"
            decoding="sync"
            loading="eager"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#073F35]/55 via-[#073F35]/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white">
            <p className="max-w-md text-xl font-semibold tracking-tight">
              Mesurez, réduisez, agissez.
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/85">
              La plateforme carbone pour piloter votre trajectoire climatique.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Auth;
