import { DateTime } from "luxon";
import slugify from "slugify";

const POSTS_MEMO = new WeakMap();

function getPostsMemo(posts) {
    if (!Array.isArray(posts)) return null;
    let memo = POSTS_MEMO.get(posts);
    if (!memo) {
        memo = {
            byCategory: new Map(),
            byTag: new Map(),
            byAuthor: new Map(),
            byContributorName: new Map(),
        };
        POSTS_MEMO.set(posts, memo);
    }
    return memo;
}

export default function(eleventyConfig) {
    // --- 1. RELATIONSHIP FILTER ---
    eleventyConfig.addFilter("getContributor", (collection, authorSlug) => {
    if (!Array.isArray(collection) || !authorSlug) return null;
    const slug = Array.isArray(authorSlug) ? authorSlug[0] : authorSlug;
    return collection.find(item => item.fileSlug === slug) || null;
});

    // --- 2. DATE FILTERS (STANDAR ELEVENTY) ---
    eleventyConfig.addFilter("readableDate", (dateInput, format = "dd LLLL yyyy", zone = "utc") => {
        if (!dateInput) return "Date Missing";
        const dateObj = (typeof dateInput === 'string') 
            ? DateTime.fromISO(dateInput, { zone }) 
            : DateTime.fromJSDate(dateInput, { zone });

        if (!dateObj.isValid) {
            console.error("Luxon Parsing Failed:", dateInput);
            return "Invalid Date Format";
        }
        return dateObj.toFormat(format);
    });

    eleventyConfig.addFilter("date", (dateObj, format = "dd LLLL yyyy") => {
        return eleventyConfig.getFilter("readableDate")(dateObj, format);
    });

    eleventyConfig.addFilter("htmlDateString", (dateObj) => {
        return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat('yyyy-LL-dd');
    });

    eleventyConfig.addFilter("isoDate", (dateObj) => {
        return DateTime.fromJSDate(dateObj, { zone: "utc" }).toISO();
    });

    eleventyConfig.addFilter("dateTimeFull", (dateInput, zone = "utc") => {
        if (!dateInput) return "";
        const dt = (typeof dateInput === "string")
            ? DateTime.fromISO(dateInput, { zone })
            : DateTime.fromJSDate(dateInput, { zone });
        return dt.isValid ? dt.toLocaleString(DateTime.DATETIME_FULL) : "";
    });

    // --- 3. ARRAY & COLLECTION FILTERS ---
    eleventyConfig.addFilter("limit", (arr, limit) => {
        return Array.isArray(arr) ? arr.slice(0, limit) : [];
    });

    eleventyConfig.addFilter("head", (array, n) => {
        if (!Array.isArray(array) || array.length === 0) return [];
        return (n < 0) ? array.slice(n) : array.slice(0, n);
    });

    eleventyConfig.addFilter("contains", (arr, value) => {
        if (!Array.isArray(arr)) return false;
        return arr.map(item => String(item).toLowerCase()).includes(String(value).toLowerCase());
    });

    eleventyConfig.addFilter("includes", (arr, value) => {
        if (typeof arr === 'string') return arr.includes(value);
        return Array.isArray(arr) ? arr.includes(value) : false;
    });

    // --- 4. STRING & URL FILTERS ---
    eleventyConfig.addFilter("urlencode", (value) => encodeURIComponent(value));

    // FILTER TAMBAHAN UNTUK FIX ERROR 'ensureString'
    eleventyConfig.addFilter("ensureString", (val) => {
        if (!val) return "";
        if (Array.isArray(val)) return val[0].toString();
        return val.toString();
    });

    eleventyConfig.addFilter("displayName", (value) => {
        if (!value) return "";
        return value.toString()
            .replace(/-/g, " ")
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");
    });

    // Display categories and tags with capitalization after hyphens
    eleventyConfig.addFilter("formatCategoryTag", (value) => {
        if (!value) return "";
        return value.toString()
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('-');
    });

    eleventyConfig.addFilter("baseUrl", (url) => {
        if (!url || url === "/") return "http://localhost:8080";
        return url.endsWith("/") ? url.slice(0, -1) : url;
    });

    eleventyConfig.addFilter("absUrl", (path, base) => {
        try { return new URL(path, base).toString(); } 
        catch { return path; }
    });

    // --- 5. UTILS ---
    eleventyConfig.addFilter("year", () => DateTime.now().toFormat("yyyy"));
    eleventyConfig.addFilter("min", (...numbers) => Math.min(...numbers));
    eleventyConfig.addFilter("getKeys", target => Object.keys(target || {}));

    // --- 6. CONTENT FILTERS (Disesuaikan ke 'authors') ---
    eleventyConfig.addFilter("filterByCategory", (posts, category) => {
        if (!Array.isArray(posts)) return [];
        if (!category) return posts;
        const memo = getPostsMemo(posts);
        const key = String(category);
        if (memo && memo.byCategory.has(key)) return memo.byCategory.get(key);
        const res = posts.filter(post => post.data.categories?.includes(category));
        if (memo) memo.byCategory.set(key, res);
        return res;
    });

    eleventyConfig.addFilter("filterByTag", (posts, tag) => {
        if (!tag) return posts;
        return posts.filter(post => post.data.tags?.includes(tag));
    });

    eleventyConfig.addFilter("filterByTagSafe", (posts, tag) => {
        if (!Array.isArray(posts)) return [];
        if (!tag) return posts;
        const memo = getPostsMemo(posts);
        const key = String(tag);
        if (memo && memo.byTag.has(key)) return memo.byTag.get(key);
        const res = posts.filter(post => {
            const tags = post.data.tags || [];
            return Array.isArray(tags) ? tags.includes(tag) : tags === tag;
        });
        if (memo) memo.byTag.set(key, res);
        return res;
    });

    eleventyConfig.addFilter("parseAuthors", (authorString, collectionsAll) => {
        if (!authorString || !collectionsAll) return [];
        const contributors = Array.isArray(collectionsAll)
            ? collectionsAll.filter(item => typeof item?.inputPath === "string" && item.inputPath.includes("/content/contributor/"))
            : [];

        const normalize = (value) => String(value || "")
            .toLowerCase()
            .replace(/["制]/g, "")
            .replace(/\(.*?\)/g, "")
            .replace(/[^a-z0-9]+/g, " ")
            .trim();

        const safeSlugify = (value) => slugify(String(value || ""), { lower: true, strict: true });

        const parts = (Array.isArray(authorString) ? authorString.join(";") : String(authorString))
            .split(";")
            .map(a => a.trim())
            .filter(Boolean);

        return parts.map(raw => {
            const rawNormalized = normalize(raw);
            const rawSlug = safeSlugify(raw);

            let contributor =
                contributors.find(item => item.fileSlug === raw) ||
                contributors.find(item => item.fileSlug === rawSlug) ||
                contributors.find(item => normalize(item?.data?.name || item?.data?.title || item?.fileSlug) === rawNormalized);

            return {
                slug: contributor?.fileSlug || rawSlug,
                name: contributor?.data?.name || contributor?.data?.title || raw,
                image: contributor?.data?.image || null
            };
        });
    });

    eleventyConfig.addFilter("filterByAuthor", (posts, author) => {
        if (!Array.isArray(posts)) return [];
        if (!author) return [];
        const memo = getPostsMemo(posts);
        const key = String(author);
        if (memo && memo.byAuthor.has(key)) return memo.byAuthor.get(key);
        const res = posts.filter(post => {
            const authorField = post.data.author || post.data.authors || '';
            const authors = String(authorField).split(';').map(a => a.trim());
            return authors.includes(author);
        });
        if (memo) memo.byAuthor.set(key, res);
        return res;
    });

    // --- 7. BREADCRUMBS ---
    eleventyConfig.addFilter("breadcrumbs", (dateObj, title, metadata) => {
        if (!dateObj || !title) return [];
        const dt = DateTime.fromJSDate(dateObj, { zone: "utc" });
        return [
            { text: metadata?.title || "The New Polis", url: "/" },
            { text: dt.toFormat("yyyy"), url: `/${dt.toFormat("yyyy")}/` },
            { text: dt.toFormat("MMMM"), url: `/${dt.toFormat("yyyy")}/${dt.toFormat("MM")}/` },
            { text: dt.toFormat("dd"), url: `/${dt.toFormat("yyyy")}/${dt.toFormat("MM")}/${dt.toFormat("dd")}/` },
            { text: title, url: null },
        ];
    });

    // --- 8. LEGACY / COMPLEX FILTERS ---
    eleventyConfig.addFilter("postsNamedForContributor", (posts, name) => {
        if (!Array.isArray(posts) || !name) return [];
        const memo = getPostsMemo(posts);
        const nameLower = String(name).toLowerCase().replace(/["制]/g, "").replace(/\(.*?\)/g, "").trim();
        if (memo && memo.byContributorName.has(nameLower)) return memo.byContributorName.get(nameLower);

        const nameParts = nameLower.split(/\s+/).filter(Boolean);
        const lastName = nameParts[nameParts.length - 1];
        const shortName = nameParts.length > 1 ? `${nameParts[0]} ${lastName}` : nameLower;

        const res = posts.filter((post) => {
            const title = (post?.data?.title || "").toLowerCase();
            const author = (post?.data?.author || post?.data?.authors || "").toLowerCase();
            return author === nameLower || author === shortName ||
                    title.includes(nameLower) || (lastName && title.includes(lastName));
        });

        if (memo) memo.byContributorName.set(nameLower, res);
        return res;
    });

    eleventyConfig.addFilter("initials", (name) => {
        if (!name || typeof name !== 'string') return "??";
        const parts = name.trim().split(/\s+/);
        return parts.length >= 2 
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0][0].toUpperCase();
    });

    eleventyConfig.addFilter("addHeadingIDs", (content) => {
        if (!content) return "";
        return content.replace(/<(h[1-6])([^>]*)>(.*?)<\/h[1-6]>/gi, (match, tag, attrs, text) => {
            if (attrs.includes('id=')) return match;
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return `<${tag} id="${id}"${attrs}>${text}</${tag}>`;
        });
    });
    
};
