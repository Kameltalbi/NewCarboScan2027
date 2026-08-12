import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Tag } from "lucide-react";
import { OptimizedBlogImage } from "@/components/blog/OptimizedBlogImage";
import { api } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author_name: string;
  featured_image_url?: string;
  published_at?: string;
  status?: string;
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
  created_at: string;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const { post: data } = await api.getBlogPost(slug);
        if (!cancelled) setPost(data as unknown as BlogPostData);
      } catch (error) {
        console.error("Error fetching blog post:", error);
        if (!cancelled) {
          setPost(null);
          toast({
            title: "Erreur",
            description: "Impossible de charger l'article",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, i18n.language, toast, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <MainHeader />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-2 text-muted-foreground">Chargement de l'article...</p>
          </div>
        </main>
        <NewFooter />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col">
        <MainHeader />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Article introuvable</h1>
            <Button asChild>
              <Link to="/blog">Retour au blog</Link>
            </Button>
          </div>
        </main>
        <NewFooter />
      </div>
    );
  }

  const safeHtml = DOMPurify.sanitize(post.content ?? "", {
    USE_PROFILES: { html: true },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <main className="flex-grow">
        <article className="container mx-auto py-12 px-4 md:px-6 max-w-4xl">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/blog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>

          {post.featured_image_url && (
            <OptimizedBlogImage
              src={post.featured_image_url}
              alt={post.title}
              className="w-full h-72 object-cover rounded-xl mb-8"
            />
          )}

          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              {post.author_name && (
                <span className="inline-flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {post.author_name}
                </span>
              )}
              {(post.published_at || post.created_at) && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(post.published_at || post.created_at).toLocaleDateString("fr-FR")}
                </span>
              )}
            </div>
            {(post.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {post.tags!.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        </article>
      </main>
      <NewFooter />
    </div>
  );
};

export default BlogPost;
