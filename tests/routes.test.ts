import { describe, expect, test } from "bun:test";
import {
  decodeDetailParam,
  detailPath,
  getNavForPath,
  ROUTES,
} from "../src/app/routes";

describe("routes", () => {
  test("defines all application routes", () => {
    const paths = ROUTES.map((r) => r.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/repos");
    expect(paths).toContain("/repo/:fullName");
    expect(paths).toContain("/create");
    expect(paths).toContain("/settings");
    expect(paths).toContain("/setup");
    expect(paths).toContain("/pulls");
    expect(paths).toContain("/pull/:repo/:number");
  });

  test("getNavForPath maps routes to active nav ids", () => {
    expect(getNavForPath("/")).toBe("overview");
    expect(getNavForPath("/repo/owner%2Frepo")).toBe("overview");
    expect(getNavForPath("/repos")).toBe("repos");
    expect(getNavForPath("/create")).toBe("create");
    expect(getNavForPath("/settings")).toBe("settings");
    expect(getNavForPath("/setup")).toBe("overview");
    expect(getNavForPath("/pulls")).toBe("pulls");
    expect(getNavForPath("/pull/owner%2Frepo/42")).toBe("pulls");
  });

  test("detailPath encodes repository full names", () => {
    expect(detailPath("sthbryan/Asterism")).toBe("/repo/sthbryan%2FAsterism");
    expect(detailPath("user/repo-name")).toBe("/repo/user%2Frepo-name");
  });

  test("decodeDetailParam decodes encoded parameters safely", () => {
    expect(decodeDetailParam("sthbryan%2FAsterism")).toBe("sthbryan/Asterism");
    expect(decodeDetailParam("regular")).toBe("regular");
    expect(decodeDetailParam(undefined)).toBe("");
  });
});
