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

// --- Function for rendering tags as "globes" with icons in TaskItem (MODIFIED) ---
export function parseAndStyleTaskText(text: string): {
  nodes: React.ReactNode[];
  segments: ParsedSegment[];
} {
  const nodes: React.ReactNode[] = [];
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;

  // Regex to capture mentions, hashtags, emails, and links
  const regex =
    /(?:@([a-zA-Z0-9_-]+))|(?:#([a-zA-Z0-9_-]+))|(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)|(\b(?:https?:\/\/(?:www\.)?|www\.)\S+\b)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, mentionGroup, hashtagGroup, emailGroup, linkGroup] =
      match;

    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index));
      segments.push({
        type: "text",
        value: text.substring(lastIndex, match.index),
      });
    }

    const key = `segment-${match.index}-${fullMatch.length}`;

    const createTagGlobe = (
      IconComponent: React.ElementType,
      displayValue: string,
      bgColorClass: string,
      textColorClass: string,
      isLink: boolean = false,
      href?: string
    ) => {
      const globeContent = (
        <span
          key={key}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap align-baseline", // ADDED: align-baseline
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
          mentionGroup,
          "bg-tag-mention-bg",
          "text-tag-mention-text"
        )
      );
      segments.push({ type: "mention", value: `@${mentionGroup}` });
    } else if (hashtagGroup) {
      nodes.push(
        createTagGlobe(
          Hash,
          hashtagGroup,
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

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
    segments.push({ type: "text", value: text.substring(lastIndex) });
  }

  return { nodes, segments };
}

// --- NEW Function for real-time inline text coloring in Textarea ---
export function parseTextForInlineStyling(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  // Same regex as above to detect tags
  const regex =
    /(?:@([a-zA-Z0-9_-]+))|(?:#([a-zA-Z0-9_-]+))|(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)|(\b(?:https?:\/\/(?:www\.)?|www\.)\S+\b)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, mentionGroup, hashtagGroup, emailGroup, linkGroup] =
      match;

    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index));
    }

    const key = `inline-segment-${match.index}-${fullMatch.length}`;
    let textColorClass: string;
    let displayValue: string;

    if (mentionGroup) {
      textColorClass = "text-tag-mention-text";
      displayValue = `@${mentionGroup}`;
    } else if (hashtagGroup) {
      textColorClass = "text-tag-hashtag-text";
      displayValue = `#${hashtagGroup}`;
    } else if (emailGroup) {
      textColorClass = "text-tag-email-text";
      displayValue = emailGroup;
    } else if (linkGroup) {
      textColorClass = "text-tag-link-text";
      displayValue = linkGroup;
    } else {
      textColorClass = "";
      displayValue = fullMatch;
    }

    nodes.push(
      <span key={key} className={cn(textColorClass, "font-semibold")}>
        {displayValue}
      </span>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes;
}
