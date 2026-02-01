"use server";

import fs from "fs/promises";
import path from "path";

export async function getPublicFiles() {
    try {
        const publicDir = path.join(process.cwd(), "public");
        const files = await fs.readdir(publicDir);
        // Filter out .DS_Store and other hidden files if desired, 
        // but a simple list is fine for now as per request.
        return files.filter(file => !file.startsWith("."));
    } catch (error) {
        console.error("Error reading public directory:", error);
        return [];
    }
}
