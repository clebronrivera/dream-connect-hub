import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resolveSeoMetadata, type SeoPageId } from "@/lib/seo";

type SeoProps = {
  pageId?: SeoPageId;
  title?: string;
  description?: string;
  canonicalPath?: string;
  robots?: string;
  imageUrl?: string;
};

export function Seo({ pageId, title, description, canonicalPath, robots, imageUrl }: SeoProps) {
  const location = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    const metadata = resolveSeoMetadata({
      pageId,
      title,
      description,
      canonicalPath: canonicalPath ?? location.pathname,
      robots,
      imageUrl,
      language:
        i18n.resolvedLanguage === "pt" || i18n.resolvedLanguage === "es"
          ? i18n.resolvedLanguage
          : "en",
    });

    document.title = metadata.title;

    upsertMetaTag("name", "description", metadata.description);
    upsertMetaTag("name", "author", metadata.author);
    upsertMetaTag("name", "robots", metadata.robots);
    upsertMetaTag("name", "googlebot", metadata.robots);
    upsertMetaTag("property", "og:site_name", metadata.siteName);
    upsertMetaTag("property", "og:type", metadata.ogType);
    upsertMetaTag("property", "og:title", metadata.title);
    upsertMetaTag("property", "og:description", metadata.description);
    upsertMetaTag("property", "og:url", metadata.canonicalUrl);
    upsertMetaTag("name", "twitter:card", metadata.twitterCard);
    upsertMetaTag("name", "twitter:title", metadata.title);
    upsertMetaTag("name", "twitter:description", metadata.description);
    upsertLinkTag("canonical", metadata.canonicalUrl);

    if (metadata.socialImage) {
      upsertMetaTag("property", "og:image", metadata.socialImage);
      upsertMetaTag("name", "twitter:image", metadata.socialImage);
    } else {
      removeTag(`meta[property="og:image"]`);
      removeTag(`meta[name="twitter:image"]`);
    }
  }, [
    canonicalPath,
    description,
    i18n.resolvedLanguage,
    imageUrl,
    location.pathname,
    pageId,
    robots,
    title,
  ]);

  return null;
}

function upsertMetaTag(attribute: "name" | "property", key: string, content: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

function upsertLinkTag(rel: string, href: string) {
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function removeTag(selector: string) {
  document.head.querySelector(selector)?.remove();
}
