import type { MetadataRoute } from "next";

import { absoluteUrl } from "../lib/seo";
import { loadPublicProjects } from "../lib/public-api";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await loadPublicProjects();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/projects"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/transparency"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/services"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/about"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/contact"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const projectRoutes: MetadataRoute.Sitemap = projects.items.map(
    (project) => ({
      url: absoluteUrl(
        "/projects/" + encodeURIComponent(project.slug),
      ),
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  return [...staticRoutes, ...projectRoutes];
}
