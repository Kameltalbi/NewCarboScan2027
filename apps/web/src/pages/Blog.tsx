
import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { BlogContent } from "@/components/blog/BlogContent";

const Blog = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <main className="flex-grow">
        <BlogContent />
      </main>
      <NewFooter />
    </div>
  );
};

export default Blog;
