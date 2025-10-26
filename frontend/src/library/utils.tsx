// src/library/utils.tsx (previously src/library/utils.ts)

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react"; // NEW: Ensure React is imported for JSX

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseAndStyleTaskText(text: string): React.ReactNode[] {
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;

  // Regex to capture mentions, hashtags, emails, and links
  // Order matters for overlapping patterns (e.g., email vs link)
  // Updated regex to be more precise for emails and URLs, and capture the full match for styling.
  const regex =
    /(?:@(\w+))|(?:#(\w+))|(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)|(\bhttps?:\/\/(?:www\.)?\S+\b)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, mention, hashtag, email, link] = match;

    // Add preceding text segment
    if (match.index > lastIndex) {
      segments.push(text.substring(lastIndex, match.index));
    }

    // Add the special segment with unique key for React list rendering
    const key = `segment-${match.index}-${fullMatch.length}`;

    if (mention) {
      segments.push(
        <span
          key={key}
          className="text-tag-mention font-semibold cursor-pointer"
        >
          @{mention}
        </span>
      );
    } else if (hashtag) {
      segments.push(
        <span
          key={key}
          className="text-tag-hashtag font-semibold cursor-pointer"
        >
          #{hashtag}
        </span>
      );
    } else if (email) {
      segments.push(
        <span key={key} className="text-tag-email font-semibold cursor-pointer">
          {email}
        </span>
      );
    } else if (link) {
      segments.push(
        <a
          key={key}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-tag-link underline cursor-pointer"
        >
          {link}
        </a>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    segments.push(text.substring(lastIndex));
  }

  return segments;
}
