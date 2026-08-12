import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, Mail, Calendar, User } from "lucide-react";
import { OptimizedBlogImage } from "./OptimizedBlogImage";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/integrations/api/client";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author_name: string;
  featured_image_url?: string;
  published_at?: string;
  status: string;
  tags: string[];
  meta_title?: string;
  meta_description?: string;
  created_at: string;
}

export const BlogContent: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [i18n.language]);

  const fetchPosts = async () => {
    try {
      const currentLang = (i18n.language || 'fr').substring(0, 2);
      const { items } = await api.listBlog(currentLang);
      setPosts((items as BlogPost[]) || []);
    } catch (error) {
      console.error('❌ BlogContent: Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4 md:px-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des articles...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-6">{t("blog.title")}</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          {t("blog.subtitle")}
        </p>
      </div>

      {posts.length > 0 ? (
        <>
          {/* Blog Posts Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {posts.map((post) => (
              <Card key={post.id} className="h-full hover:shadow-lg transition-shadow">
                {post.featured_image_url && (
                  <OptimizedBlogImage
                    src={post.featured_image_url}
                    alt={post.title}
                    className="rounded-t-lg hover:scale-105 transition-transform duration-300"
                  />
                )}
                <CardHeader>
                  <div className="space-y-2">
                    <CardTitle className="line-clamp-2">
                      <Link to={`/blog/${post.slug.replace(/^\//, '')}`} className="hover:text-primary">
                        {post.title}
                      </Link>
                    </CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground space-x-4">
                      {post.published_at && (
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {new Date(post.published_at).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR')}
                        </div>
                      )}
                      {post.author_name && (
                        <div className="flex items-center">
                          <User className="mr-1 h-3 w-3" />
                          {post.author_name}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {post.excerpt && (
                    <p className="text-muted-foreground line-clamp-3">{post.excerpt}</p>
                  )}
                  {(post.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(post.tags ?? []).slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" asChild className="w-full">
                    <Link to={`/blog/${post.slug.replace(/^\//, '')}`}>
                      {t("blog.readMore", "Lire l'article")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Introduction */}
          <div className="max-w-3xl mx-auto mb-16">
            <p className="text-lg text-gray-700 mb-6">
              {t("blog.intro.content")}
            </p>
            <ul className="list-disc space-y-3 pl-6 text-gray-700 mb-6">
              {(t("blog.intro.points", { returnObjects: true }) as string[]).map((point: string, index: number) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>

          {/* Main Message */}
          <div className="bg-gray-50 rounded-lg p-8 max-w-3xl mx-auto text-center mb-16">
            <BookOpen className="h-12 w-12 mx-auto mb-6 text-primary" />
            <h2 className="text-2xl font-semibold mb-4">
              📘 {t("blog.comingSoon.title")}
            </h2>
            <p className="text-gray-600 mb-8">
              {t("blog.comingSoon.subtitle")}
            </p>
            <Link to="/contact">
              <Button size="lg" className="bg-primary hover:bg-green-600 text-white">
                {t("blog.comingSoon.contact")}
              </Button>
            </Link>
          </div>
        </>
      )}

      {/* Newsletter Signup */}
      <div className="max-w-2xl mx-auto text-center bg-white rounded-lg border border-gray-200 p-8">
        <h3 className="text-xl font-medium mb-4">
          {t("blog.newsletter.title")}
        </h3>
        <p className="text-gray-600 mb-6">
          📩 {t("blog.newsletter.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder={t("blog.newsletter.placeholder")}
            className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button className="bg-primary hover:bg-green-600 text-white">
            <Mail className="mr-2 h-4 w-4" /> {t("blog.newsletter.subscribe")}
          </Button>
        </div>
      </div>
    </div>
  );
};