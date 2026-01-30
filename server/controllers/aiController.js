import { HumanMessage } from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";
import client from "../config/weaviateClient.js";
import JobModel from "../models/jobModel.js";

// Cached model
let model = null;

const getModel = () => {
    if (!model) {
        console.log("[AI] Setting up Claude...");
        model = new ChatAnthropic({
            anthropicApiKey: process.env.ANTHROPIC_API_KEY,
            modelName: "claude-3-haiku-20240307",
            temperature: 0.3,
            maxTokens: 1000
        });
    }
    return model;
};

// Check if question is about counting/statistics
const isCountingQuestion = (question) => {
    const countKeywords = [
        'how many', 'count', 'total', 'number of', 'statistics',
        'summary', 'overview', 'all jobs', 'list all', 'past month',
        'this month', 'last week', 'this week', 'pending', 'completed',
        'in progress', 'cancelled', 'status breakdown'
    ];
    const lowerQ = question.toLowerCase();
    return countKeywords.some(kw => lowerQ.includes(kw));
};

// Get job statistics from MongoDB
const getJobStats = async (importerFilter) => {
    console.log("[AI] Getting job stats from MongoDB...");

    const query = importerFilter ? { importer: { $in: importerFilter } } : {};

    // Get counts by status
    const statusCounts = await JobModel.aggregate([
        { $match: query },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    // Get total count
    const totalCount = await JobModel.countDocuments(query);

    // Get recent jobs (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCount = await JobModel.countDocuments({
        ...query,
        createdAt: { $gte: thirtyDaysAgo }
    });

    // Get top importers (if superadmin)
    let topImporters = [];
    if (!importerFilter) {
        topImporters = await JobModel.aggregate([
            { $group: { _id: "$importer", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
    }

    return {
        total: totalCount,
        recentJobs: recentCount,
        byStatus: statusCounts.reduce((acc, s) => {
            acc[s._id || 'Unknown'] = s.count;
            return acc;
        }, {}),
        topImporters: topImporters.map(i => ({ name: i._id, count: i.count }))
    };
};

// Search Weaviate with importer filter (for specific job queries)
const searchJobs = async (query, allowedImporters) => {
    console.log("[AI] Searching Weaviate for:", query);

    let whereFilter = null;
    if (allowedImporters && allowedImporters.length > 0) {
        if (allowedImporters.length === 1) {
            whereFilter = {
                path: ["importer"],
                operator: "Equal",
                valueText: allowedImporters[0]
            };
        } else {
            whereFilter = {
                operator: "Or",
                operands: allowedImporters.map(imp => ({
                    path: ["importer"],
                    operator: "Equal",
                    valueText: imp
                }))
            };
        }
    }

    let graphqlQuery = client.graphql
        .get()
        .withClassName("JobContext")
        .withBm25({
            query: query,
            properties: ["text"]
        })
        .withLimit(10)
        .withFields("text job_no year importer status");

    if (whereFilter) {
        graphqlQuery = graphqlQuery.withWhere(whereFilter);
    }

    const result = await graphqlQuery.do();
    return result.data?.Get?.JobContext || [];
};

export const chat = async (req, res) => {
    try {
        const { question } = req.body;
        console.log("[AI] Question:", question);
        console.log("[AI] User:", req.user?.email, "Role:", req.user?.role);

        if (!question) {
            return res.status(400).json({ success: false, error: "Question is required" });
        }

        // Get user's allowed importers
        let allowedImporters = [];
        const userRole = req.user?.role || req.userType;

        if (userRole === "superadmin") {
            allowedImporters = null; // No filter for superadmin
        } else {
            const assignments = req.user?.ie_code_assignments || [];
            allowedImporters = assignments.map(a => a.importer_name).filter(Boolean);

            if (allowedImporters.length === 0 && req.user?.assignedImporterName) {
                allowedImporters = [req.user.assignedImporterName];
            }

            if (allowedImporters.length === 0) {
                return res.json({
                    success: true,
                    answer: "You don't have any importers assigned. Please contact your administrator.",
                    sources: [],
                    cost: "0.000000"
                });
            }
        }

        let context = "";
        let sources = [];

        // Check if this is a counting/statistics question
        if (isCountingQuestion(question)) {
            console.log("[AI] Detected counting question - querying MongoDB");
            const stats = await getJobStats(allowedImporters);

            context = `JOB STATISTICS:
- Total Jobs: ${stats.total}
- Jobs Created in Last 30 Days: ${stats.recentJobs}
- Status Breakdown: ${JSON.stringify(stats.byStatus)}
${stats.topImporters.length > 0 ? `- Top Importers: ${stats.topImporters.map(i => `${i.name} (${i.count})`).join(", ")}` : ""}`;

            sources = [{ type: "database_statistics", total: stats.total }];
        } else {
            // Regular search question - use Weaviate
            const docs = await searchJobs(question, allowedImporters);
            console.log("[AI] Found", docs.length, "documents");

            context = docs.length > 0
                ? docs.map(d => d.text).join("\n\n")
                : "No specific job data found matching your query.";

            sources = docs.map(d => ({ job_no: d.job_no, importer: d.importer, status: d.status }));
        }

        // Ask Claude
        console.log("[AI] Asking Claude...");
        const chatModel = getModel();

        const importerContext = allowedImporters
            ? `You have access to data for: ${allowedImporters.join(", ")}.`
            : "You have access to all importers (SuperAdmin).";

        const response = await chatModel.invoke([
            new HumanMessage(`You are a helpful assistant for a shipping/logistics company.
${importerContext}

Answer the user's question based on the data below.
Be specific with numbers when available. Be concise.

DATA:
${context}

USER QUESTION: ${question}`)
        ]);

        console.log("[AI] Response received!");

        res.json({
            success: true,
            answer: response.content,
            sources: sources,
            cost: "0.000100"
        });

    } catch (error) {
        console.error("[AI] Error:", error.message);
        res.status(500).json({
            success: false,
            error: "AI Service Failed",
            details: error.message
        });
    }
};
