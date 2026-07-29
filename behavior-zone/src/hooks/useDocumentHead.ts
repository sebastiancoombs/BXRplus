import { useEffect } from "react";

type Options = {
  title?: string;
  description?: string;
  canonical?: string;
};

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${name}"]`
  );
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setCanonical(href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

// Per-route document head tweaks. Crawlers that execute JS will pick these up;
// the static markup in index.html handles the bots that don't.
export function useDocumentHead({ title, description, canonical }: Options) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      setMeta("description", description);
      setMeta("og:description", description, "property");
      setMeta("twitter:description", description);
    }
    if (title) {
      setMeta("og:title", title, "property");
      setMeta("twitter:title", title);
    }
    if (canonical) setCanonical(canonical);
  }, [title, description, canonical]);
}
