import { describe, expect, it } from "vitest";
import { groupByModel } from "../lib/catalog";
import { searchTools } from "../lib/search";
import { makeRow, sampleRows } from "./fixtures";

const groups = groupByModel([
  ...sampleRows,
  makeRow({ model_id: 9, brand: "Milwaukee Tool", model_number: "2732-20", tool_name: "M18 FUEL 7-1/4 in. Circular Saw", category: "Circular Saws" }),
  makeRow({ model_id: 17, brand: "DEWALT", model_number: "DCG413B", tool_name: "20V MAX XR Brushless 4-1/2 in. / 5 in. Grinder", category: "Grinders" }),
]);
const models = (q: string) => searchTools(groups, q).map((g) => g.model_number);

describe("groupByModel", () => {
  it("keeps both channel rows under one tool", () => {
    const tool = groups.find((g) => g.model_number === "2904-20");
    expect(tool?.rows.local?.sales_channel).toBe("local");
    expect(tool?.rows.ebay?.sales_channel).toBe("ebay");
    expect(groups).toHaveLength(5);
  });
});

describe("searchTools", () => {
  it("finds by exact model number, with or without punctuation", () => {
    expect(models("2904-20")[0]).toBe("2904-20");
    expect(models("290420")[0]).toBe("2904-20");
    expect(models("2904 20")[0]).toBe("2904-20");
    expect(models("dcn680b")[0]).toBe("DCN680B");
  });

  it("finds by partial model number", () => {
    expect(models("2904")).toEqual(["2904-20"]);
    expect(models("DCN")).toContain("DCN680B");
    expect(models("1850")).toEqual(["48-11-1850"]);
  });

  it("finds by brand", () => {
    expect(models("milwaukee")).toEqual(expect.arrayContaining(["2904-20", "48-11-1850", "2732-20"]));
    expect(models("dewalt")).toEqual(expect.arrayContaining(["DCN680B", "DCG413B"]));
  });

  it("finds by tool name and category", () => {
    expect(models("brad nailer")).toEqual(["DCN680B"]);
    expect(models("hammer drill")).toEqual(["2904-20"]);
    expect(models("battery")).toEqual(["48-11-1850"]);
    expect(models("batteries")).toEqual(["48-11-1850"]);
    expect(models("grinder")).toEqual(["DCG413B"]);
    expect(models("circular saw")).toEqual(["2732-20"]);
  });

  it("combines brand and type", () => {
    expect(models("milwaukee drill")).toEqual(["2904-20"]);
    expect(models("dewalt nailer")).toEqual(["DCN680B"]);
  });

  it("tolerates a small typo", () => {
    expect(models("milwakee drill")).toEqual(["2904-20"]);
  });

  it("returns nothing for unsupported models or empty queries", () => {
    expect(models("makita xdt13")).toEqual([]);
    expect(models("ryobi")).toEqual([]);
    expect(models("")).toEqual([]);
    expect(models("   ")).toEqual([]);
  });
});
