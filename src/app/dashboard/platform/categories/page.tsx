import { notFound } from "next/navigation";
import { DirectoryManager } from "@/components/directory-manager";
import { PageHeading } from "@/components/dashboard";
import { requirePlatformOwner } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ServiceCategoriesPage(){if(!await requirePlatformOwner())notFound();const departments=await db.department.findMany({orderBy:[{sortOrder:"asc"},{name:"asc"}]});return <><PageHeading eyebrow="Platform administration" title="Service categories"/><DirectoryManager canManageCategories categoriesOnly departments={departments.map(department=>({...department,services:[],providers:[]}))}/></>}
