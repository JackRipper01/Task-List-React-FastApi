// src/library/utils.tsx

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react";
import { UserRound, Hash, Mail, Link as LinkIcon } from "lucide-react"; // Import necessary icons

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Define the types for the parsed segments to include metadata for icons and text
export interface ParsedSegment {
  type: "text" | "mention" | "hashtag" | "email" | "link";
  value: string; // The original matched text (e.g., "@username", "#tag", "email@example.com", "http://...")
}

export function parseAndStyleTaskText(text: string): {
  nodes: React.ReactNode[];
  segments: ParsedSegment[];
} {
  const nodes: React.ReactNode[] = [];
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;

  // Regex to capture mentions, hashtags, emails, and links
  // The groups are:
  // (1) mention: @([a-zA-Z0-9_-]+)
  // (2) hashtag: #([a-zA-Z0-9_-]+)
  // (3) email: \b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b
  // (4) link: \b((?:https?:\/\/(?:www\.)?|www\.)\S+)\b
  const regex =
    /(?:@([a-zA-Z0-9_-]+))|(?:#([a-zA-Z0-9_-]+))|(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)|(\b(?:https?:\/\/(?:www\.)?|www\.)\S+\b)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, mentionGroup, hashtagGroup, emailGroup, linkGroup] =
      match;

    // Add preceding text segment
    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index));
      segments.push({
        type: "text",
        value: text.substring(lastIndex, match.index),
      });
    }

    const key = `segment-${match.index}-${fullMatch.length}`;

    // Helper to generate the "globe" span
    const createTagGlobe = (
      IconComponent: React.ElementType,
      displayValue: string, // The text to display inside the globe
      bgColorClass: string,
      textColorClass: string,
      isLink: boolean = false,
      href?: string // Only for actual links
    ) => {
      const globeContent = (
        <span
          key={key}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap align-middle",
            bgColorClass,
            textColorClass,
            isLink ? "cursor-pointer" : "cursor-pointer"
          )}
        >
          <IconComponent className="h-3 w-3" />
          {displayValue}
        </span>
      );

      if (isLink && href) {
        // Ensure links starting with www. are properly formatted with http://
        const actualHref = href.startsWith("www.") ? `http://${href}` : href;
        return (
          <a
            key={key}
            href={actualHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            {globeContent}
          </a>
        );
      }
      return globeContent;
    };

    if (mentionGroup) {
      nodes.push(
        createTagGlobe(
          UserRound,
          mentionGroup, // MODIFIED: Pass just the captured group, no "@" prefix
          "bg-tag-mention-bg",
          "text-tag-mention-text"
        )
      );
      segments.push({ type: "mention", value: `@${mentionGroup}` });
    } else if (hashtagGroup) {
      nodes.push(
        createTagGlobe(
          Hash,
          hashtagGroup, // MODIFIED: Pass just the captured group, no "#" prefix
          "bg-tag-hashtag-bg",
          "text-tag-hashtag-text"
        )
      );
      segments.push({ type: "hashtag", value: `#${hashtagGroup}` });
    } else if (emailGroup) {
      nodes.push(
        createTagGlobe(
          Mail,
          "Email",
          "bg-tag-email-bg",
          "text-tag-email-text",
          true,
          `mailto:${emailGroup}`
        )
      );
      segments.push({ type: "email", value: emailGroup });
    } else if (linkGroup) {
      nodes.push(
        createTagGlobe(
          LinkIcon,
          "Link",
          "bg-tag-link-bg",
          "text-tag-link-text",
          true,
          linkGroup
        )
      );
      segments.push({ type: "link", value: linkGroup });
    }

    lastIndex = regex.lastIndex;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
    segments.push({ type: "text", value: text.substring(lastIndex) });
  }

  return { nodes, segments };
}
