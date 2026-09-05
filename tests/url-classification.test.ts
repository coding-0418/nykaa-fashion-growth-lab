import { describe, expect, it } from "vitest";
import {
  classifySourceType,
  labelSourceFromUrl,
  normalizeFetchUrl,
} from "@/lib/retrieval/urls";

describe("classifySourceType", () => {
  it("classifies reddit URLs", () => {
    expect(classifySourceType("https://www.reddit.com/r/x/comments/1/title")).toBe("reddit");
    expect(classifySourceType("https://old.reddit.com/r/x")).toBe("reddit");
  });

  it("classifies youtube URLs", () => {
    expect(classifySourceType("https://www.youtube.com/watch?v=abc")).toBe("youtube");
    expect(classifySourceType("https://youtu.be/abc")).toBe("youtube");
  });

  it("classifies app store / play store URLs as app_store_reviews", () => {
    expect(classifySourceType("https://apps.apple.com/us/app/nykaa/id123")).toBe(
      "app_store_reviews",
    );
    expect(
      classifySourceType("https://play.google.com/store/apps/details?id=com.fsn.nykaa"),
    ).toBe("app_store_reviews");
  });

  it("classifies known review platforms as product_reviews", () => {
    expect(classifySourceType("https://www.trustpilot.com/review/nykaafashion.com")).toBe(
      "product_reviews",
    );
    expect(classifySourceType("https://nykaa-fashion.pissedconsumer.com/review.html")).toBe(
      "product_reviews",
    );
  });

  it("classifies social platforms as social", () => {
    expect(classifySourceType("https://www.instagram.com/p/abc")).toBe("social");
    expect(classifySourceType("https://www.facebook.com/NykaaFashion/posts/1")).toBe("social");
  });

  it("falls back to web for anything else", () => {
    expect(classifySourceType("https://www.nykaafashion.com/wishlist")).toBe("web");
    expect(classifySourceType("not a url")).toBe("web");
  });
});

describe("labelSourceFromUrl", () => {
  it("gives distinct display labels for app/play store and review platforms", () => {
    expect(labelSourceFromUrl("https://apps.apple.com/us/app/x/id1")).toBe("app_store");
    expect(labelSourceFromUrl("https://play.google.com/store/apps/details?id=x")).toBe(
      "play_store",
    );
    expect(labelSourceFromUrl("https://www.trustpilot.com/review/x")).toBe("review_platform");
    expect(labelSourceFromUrl("https://www.instagram.com/p/x")).toBe("social");
  });
});

describe("normalizeFetchUrl", () => {
  it("rewrites www.reddit.com and reddit.com to old.reddit.com, preserving path and query", () => {
    expect(normalizeFetchUrl("https://www.reddit.com/r/x/comments/1/title?a=1")).toBe(
      "https://old.reddit.com/r/x/comments/1/title?a=1",
    );
    expect(normalizeFetchUrl("https://reddit.com/r/x")).toBe("https://old.reddit.com/r/x");
  });

  it("leaves old.reddit.com and non-reddit URLs unchanged", () => {
    expect(normalizeFetchUrl("https://old.reddit.com/r/x")).toBe("https://old.reddit.com/r/x");
    expect(normalizeFetchUrl("https://www.trustpilot.com/review/x")).toBe(
      "https://www.trustpilot.com/review/x",
    );
  });

  it("fails closed to the original URL on parse failure", () => {
    expect(normalizeFetchUrl("not a url")).toBe("not a url");
  });
});
