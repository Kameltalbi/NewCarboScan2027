import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppData } from "@/contexts/AppDataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, ExternalLink, LogOut } from "lucide-react";
import { toast } from "sonner";
import { BlogPostEditor, BlogPostRow } from "@/components/admin-blog/BlogPostEditor";

const AdminBlog: React.FC = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { userRole, roleLoading, isSuperAdmin } = useAppData();
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPostRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [isBlogEditor, setIsBlogEditor] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    if (!user) { setRoleChecked(true); return; }
    setIsBlogEditor(isSuperAdmin);
    setRoleChecked(true);
  }, [user, isSuperAdmin]);

  const loadPosts = async () => {
    setLoading(true);
    const { items } = await api.adminListBlog();
    setPosts((items as unknown as BlogPostRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (isBlogEditor) loadPosts(); }, [isBlogEditor]);

  if (authLoading || roleLoading || !roleChecked) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }
  if (!user) return <Navigate to="/auth?redirect=/admin/blog" replace />;
  if (!isBlogEditor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader><CardTitle>Accès refusé</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Vous n'avez pas les droits pour éditer le blog.</p>
            <Button onClick={() => signOut()}>Se déconnecter</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (creating || editing) {
    return (
      <BlogPostEditor
        post={editing}
        userId={user.id}
        userEmail={user.email ?? ""}
        onClose={() => { setEditing(null); setCreating(false); loadPosts(); }}
      />
    );
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet article ?")) return;
    try {
      await api.adminDeleteBlog(id);
      toast.success("Supprimé");
      loadPosts();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const togglePublish = async (post: BlogPostRow) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    try {
      await api.adminPatchBlog(post.id, { status: newStatus });
      toast.success(newStatus === "published" ? "Publié" : "Dépublié");
      loadPosts();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Administration du blog</h1>
            <p className="text-muted-foreground text-sm">Connecté en tant que {user.email}{isSuperAdmin ? " (superadmin)" : " (rédacteur)"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => signOut()}><LogOut className="w-4 h-4 mr-2" />Déconnexion</Button>
            <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" />Nouvel article</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : posts.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun article. Cliquez sur "Nouvel article" pour commencer.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {posts.map(post => (
              <Card key={post.id}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={post.status === "published" ? "default" : "secondary"}>
                        {post.status === "published" ? "Publié" : "Brouillon"}
                      </Badge>
                      {post.language && <Badge variant="outline">{post.language.toUpperCase()}</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {post.published_at ? new Date(post.published_at).toLocaleDateString("fr-FR") : new Date(post.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <h3 className="font-semibold truncate">{post.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">/{post.slug}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {post.status === "published" && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => togglePublish(post)}>
                      {post.status === "published" ? "Dépublier" : "Publier"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(post)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(post.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBlog;
