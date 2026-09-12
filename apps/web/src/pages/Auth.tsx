import React, { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
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
  const [activeTab, setActiveTab] = useState("signin");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, refresh, user } = useAuth();

  const [signInData, setSignInData] = useState({ email: "", password: "" });
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await api.login(signInData.email, signInData.password);
      await refresh();
      analytics.login();
      toast({ title: "Connexion réussie" });
      navigate(postLoginPath(data.user), { replace: true });
    } catch (error) {
      logger.error(error);
      toast({
        title: "Erreur de connexion",
        description: error instanceof Error ? error.message : "Identifiants invalides",
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
        title: "Mot de passe",
        description: "Les mots de passe ne correspondent pas",
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
      toast({ title: "Compte créé" });
      navigate("/app/dashboard");
    } catch (error) {
      logger.error(error);
      toast({
        title: "Inscription impossible",
        description: error instanceof Error ? error.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F7FAF8]">
      {/* Left visual panel */}
      <aside className="relative hidden lg:block min-h-screen overflow-hidden">
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
          <p className="font-semibold text-xl tracking-tight max-w-md">
            Mesurez, réduisez, agissez.
          </p>
          <p className="mt-2 text-sm text-white/85 max-w-sm leading-relaxed">
            La plateforme carbone pour piloter votre trajectoire climatique.
          </p>
        </div>
      </aside>

      {/* Mobile hero strip */}
      <div className="relative h-40 sm:h-48 lg:hidden overflow-hidden">
        <img
          src={AUTH_HERO_SRC}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[40%_55%]"
          decoding="sync"
          loading="eager"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#073F35]/40 to-transparent" />
      </div>

      {/* Right form panel */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-3 text-center lg:text-left">
            <div className="flex justify-center lg:justify-start">
              <BrandLogo variant="light" className="h-11" priority />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#073F35]">
                {t("auth.title", "Connexion")}
              </h1>
              <p className="mt-1 text-sm text-[#53645E]">
                Accédez à votre espace CarboScan
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 w-full bg-[#E8F0EC]">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-9 bg-white border-[#DCE5E0]"
                      value={signInData.email}
                      onChange={(e) =>
                        setSignInData({ ...signInData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="pl-9 pr-10 bg-white border-[#DCE5E0]"
                      value={signInData.password}
                      onChange={(e) =>
                        setSignInData({ ...signInData, password: e.target.value })
                      }
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-[#53645E]"
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
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#073F35] hover:bg-[#0A5246]"
                  disabled={isLoading}
                >
                  {isLoading ? "..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9 bg-white border-[#DCE5E0]"
                      value={signUpData.fullName}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, fullName: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Entreprise</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9 bg-white border-[#DCE5E0]"
                      value={signUpData.company}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, company: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    className="bg-white border-[#DCE5E0]"
                    value={signUpData.email}
                    onChange={(e) =>
                      setSignUpData({ ...signUpData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mot de passe</Label>
                  <Input
                    type="password"
                    className="bg-white border-[#DCE5E0]"
                    value={signUpData.password}
                    onChange={(e) =>
                      setSignUpData({ ...signUpData, password: e.target.value })
                    }
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirmer</Label>
                  <Input
                    type="password"
                    className="bg-white border-[#DCE5E0]"
                    value={signUpData.confirmPassword}
                    onChange={(e) =>
                      setSignUpData({
                        ...signUpData,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                    minLength={8}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#073F35] hover:bg-[#0A5246]"
                  disabled={isLoading}
                >
                  {isLoading ? "..." : "Créer mon compte"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Auth;
