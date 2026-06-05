import { afterEach, describe, expect, it, vi } from "vitest";

import { surfaceRenderHref } from "./surfaceOrigin.js";

function stubLocation({ protocol = "https:", hostname, port = "" }) {
  vi.stubGlobal("location", { protocol, hostname, port });
}

describe("surfaceRenderHref", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("свопит первый DNS-лейбл на surfaces с продуктового хоста", () => {
    stubLocation({ hostname: "assistant.arkham.void" });
    expect(surfaceRenderHref("/surfaces/inventory.overview")).toBe(
      "https://surfaces.arkham.void/surfaces/inventory.overview"
    );
  });

  it("работает и с atrium-хоста", () => {
    stubLocation({ hostname: "atrium.arkham.void" });
    expect(surfaceRenderHref("/surfaces/freeform.overview")).toBe(
      "https://surfaces.arkham.void/surfaces/freeform.overview"
    );
  });

  it("на самом surfaces-хосте остаётся тем же origin (no-op swap)", () => {
    stubLocation({ hostname: "surfaces.arkham.void" });
    expect(surfaceRenderHref("/surfaces/inventory.overview")).toBe(
      "https://surfaces.arkham.void/surfaces/inventory.overview"
    );
  });

  it("сохраняет порт", () => {
    stubLocation({ hostname: "assistant.example.com", port: "8443" });
    expect(surfaceRenderHref("/surfaces/x")).toBe("https://surfaces.example.com:8443/surfaces/x");
  });

  it("нормализует renderPath без ведущего слеша", () => {
    stubLocation({ hostname: "assistant.arkham.void" });
    expect(surfaceRenderHref("surfaces/x")).toBe("https://surfaces.arkham.void/surfaces/x");
  });

  it("на localhost остаётся относительным (нет субдомена для свопа)", () => {
    stubLocation({ hostname: "localhost", port: "5173" });
    expect(surfaceRenderHref("/surfaces/x")).toBe("/surfaces/x");
  });

  it("на IPv4-хосте остаётся относительным", () => {
    stubLocation({ hostname: "127.0.0.1" });
    expect(surfaceRenderHref("/surfaces/x")).toBe("/surfaces/x");
  });

  it("на single-label хосте остаётся относительным", () => {
    stubLocation({ hostname: "bee" });
    expect(surfaceRenderHref("/surfaces/x")).toBe("/surfaces/x");
  });
});
