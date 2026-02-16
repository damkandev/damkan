import { NextResponse } from "next/server";
import sharp from "sharp";
import fs from "fs";
import path from "path";

// Density characters from darkest to lightest
const DENSITY_CHARS = "@%#*+=-:. ";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const imageUrl = searchParams.get("url");
        const targetHeight = parseInt(searchParams.get("height") || "150", 10);

        if (!imageUrl) {
            return NextResponse.json(
                { error: "Missing 'url' parameter" },
                { status: 400 }
            );
        }

        let imageBuffer;

        // Handle local images (starting with /)
        if (imageUrl.startsWith("/")) {
            const localPath = path.join(process.cwd(), "public", imageUrl);
            if (!fs.existsSync(localPath)) {
                return NextResponse.json(
                    { error: `Local image not found: ${imageUrl}` },
                    { status: 404 }
                );
            }
            imageBuffer = fs.readFileSync(localPath);
        } else {
            // Fetch external image
            const res = await fetch(imageUrl, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (compatible; AsciiArtBot/1.0)",
                },
            });

            if (!res.ok) {
                return NextResponse.json(
                    { error: `Failed to fetch image: ${res.status}` },
                    { status: 502 }
                );
            }

            const arrayBuffer = await res.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
        }

        // Process with sharp: resize, grayscale, get raw pixel data
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();

        if (!metadata.width || !metadata.height) {
            return NextResponse.json(
                { error: "Could not read image dimensions" },
                { status: 400 }
            );
        }

        // Calculate dimensions
        // Characters are ~2x taller than wide, so we halve the width
        const aspectRatio = metadata.width / metadata.height;
        const charHeight = targetHeight;
        const charWidth = Math.round(charHeight * aspectRatio * 0.5);

        // Resize and convert to grayscale raw pixels
        const { data, info } = await image
            .resize(charWidth, charHeight, { fit: "fill" })
            .grayscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Convert pixels to ASCII characters
        let ascii = "";
        for (let y = 0; y < info.height; y++) {
            let row = "";
            for (let x = 0; x < info.width; x++) {
                const pixelIndex = y * info.width + x;
                const brightness = data[pixelIndex]; // 0-255
                // Map brightness to density character index
                const charIndex = Math.floor(
                    (brightness / 255) * (DENSITY_CHARS.length - 1)
                );
                row += DENSITY_CHARS[charIndex];
            }
            ascii += row + "\n";
        }

        return NextResponse.json({
            ascii: ascii.trimEnd(),
            width: info.width,
            height: info.height,
        });
    } catch (error) {
        console.error("ASCII art conversion error:", error);
        return NextResponse.json(
            { error: "Failed to convert image to ASCII" },
            { status: 500 }
        );
    }
}
