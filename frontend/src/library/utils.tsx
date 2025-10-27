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

// Regex to capture mentions, hashtags, emails, and links
// - Mentions: @ followed by any non-whitespace characters
// - Hashtags: # followed by any non-whitespace characters
// - Emails: A more robust pattern for email addresses (naturally stops at whitespace)
// - Links: Starts with http(s):// or www. and followed by any non-whitespace characters
const TAG_REGEX =
  /(?:@(\S+))|(?:#(\S+))|(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)|((?:https?:\/\/(?:www\.)?|www\.)\S+)/g;

// --- Function for rendering tags as "globes" with icons in TaskItem (MODIFIED) ---
export function parseAndStyleTaskText(text: string): {
  nodes: React.ReactNode[];
  segments: ParsedSegment[];
} {
  const nodes: React.ReactNode[] = [];
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;

  let match;
  // Reset the regex lastIndex before each execution
  TAG_REGEX.lastIndex = 0;
  while ((match = TAG_REGEX.exec(text)) !== null) {
    const [fullMatch, mentionContent, hashtagContent, emailFull, linkFull] =
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
      hoverBgClass: string, // NEW: Added hover background class
      isLink: boolean = false,
      href?: string
    ) => {
      // Dummy onClick for now, as functionality is not required yet
      const handleTagClick = (event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent triggering parent onClick (e.g., task item edit)
        console.log(`Tag clicked: ${displayValue}`);
        // No functionality yet, as per request.
      };

      const globeContent = (
        <span
          key={key}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap align-baseline cursor-pointer transition-colors duration-150", // Added transition-colors
            bgColorClass,
            textColorClass,
            hoverBgClass // NEW: Added hover background class
          )}
          onClick={handleTagClick} // ADDED onClick handler
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
            className="inline-flex" // Removed redundant cursor-pointer, it's already on globeContent
            onClick={handleTagClick} // Also add onClick to links for consistency in console logging
          >
            {globeContent}
          </a>
        );
      }
      return globeContent;
    };

    if (mentionContent) {
      nodes.push(
        createTagGlobe(
          UserRound,
          mentionContent,
          "bg-tag-mention-bg",
          "text-tag-mention-text",
          "hover:bg-tag-mention-hover-bg" // NEW: Added hover class
        )
      );
      segments.push({ type: "mention", value: `@${mentionContent}` });
    } else if (hashtagContent) {
      nodes.push(
        createTagGlobe(
          Hash,
          hashtagContent,
          "bg-tag-hashtag-bg",
          "text-tag-hashtag-text",
          "hover:bg-tag-hashtag-hover-bg" // NEW: Added hover class
        )
      );
      segments.push({ type: "hashtag", value: `#${hashtagContent}` });
    } else if (emailFull) {
      nodes.push(
        createTagGlobe(
          Mail,
          emailFull, // Display full email
          "bg-tag-email-bg",
          "text-tag-email-text",
          "hover:bg-tag-email-hover-bg", // NEW: Added hover class
          true,
          `mailto:${emailFull}`
        )
      );
      segments.push({ type: "email", value: emailFull });
    } else if (linkFull) {
      nodes.push(
        createTagGlobe(
          LinkIcon,
          linkFull, // Display full link
          "bg-tag-link-bg",
          "text-tag-link-text",
          "hover:bg-tag-link-hover-bg", // NEW: Added hover class
          true,
          linkFull
        )
      );
      segments.push({ type: "link", value: linkFull });
    }

    lastIndex = TAG_REGEX.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
    segments.push({ type: "text", value: text.substring(lastIndex) });
  }

  return { nodes, segments };
}

// --- Function for real-time inline text coloring in Textarea (UNCHANGED) ---
export function parseTextForInlineStyling(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  let match;
  // Reset the regex lastIndex before each execution
  TAG_REGEX.lastIndex = 0;
  while ((match = TAG_REGEX.exec(text)) !== null) {
    const [fullMatch, mentionContent, hashtagContent, emailFull, linkFull] =
      match;

    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index));
    }

    const key = `inline-segment-${match.index}-${fullMatch.length}`;
    let textColorClass: string;
    let displayValue: string;

    if (mentionContent) {
      textColorClass = "text-tag-mention-text";
      displayValue = `@${mentionContent}`;
    } else if (hashtagContent) {
      textColorClass = "text-tag-hashtag-text";
      displayValue = `#${hashtagContent}`;
    } else if (emailFull) {
      textColorClass = "text-tag-email-text";
      displayValue = emailFull;
    } else if (linkFull) {
      textColorClass = "text-tag-link-text";
      displayValue = linkFull;
    } else {
      textColorClass = "";
      displayValue = fullMatch;
    }

    nodes.push(
      <span key={key} className={cn(textColorClass, "font-semibold")}>
        {displayValue}
      </span>
    );

    lastIndex = TAG_REGEX.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes;
}
