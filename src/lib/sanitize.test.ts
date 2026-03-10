import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("returns empty string for falsy input", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("preserves plain text", () => {
    expect(sanitizeHtml("Hello world")).toBe("Hello world");
  });

  it("preserves safe HTML tags", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("preserves safe links", () => {
    const input = '<a href="https://example.com">Link</a>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("removes script tags", () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeHtml(input)).toBe("<p>Hello</p>");
  });

  it("removes iframe tags", () => {
    const input = '<div>Content</div><iframe src="evil.com"></iframe>';
    expect(sanitizeHtml(input)).toBe("<div>Content</div>");
  });

  it("removes onclick event handlers", () => {
    const input = '<p onclick="alert(1)">Click me</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onclick");
    expect(result).toContain("Click me");
  });

  it("removes onerror event handlers", () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onerror");
  });

  it("removes javascript: protocol in href", () => {
    const input = '<a href="javascript:alert(1)">Link</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("javascript:");
  });

  it("removes data: protocol in src", () => {
    const input = '<img src="data:text/html,<script>alert(1)</script>">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("data:");
  });

  it("removes style tags", () => {
    const input = "<style>body{display:none}</style><p>Content</p>";
    expect(sanitizeHtml(input)).toBe("<p>Content</p>");
  });

  it("removes form elements", () => {
    const input = '<form action="/steal"><input type="text"></form><p>Safe</p>';
    expect(sanitizeHtml(input)).toBe("<p>Safe</p>");
  });

  it("removes svg tags", () => {
    const input = '<svg onload="alert(1)"><circle r="10"/></svg><p>OK</p>';
    expect(sanitizeHtml(input)).toBe("<p>OK</p>");
  });
});
