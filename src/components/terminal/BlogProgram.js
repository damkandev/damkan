import { FileText, Folder, Home, X, ArrowLeft } from "lucide-react";
import {
    createProgram,
    menuItem,
    textContent,
    response,
    styledContent
} from "./program";

// Fetch blog data from API
let cachedData = null;

async function fetchBlogData() {
    if (cachedData) return cachedData;

    try {
        const res = await fetch("/api/blog");
        const data = await res.json();
        cachedData = data;
        return data;
    } catch (error) {
        console.error("Error fetching blog data:", error);
        return { articles: [], categories: [] };
    }
}

// Format terminal content from parsed markdown with styling
function formatArticleContent(article) {
    const content = [];

    // Header
    content.push({ type: "styled", content: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", duration: 30, style: { isHr: true } });
    content.push({ type: "styled", content: article.title, duration: 100, style: { isHeader: true, level: 1 } });
    content.push({ type: "styled", content: `Categoría: ${article.category}`, duration: 80, style: { dimmed: true } });
    content.push({ type: "styled", content: "", duration: 30, style: { isHr: true } });
    content.push({ type: "text", content: "", duration: 10 });

    let isFirstTableRow = true;

    // Content lines with proper styling
    for (const line of article.content) {
        switch (line.type) {
            case "header":
                content.push({
                    type: "styled",
                    content: line.text,
                    duration: 60,
                    style: { isHeader: true, level: line.level }
                });
                break;

            case "quote":
                content.push({
                    type: "styled",
                    content: line.text,
                    duration: 50,
                    style: { isQuote: true }
                });
                break;

            case "list":
                content.push({
                    type: "styled",
                    content: line.text,
                    duration: 40,
                    style: { isList: true, nested: line.nested, ordered: false }
                });
                break;

            case "orderedList":
                content.push({
                    type: "styled",
                    content: line.text,
                    duration: 40,
                    style: { isList: true, ordered: true, number: line.number }
                });
                break;

            case "checkbox":
                content.push({
                    type: "styled",
                    content: line.text,
                    duration: 40,
                    style: { isCheckbox: true, checked: line.checked }
                });
                break;

            case "codeBlock":
                content.push({
                    type: "styled",
                    content: line.code,
                    duration: 100,
                    style: { isCodeBlock: true, language: line.language }
                });
                break;

            case "tableRow":
                content.push({
                    type: "styled",
                    content: line.cells,
                    duration: 30,
                    style: { isTableRow: true, isHeader: isFirstTableRow }
                });
                isFirstTableRow = false;
                break;

            case "tableSeparator":
                content.push({
                    type: "styled",
                    content: "",
                    duration: 10,
                    style: { isTableSeparator: true } // Now basically hidden
                });
                // After separator, next row is likely data, but first row logic handled above
                break;

            case "asciiImage":
                content.push({
                    type: "styled",
                    content: line.url,
                    duration: 50,
                    style: { isAsciiImage: true, alt: line.alt, url: line.url }
                });
                break;

            case "hr":
                content.push({
                    type: "styled",
                    content: "",
                    duration: 30,
                    style: { isHr: true }
                });
                isFirstTableRow = true; // Reset for next table
                break;

            case "empty":
                content.push({ type: "text", content: "", duration: 10 });
                break;

            default:
                if (line.text) {
                    content.push({ type: "text", content: line.text, duration: 30 });
                }
                break;
        }
    }

    return content;
}

// Show articles list
async function showArticles() {
    const { articles } = await fetchBlogData();

    if (articles.length === 0) {
        return response({
            content: [textContent("No hay artículos disponibles.", 300)],
            menu: [menuItem("Volver", mainMenu, ArrowLeft)],
            clearBefore: true,
        });
    }

    return response({
        content: [
            { type: "styled", content: "Artículos disponibles", duration: 100, style: { isHeader: true, level: 2 } },
            textContent("", 10),
        ],
        menu: [
            ...articles.map((article) =>
                menuItem(article.title, () => showArticle(article), FileText)
            ),
            menuItem("Volver", mainMenu, ArrowLeft),
        ],
        clearBefore: true,
    });
}

// Show single article
function showArticle(article) {
    const content = formatArticleContent(article);

    return response({
        content,
        menu: [
            menuItem("Volver a artículos", showArticles, ArrowLeft),
            menuItem("Menú principal", mainMenu, Home),
        ],
        clearBefore: true,
    });
}

// Show categories
async function showCategories() {
    const { categories, articles } = await fetchBlogData();

    if (categories.length === 0) {
        return response({
            content: [textContent("No hay categorías disponibles.", 300)],
            menu: [menuItem("Volver", mainMenu, ArrowLeft)],
        });
    }

    return response({
        content: [
            { type: "styled", content: "Categorías", duration: 100, style: { isHeader: true, level: 2 } },
            textContent("", 10),
        ],
        menu: [
            ...categories.map((category) =>
                menuItem(category, () => showCategory(category, articles), Folder)
            ),
            menuItem("Volver", mainMenu, ArrowLeft),
        ],
        clearBefore: true,
    });
}

// Show articles by category
function showCategory(category, articles) {
    const categoryArticles = articles.filter(a => a.category === category);

    return response({
        content: [
            { type: "styled", content: `Categoría: ${category}`, duration: 100, style: { isHeader: true, level: 2 } },
            textContent(`${categoryArticles.length} artículo(s)`, 80),
            textContent("", 10),
        ],
        menu: [
            ...categoryArticles.map((article) =>
                menuItem(article.title, () => showArticle(article), FileText)
            ),
            menuItem("Volver a categorías", showCategories, ArrowLeft),
        ],
        clearBefore: true,
    });
}

// Main menu
async function mainMenu(args = []) {
    // Clear cache to get fresh data
    if (!cachedData) {
        await fetchBlogData();
    }

    // Check if a specific article was requested via args (slug)
    if (args && args.length > 0) {
        const slug = args[0];
        const { articles } = await fetchBlogData();
        const article = articles.find(a => a.slug === slug);

        if (article) {
            return showArticle(article);
        }

        // If not found, show error or just fall through to main menu
        // For now, let's just fall through but maybe adding a message could be nice
        // But falling through without error is safer for UX if typo
    }

    return response({
        content: [
            { type: "styled", content: "", duration: 30, style: { isHr: true } },
            { type: "styled", content: "Blog de Damian", duration: 100, style: { isHeader: true, level: 1 } },
            { type: "styled", content: "", duration: 30, style: { isHr: true } },
            textContent("Selecciona una opción:", 80),
        ],
        menu: [
            menuItem("Ver artículos", showArticles, FileText),
            menuItem("Ver categorías", showCategories, Folder),
            menuItem("Salir", () => response({ exit: true }), X),
        ],
        clearBefore: true,
    });
}

// Export the blog program
export const BlogProgram = createProgram({
    name: "blog",
    description: "Explorar el blog",
    onStart: mainMenu,
});

export default BlogProgram;
