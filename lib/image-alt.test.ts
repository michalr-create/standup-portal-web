import assert from "node:assert/strict";
import { test } from "node:test";
import { IMAGE_SIZE, contentThumbnailAlt, standuperLabel } from "./image-alt.ts";

test("content thumbnail alt names the title and the standuper", () => {
  assert.equal(
    contentThumbnailAlt({
      title: "Wentyl",
      people: [{ name: "Abelard Giza" }],
    }),
    "Wentyl \u2014 Abelard Giza",
  );
  assert.equal(
    contentThumbnailAlt({
      title: "  Pacze\u015b x Lotek  ",
      people: [{ name: "Rafa\u0142 Pacze\u015b" }, { name: " \u0141ukasz Lotek Lodkowski " }],
    }),
    "Pacze\u015b x Lotek \u2014 Rafa\u0142 Pacze\u015b, \u0141ukasz Lotek Lodkowski",
  );
  assert.equal(standuperLabel([{ name: "  " }, { name: "Abelard Giza" }]), "Abelard Giza");
});

test("content thumbnail alt drops the standuper or the title when one is missing", () => {
  assert.equal(contentThumbnailAlt({ title: "Sam tytu\u0142", people: [] }), "Sam tytu\u0142");
  assert.equal(
    contentThumbnailAlt({ title: "   ", people: [{ name: "Abelard Giza" }], showName: "Wahanie" }),
    "Abelard Giza",
  );
  assert.equal(contentThumbnailAlt({ title: "", people: [], showName: " Wahanie " }), "Wahanie");
  assert.equal(contentThumbnailAlt({ title: null, showName: null }), "");
});

test("image boxes keep the frames the cards already paint", () => {
  assert.equal(IMAGE_SIZE.thumbLandscape.width * 10, IMAGE_SIZE.thumbLandscape.height * 16);
  assert.equal(IMAGE_SIZE.thumbPortrait.width * 16, IMAGE_SIZE.thumbPortrait.height * 9);
  assert.equal(IMAGE_SIZE.thumbWide.width * 9, IMAGE_SIZE.thumbWide.height * 16);
  assert.equal(IMAGE_SIZE.poster.width * 3, IMAGE_SIZE.poster.height * 4);
  assert.equal(IMAGE_SIZE.avatar.width, IMAGE_SIZE.avatar.height);
  assert.equal(IMAGE_SIZE.programCover.width, 112);
  assert.equal(IMAGE_SIZE.programCover.height, 64);
});
