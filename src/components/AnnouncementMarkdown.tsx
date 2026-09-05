"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { memo } from "react";
import { announcementUrl } from "@/lib/announcement";

function AnnouncementMarkdown({ content }: { content: string }) {
  return (
    <div className="announcement-markdown">
      <Markdown remarkPlugins={[remarkGfm]} skipHtml
        allowedElements={["p", "br", "strong", "em", "del", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", "blockquote", "code", "pre", "hr", "table", "thead", "tbody", "tr", "th", "td"]}
        urlTransform={announcementUrl}
        components={{ a: ({ href, children }) => href ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span> }}
      >{content}</Markdown>
    </div>
  );
}

export default memo(AnnouncementMarkdown);
