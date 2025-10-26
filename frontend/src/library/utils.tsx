// src/library/utils.tsx

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react";

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
  // The groups are: (1) mention, (2) hashtag, (3) email, (4) link
  const regex =
    /(?:@([a-zA-Z0-9_]+))|(?:#([a-zA-Z0-9_]+))|(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)|(\bhttps?:\/\/(?:www\.)?\S+\b)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, mention, hashtag, email, link] = match;

    // Add preceding text segment
    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index));
      segments.push({
        type: "text",
        value: text.substring(lastIndex, match.index),
      });
    }

    const key = `segment-${match.index}-${fullMatch.length}`;

    // Note: for real-time styling in input, this is not directly used.
    // This styling applies when the task is displayed in the TaskItem.
    if (mention) {
      nodes.push(
        <span
          key={key}
          className="bg-tag-mention-bg text-tag-mention-text px-1 rounded font-semibold cursor-pointer"
        >
          @{mention}
        </span>
      );
      segments.push({ type: "mention", value: `@${mention}` });
    } else if (hashtag) {
      nodes.push(
        <span
          key={key}
          className="bg-tag-hashtag-bg text-tag-hashtag-text px-1 rounded font-semibold cursor-pointer"
        >
          #{hashtag}
        </span>
      );
      segments.push({ type: "hashtag", value: `#${hashtag}` });
    } else if (email) {
      nodes.push(
        <span
          key={key}
          className="bg-tag-email-bg text-tag-email-text px-1 rounded font-semibold cursor-pointer"
        >
          {email}
        </span>
      );
      segments.push({ type: "email", value: email });
    } else if (link) {
      nodes.push(
        <a
          key={key}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-tag-link-bg text-tag-link-text px-1 rounded underline cursor-pointer"
        >
          {link}
        </a>
      );
      segments.push({ type: "link", value: link });
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
