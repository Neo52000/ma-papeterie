import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("returns empty string for falsy input", () => {
    expect(sanitizeHtml("")).toBe("");
    expect(sanitizeHtml(null as any)).toBe("");
    expect(sanitizeHtml(undefined as any)).toBe("");
  });

  it("preserves safe HTML", () => {
    const html = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtml(html)).toBe('<p>Hello <strong>world</strong></p>');
  });

  it("preserves links with valid href", () => {
    const html = '<a href="https://example.com">link</a>';
    expect(sanitizeHtml(html)).toContain('href="https://example.com"');
  });

  // -- Script injection --
  it("removes <script> tags", () => {
    const html = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
    expect(result).toContain("Hello");
  });

  it("removes <script> tags with attributes", () => {
    const html = '<script src="https://evil.com/xss.js"></script><p>safe</p>';
    expect(sanitizeHtml(html)).not.toContain("<script");
  });

  // -- Dangerous tags --
  it("removes <iframe> tags", () => {
    const html = '<iframe src="https://evil.com"></iframe>';
    expect(sanitizeHtml(html)).not.toContain("<iframe");
  });

  it("removes <object>, <embed>, <applet> tags", () => {
    const html = '<object data="x"></object><embed src="y"><applet code="z"></applet>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<object");
    expect(result).not.toContain("<embed");
    expect(result).not.toContain("<applet");
  });

  it("removes <form>, <input>, <textarea>, <select>, <button> tags", () => {
    const html = '<form><input type="text"><textarea></textarea><select></select><button>click</button></form>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<form");
    expect(result).not.toContain("<input");
    expect(result).not.toContain("<textarea");
    expect(result).not.toContain("<select");
    expect(result).not.toContain("<button");
  });

  it("removes <svg> and <math> tags", () => {
    const html = '<svg onload="alert(1)"><circle></circle></svg><math><mi>x</mi></math>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<svg");
    expect(result).not.toContain("<math");
  });

  it("removes <link>, <meta>, <base> tags", () => {
    const html = '<link rel="stylesheet" href="x"><meta http-equiv="refresh"><base href="/">';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<link");
    expect(result).not.toContain("<meta");
    expect(result).not.toContain("<base");
  });

  // -- Event handler attributes --
  it("removes onclick attribute", () => {
    const html = '<div onclick="alert(1)">Click me</div>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("onclick");
    expect(result).toContain("Click me");
  });

  it("removes onerror attribute", () => {
    const html = '<img src="x" onerror="alert(1)">';
    expect(sanitizeHtml(html)).not.toContain("onerror");
  });

  it("removes onload, onmouseover, onfocus attributes", () => {
    const html = '<div onload="x" onmouseover="y" onfocus="z">safe</div>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("onload");
    expect(result).not.toContain("onmouseover");
    expect(result).not.toContain("onfocus");
  });

  // -- javascript: URLs --
  it("removes javascript: hrefs", () => {
    const html = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("javascript:");
  });

  it("removes data:text/html hrefs", () => {
    const html = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("data:text/html");
  });

  // -- Style injection --
  it("removes style with expression()", () => {
    const html = '<div style="width:expression(alert(1))">text</div>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("expression");
  });

  it("removes style with url()", () => {
    const html = '<div style="background:url(javascript:alert(1))">text</div>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("url(");
  });

  it("keeps safe style attributes", () => {
    const html = '<div style="color: red; font-size: 14px">text</div>';
    expect(sanitizeHtml(html)).toContain("color: red");
  });

  // -- Complex / nested attacks --
  it("handles nested dangerous elements", () => {
    const html = '<div><p><script>alert(1)</script></p></div>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<script");
    expect(result).toContain("<div>");
  });

  it("handles Shopify product description HTML", () => {
    const shopifyHtml = `
      <h2>Stylo Bic Cristal</h2>
      <p>Stylo bille classique, pointe <strong>moyenne 1mm</strong>.</p>
      <ul><li>Encre longue durée</li><li>Corps hexagonal</li></ul>
    `;
    const result = sanitizeHtml(shopifyHtml);
    expect(result).toContain("<h2>");
    expect(result).toContain("<strong>");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>");
  });
});
