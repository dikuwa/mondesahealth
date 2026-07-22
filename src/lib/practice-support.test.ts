import { describe,expect,it } from "vitest";
import { parsePracticeSupportScopes,supportPermissions } from "@/lib/practice-support";

describe("practice administration support scopes",()=>{
  it("maps only non-clinical administration permissions",()=>{
    const permissions=supportPermissions(["WEBSITE_BRANDING","SERVICES","SETTINGS","OPERATIONAL_DIAGNOSTICS"]);
    expect(permissions).toEqual(expect.arrayContaining(["MANAGE_PRACTICE","VIEW_OVERVIEW"]));
    expect(permissions).not.toEqual(expect.arrayContaining(["MANAGE_PATIENTS","VIEW_CLINICAL_RECORDS","MANAGE_CLAIMS","MANAGE_FINANCE"]));
  });
  it("drops unknown stored scopes",()=>{
    expect(parsePracticeSupportScopes('["SERVICES","PATIENTS"]')).toEqual(["SERVICES"]);
  });
});
