import React, { useState } from "react";
import { api } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeHtml } from "@/components/SafeHtml";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Upload, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { EditorToolbar } from "@/components/admin-blog/EditorToolbar";

export interface BlogPostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  author_name: string | null;
  featured_image_url: string | null;
  published_at: string | null;
  created_at: string;
  status: string;
  tags: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  language: string | null;
}

interface Props {
  post: BlogPostRow | null;
  userId: string;
  userEmail: string;
  onClose: () => void;
}

const slugify = (s: string) => s.toLowerCase().trim()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const BlogPostEditor: React.FC<Props> = ({ post, userId, userEmail, onClose }) => {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [authorName, setAuthorName] = useState(post?.author_name ?? userEmail.split("@")[0]);
  const [featuredImage, setFeaturedImage] = useState(post?.featured_image_url ?? "");
  const [status, setStatus] = useState(post?.status ?? "draft");
  const [language, setLanguage] = useState(post?.language ?? "fr");
  const [tags, setTags] = useState((post?.tags ?? []).join(", "));
  const [metaTitle, setMetaTitle] = useState(post?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(post?.meta_description ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);

  const uploadImage = async (file: File, insertInContent = false) => {
    setUploading(true);
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setUploading(false);
    if (insertInContent) {
      setContent(c => c + `\n<img src="${url}" alt="${file.name}" />\n`);
    }
    return url;
  };

  const save = async () => {
    if (!title.trim()) { toast.error("Titre requis"); return; }
    const finalSlug = slug.trim() || slugify(title);
    setSaving(true);
    const payload = {
      title: title.trim(),
      slug: finalSlug,
      excerpt: excerpt || null,
      content,
      authorName: authorName || null,
      featuredImageUrl: featuredImage || null,
      status,
      language,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
    };
    try {
      if (post) await api.adminPatchBlog(post.id, payload);
      else await api.adminCreateBlog(payload);
      toast.success(post ? "Article mis à jour" : "Article créé");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onClose}><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreview(p => !p)}><Eye className="w-4 h-4 mr-2" />{preview ? "Éditer" : "Aperçu"}</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </div>

        {preview ? (
          <Card>
            <CardContent className="p-8 prose max-w-none">
              <h1>{title}</h1>
              {featuredImage && <img src={featuredImage} alt={title} className="rounded-lg" />}
              {excerpt && <p className="lead italic text-muted-foreground">{excerpt}</p>}
              <SafeHtml html={content} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle>Contenu</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Titre *</Label>
                    <Input value={title} onChange={e => { setTitle(e.target.value); if (!post && !slug) setSlug(slugify(e.target.value)); }} />
                  </div>
                  <div>
                    <Label>Slug URL</Label>
                    <Input value={slug} onChange={e => setSlug(slugify(e.target.value))} placeholder="mon-article" />
                    <p className="text-xs text-muted-foreground mt-1">URL: /blog/{slug || slugify(title) || "..."}</p>
                  </div>
                  <div>
                    <Label>Résumé (extrait)</Label>
                    <Textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2} />
                  </div>
                  <div>
                    <Label>Contenu (HTML)</Label>
                    <div className="mt-1 space-y-2">
                      <EditorToolbar textareaId="blog-content" value={content} onChange={setContent} />
                      <Textarea id="blog-content" value={content} onChange={e => setContent(e.target.value)} rows={20} className="font-mono text-sm" placeholder="<p>Votre article...</p>" />
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <input type="file" accept="image/*" id="content-img" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, true); e.target.value = ""; }} />
                      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById("content-img")?.click()}>
                        {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        Insérer une image dans le contenu
                      </Button>
                      <span className="text-xs text-muted-foreground">HTML autorisé: &lt;p&gt; &lt;h2&gt; &lt;a&gt; &lt;img&gt; &lt;ul&gt; &lt;strong&gt;...</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Publication</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Statut</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Brouillon</SelectItem>
                        <SelectItem value="published">Publié</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Langue</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Auteur</Label>
                    <Input value={authorName} onChange={e => setAuthorName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Tags (séparés par virgule)</Label>
                    <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="carbone, CSRD" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Image mise en avant</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {featuredImage && <img src={featuredImage} alt="" className="rounded border w-full" />}
                  <Input value={featuredImage} onChange={e => setFeaturedImage(e.target.value)} placeholder="URL de l'image" />
                  <input type="file" accept="image/*" id="featured-img" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (f) { const url = await uploadImage(f); if (url) setFeaturedImage(url); } e.target.value = ""; }} />
                  <Button type="button" variant="outline" size="sm" className="w-full" disabled={uploading} onClick={() => document.getElementById("featured-img")?.click()}>
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Uploader une image
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>SEO</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Meta title</Label>
                    <Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} maxLength={60} />
                  </div>
                  <div>
                    <Label>Meta description</Label>
                    <Textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} rows={3} maxLength={160} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
