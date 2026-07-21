import { notFound } from "next/navigation";
import { DirectoryManager } from "@/components/directory-manager";
import { PageHeading } from "@/components/dashboard";
import { requirePlatformPermission } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ServiceCategoriesPage(){const session=await requirePlatformPermission("VIEW_SERVICE_TEMPLATES");if(!session)notFound();const departments=await db.department.findMany({orderBy:[{sortOrder:"asc"},{name:"asc"}]});return <><PageHeading eyebrow="Platform administration" title="Service templates"/><DirectoryManager canManageCategories={session.platformPermissions.includes("MANAGE_SERVICE_TEMPLATES")} categoriesOnly departments={departments.map(department=>({...department,services:[],providers:[]}))}/></>}
