import { Seo } from "@/components/seo/Seo";
import { NOINDEX_PRIVATE_SEO } from "@/lib/seo";

type PrivatePageSeoProps = {
  /** Fixed public path segment — never pass tokenized URLs. */
  canonicalPath: "/deposit" | "/request-deposit" | "/payment" | "/agreements";
};

/** noindex metadata for buyer reservation / payment flows (not for indexing). */
export function PrivatePageSeo({ canonicalPath }: PrivatePageSeoProps) {
  return (
    <Seo
      title={NOINDEX_PRIVATE_SEO.title}
      description={NOINDEX_PRIVATE_SEO.description}
      robots={NOINDEX_PRIVATE_SEO.robots}
      canonicalPath={canonicalPath}
    />
  );
}
