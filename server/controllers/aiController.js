import { HumanMessage } from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";
import client from "../config/weaviateClient.js";
import JobModel from "../models/jobModel.js";
import redisClient from "../config/redisClient.js"; // REDIS CLIENT

// Cache TTL (seconds)
const STATS_TTL = 300; // 5 minutes

// Cached model
let model = null;
// ... (rest of getModel)

// ... (parseQuery is unchanged)

// MongoDB Aggregation (for "count" intent)
const getModel = () => {
    if (!model) {
        console.log("[AI] Setting up Claude...");
        model = new ChatAnthropic({
            anthropicApiKey: process.env.ANTHROPIC_API_KEY,
            modelName: "claude-3-haiku-20240307",
            temperature: 0.0, // Low temperature for reasoning
            maxTokens: 1000
        });
    }
    return model;
};

// --- STEP 1: QUERY PARSER ---
// Use Claude to understand intent and extract structured filters
const parseQuery = async (query, userContext, history = []) => {
    console.log("[AI] Parsing query with history...", history.length);
    const chatModel = getModel();

    // Format history for context
    const historyContext = history.length > 0
        ? `PREVIOUS CONVERSATION:\n${history.slice(-4).join("\n")}\n\nCURRENT QUERY: "${query}"\n\nINSTRUCTION: Combine PREVIOUS context with CURRENT query. Resolve pronouns (it, they) and implied filters (e.g. if previous was about 'Importer X', and current is 'in 2024', assume 'Importer X' AND '2024').`
        : `USER QUERY: "${query}"`;

    // System prompt defines the available schema and rules
    const prompt = `
You are a query parser for a logistics database. 
Your goal is to extract structured intent and filters from the user's natural language query.

USER CONTEXT:
- Allowed Importers: ${userContext.allowedImporters ? userContext.allowedImporters.join(", ") : "ALL (SuperAdmin)"}
- Current Date: ${new Date().toISOString().split('T')[0]}

ASSUMPTION REGISTRY (Defaults):
- "Recent" = Last 30 days
- "Delayed" = Status 'Pending' AND Created > 7 days ago
- "Urgent" = Priority 'High' OR Status 'Pending'
- "Completed" / "Done" / "Finished" = Status 'Completed'

DB SCHEMA:
- Statuses: Pending, Completed, Cancelled, In Progress
- Fields: job_no, importer, status, arrival_date, vessel_flight, container_nos

OUTPUT FORMAT (JSON ONLY):
{
  "intent": "count" | "search" | "general_chat",
  "filters": {
    "status": ["Pending", "Completed", ...], // Extract status if mentioned (e.g. "completed", "pending")
    "importer": ["Name", ...],
    "date_range": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" } 
  },
  "search_query": "refined keywords for vector search",
  "reasoning": "brief explanation"
}

IMPORTANT RULES:
1. If user says "completed", MUST set "filters.status": ["Completed"].
2. Do NOT add a "date_range" unless the user mentions a year/date OR it is carried over from immediate previous context.
3. If user gives an IE Code, map it to the Importer Name from Context if possible.

${historyContext}
`;

    const response = await chatModel.invoke([new HumanMessage(prompt)]);

    try {
        // Extract JSON from response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error("No JSON found");
    } catch (e) {
        console.error("[AI] Parse failed:", e);
        // Fallback
        return { intent: "search", search_query: query, filters: {} };
    }
};

// --- STEP 2: EXECUTION ---

// MongoDB Aggregation (for "count" intent)
const executeCountQuery = async (parsedQuery, userAllowedImporters) => {
    // 0. STRICT AUTH CHECK
    if (parsedQuery.filters.importer && parsedQuery.filters.importer.length > 0 && userAllowedImporters) {
        const unauthorized = parsedQuery.filters.importer.filter(req => 
            !userAllowedImporters.some(allowed => allowed.toLowerCase() === req.toLowerCase())
        );
        
        if (unauthorized.length > 0) {
            return { 
                error: true, 
                message: `You are not authorized to view data for: ${unauthorized.join(", ")}` 
            };
        }
    }

    // 1. Check Redis Cache
    const cacheKey = "stats:" + JSON.stringify({ 
        f: parsedQuery.filters, 
        u: userAllowedImporters ? userAllowedImporters.sort() : 'SA' 
    });
    
    try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            console.log("[AI] Redis Cache HIT for stats");
            return JSON.parse(cached);
        }
    } catch (e) {
        console.error("[AI] Redis Cache Error:", e);
    }

    console.log("[AI] Executing Count Query (Cache Miss):", parsedQuery.filters);

    const matchStage = {};

    // 1. Status Filter
    if (parsedQuery.filters.status && parsedQuery.filters.status.length > 0) {
        // Case-insensitive match for status
        matchStage.status = {
            $in: parsedQuery.filters.status.map(s => new RegExp(`^${s}$`, 'i'))
        };
    }

    // 2. Importer Filter (Intersection of User Allowed + Query Requested)
    let targetImporters = userAllowedImporters; // Start with user permissions

    if (parsedQuery.filters.importer && parsedQuery.filters.importer.length > 0) {
        const requested = parsedQuery.filters.importer;
        if (userAllowedImporters) {
            // Intersect: Only allow requested importers that user has access to
            targetImporters = requested.filter(req =>
                userAllowedImporters.some(allowed => allowed.toLowerCase() === req.toLowerCase())
            );
        } else {
            // SuperAdmin - just use requested
            targetImporters = requested;
        }
    }

    if (targetImporters && targetImporters.length > 0) {
        matchStage.importer = { $in: targetImporters };
    } else if (userAllowedImporters && userAllowedImporters.length > 0) {
        // User is restricted but didn't ask for specific importer -> show all their allowed
        matchStage.importer = { $in: userAllowedImporters };
    } else if (userAllowedImporters && userAllowedImporters.length === 0) {
        // User has NO allowed importers
        return { count: 0, breakdown: {}, message: "No allowed importers." };
    }

    // 3. Date Filter
    if (parsedQuery.filters.date_range) {
        const { start, end } = parsedQuery.filters.date_range;
        if (start || end) {
            matchStage.createdAt = {};
            if (start) matchStage.createdAt.$gte = new Date(start);
            if (end) matchStage.createdAt.$lte = new Date(end);
        }
    }

    // Run Aggregation
    const stats = await JobModel.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
                importers: { $addToSet: "$importer" } // Sample importers
            }
        }
    ]);

    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const breakdown = stats.reduce((acc, s) => ({ ...acc, [s._id || 'Unknown']: s.count }), {});

    const result = { total, breakdown, matchStage };
    
    // Update Redis Cache
    try {
        await redisClient.set(cacheKey, JSON.stringify(result), { EX: STATS_TTL });
    } catch (e) {
        console.error("[AI] Redis Set Error:", e);
    }
    
    return result;
};

// Weaviate Hybrid Search (for "search" intent)
const executeSearchQuery = async (parsedQuery, userAllowedImporters) => {
    console.log("[AI] Executing Hybrid Search:", parsedQuery.search_query);

    // Build Schema Filter
    let whereFilter = null;
    let allowedList = userAllowedImporters;

    // STRICT AUTH CHECK for Search
    if (parsedQuery.filters.importer && parsedQuery.filters.importer.length > 0 && userAllowedImporters) {
        const unauthorized = parsedQuery.filters.importer.filter(req => 
            !userAllowedImporters.some(allowed => allowed.toLowerCase() === req.toLowerCase())
        );
         if (unauthorized.length > 0) {
            // Return special object indicating error
            return [{ text: `AUTHORIZATION ERROR: You are not authorized to view data for: ${unauthorized.join(", ")}` }];
        }
        
        // Use the requested importer if valid
         allowedList = parsedQuery.filters.importer;
    } else if (parsedQuery.filters.importer && parsedQuery.filters.importer.length > 0 && !userAllowedImporters) {
        // Superadmin asking for specific importer
        allowedList = parsedQuery.filters.importer;
    }

    // Construct Weaviate Filter
    if (allowedList && allowedList.length > 0) {
        if (allowedList.length === 1) {
            whereFilter = {
                path: ["importer"],
                operator: "Equal",
                valueText: allowedList[0]
            };
        } else {
            whereFilter = {
                operator: "Or",
                operands: allowedList.map(imp => ({
                    path: ["importer"],
                    operator: "Equal",
                    valueText: imp
                }))
            };
        }
    }

    try {
        // Hybrid Search (BM25 + Vectors)
        let graphqlQuery = client.graphql
            .get()
            .withClassName("JobContext")
            .withHybrid({
                query: parsedQuery.search_query,
                alpha: 0.5 // Balance between keyword (0) and vector (1)
            })
            .withLimit(8)
            .withFields("text job_no year importer status");

        if (whereFilter) {
            graphqlQuery = graphqlQuery.withWhere(whereFilter);
        }

        const result = await graphqlQuery.do();
        
        // Handle Errors in Response (like Vectorizer missing)
        if (result.errors) {
            console.error("[AI] Weaviate Hybrid Error:", JSON.stringify(result.errors));
            throw new Error("Hybrid search failed");
        }

        return result.data?.Get?.JobContext || [];
    
    } catch (error) {
        console.error("[AI] Hybrid Search Failed, falling back to BM25:", error.message);
        
        // FALLBACK: BM25 Only (No Vectorizer needed)
        try {
             let bm25Query = client.graphql
                .get()
                .withClassName("JobContext")
                .withBm25({
                    query: parsedQuery.search_query,
                    properties: ["text"]
                })
                .withLimit(8)
                .withFields("text job_no year importer status");

            if (whereFilter) {
                bm25Query = bm25Query.withWhere(whereFilter);
            }
            
            const fallbackResult = await bm25Query.do();
            return fallbackResult.data?.Get?.JobContext || [];
        } catch (fallbackError) {
             console.error("[AI] Fallback BM25 failed:", fallbackError.message);
             return [];
        }
    }
};

// --- MAIN HANDLER ---
export const chat = async (req, res) => {
    try {
        const { question, history } = req.body;
        console.log("------------------------------------------");
        console.log("[AI] Question:", question);

        if (!question) return res.status(400).json({ error: "Question required" });

        // 1. Get User Context
        let allowedImporters = null;
        const role = req.user?.role || req.userType;

        if (role !== "superadmin") {
            const assignments = req.user?.ie_code_assignments || [];
            allowedImporters = assignments.map(a => a.importer_name).filter(Boolean);
            if (allowedImporters.length === 0 && req.user?.assignedImporterName)
                allowedImporters = [req.user.assignedImporterName];
        }

        // 2. Parse Query (Plan) with History
        const parsedNode = await parseQuery(question, { allowedImporters }, history || []);
        console.log("[AI] Plan:", JSON.stringify(parsedNode, null, 2));

        let context = "";
        let sources = [];
        let isCompleteData = false;

        // DEBUG: VECTOR INSPECTION
        if (question.toLowerCase().includes("show embedding") || question.toLowerCase().includes("show vector")) {
            console.log("[AI] Debug: Fetching raw vector...");
            // Extract job number if present
            const jobMatch = question.match(/\b\d{5,}\b/);
            const jobNo = jobMatch ? jobMatch[0] : null;

            if (jobNo) {
                const result = await client.graphql.get()
                    .withClassName("JobContext")
                    .withWhere({
                        path: ["job_no"],
                        operator: "Equal",
                        valueText: jobNo
                    })
                    .withFields("job_no _additional { vector }")
                    .withLimit(1)
                    .do();

                const item = result.data?.Get?.JobContext?.[0];
                if (item && item._additional?.vector) {
                    return res.json({
                        success: true,
                        answer: `Here is the embedding vector for Job ${jobNo} (first 10 dimensions):\n\n[${item._additional.vector.slice(0, 10).join(", ")}, ...]\n\nTotal Dimensions: ${item._additional.vector.length}`,
                        sources: [],
                        debug: { vectorPrefix: item._additional.vector.slice(0, 10) }
                    });
                } else {
                    return res.json({ success: true, answer: `Job ${jobNo} found but no vector returned. It might rely on BM25 only.`, sources: [] });
                }
            }
        }

        // 3. Execute Plan
        if (parsedNode.intent === "count") {
            const result = await executeCountQuery(parsedNode, allowedImporters);
            
            if (result.error) {
                 return res.json({
                    success: true,
                    answer: `🚫 ${result.message}`,
                    sources: []
                });
            }

            context = `
STATISTICAL DATA (Exact Count):
Total Jobs: ${result.total}
Breakdown by Status: ${JSON.stringify(result.breakdown)}
Filters Applied: ${JSON.stringify(result.matchStage)}
`;
            sources = [{ type: "stats", total: result.total, ...result.breakdown }];
            isCompleteData = true;

        } else {
            // "search" or "general_chat"
            const docs = await executeSearchQuery(parsedNode, allowedImporters);
            console.log(`[AI] Found ${docs.length} docs`);

            // Check for Auth Error from Search
            if (docs.length > 0 && docs[0].text && docs[0].text.startsWith("AUTHORIZATION ERROR")) {
                 return res.json({
                    success: true,
                    answer: `🚫 ${docs[0].text}`,
                    sources: []
                });
            }

            if (docs.length === 0) {
                // Fallback to BM25 if hybrid finds nothing (e.g. if vectors aren't ready)
                context = "No direct matches found via search.";
            } else {
                context = "RELEVANT JOBS (Top 8 Matches Only):\n" + docs.map(d => d.text).join("\n\n");
                sources = docs.map(d => ({ job: d.job_no, importer: d.importer }));
            }
            isCompleteData = false;
        }

        // 4. Generate Final Answer
        console.log("[AI] Generating answer...");
        const chatModel = getModel();
        
        const safetyInstruction = isCompleteData 
            ? "You have the COMPLETE statistical data. State numbers confidently."
            : "WARNING: You only have the TOP 8 search results involved. Do NOT imply these are all the jobs. If the user asks for 'all' list, explain you are showing the most relevant examples.";

        const response = await chatModel.invoke([
            new HumanMessage(`
You are a shipping assistant. Answer based on the retrieved context below.

QUERY ANLYSIS:
Intent: ${parsedNode.intent}
Reasoning: ${parsedNode.reasoning}

RETRIEVED CONTEXT:
${context}

USER QUESTION: ${question}

INSTRUCTIONS:
- ${safetyInstruction}
- **TONE**: Professional, simple, and client-facing. Imagine you are emailing a customer.
- **STYLE**: Use clear bullet points for numbers. Avoid technical jargon (don't say "database", "retrieved", "vector").
- If showing stats, just say "You have X jobs...".
- If referencing jobs, mention job numbers clearly.
- If no data found, politely say "I couldn't find any information matching that."
`)
        ]);

        res.json({
            success: true,
            answer: response.content,
            sources: sources,
            debug: parsedNode
        });

    } catch (error) {
        console.error("[AI] Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
