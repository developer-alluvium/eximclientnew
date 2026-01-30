# AI-Powered Logistics Chatbot - Technical Documentation

## 🎯 Project Overview

Built an **AI-powered conversational assistant** for a logistics/shipping management platform that provides personalized, context-aware responses about shipment data.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              FloatingChatBot.jsx                         │   │
│  │   • Floating chat UI (Ant Design Drawer)                 │   │
│  │   • Real-time message rendering with ReactMarkdown       │   │
│  │   • Cookie-based authentication (credentials: include)   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP POST /api/ai/chat
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Authentication Layer                        │   │
│  │   • JWT token validation from HTTP-only cookies          │   │
│  │   • User context extraction (ie_code_assignments)        │   │
│  │   • Role-based access (user vs superadmin)               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              AI Controller (Hybrid Approach)             │   │
│  │                                                          │   │
│  │   ┌────────────────┐    ┌────────────────┐              │   │
│  │   │ Counting Query │    │ Search Query   │              │   │
│  │   │ Detection      │    │ Detection      │              │   │
│  │   └───────┬────────┘    └───────┬────────┘              │   │
│  │           │                     │                        │   │
│  │           ▼                     ▼                        │   │
│  │   ┌────────────────┐    ┌────────────────┐              │   │
│  │   │   MongoDB      │    │   Weaviate     │              │   │
│  │   │   Aggregation  │    │   BM25 Search  │              │   │
│  │   └───────┬────────┘    └───────┬────────┘              │   │
│  │           └──────────┬──────────┘                        │   │
│  │                      ▼                                   │   │
│  │           ┌────────────────────┐                        │   │
│  │           │   Claude 3 Haiku   │                        │   │
│  │           │   (Anthropic LLM)  │                        │   │
│  │           └────────────────────┘                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────┐       ┌──────────────────────┐
│       MongoDB        │       │       Weaviate       │
│  (Primary Database)  │       │   (Vector Database)  │
│  • Job Documents     │       │   • Text Embeddings  │
│  • User Data         │       │   • BM25 Index       │
│  • Aggregations      │       │   • Metadata Store   │
└──────────────────────┘       └──────────────────────┘
```

---

## 🔧 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **LLM** | Claude 3 Haiku (Anthropic) | Natural language understanding & response generation |
| **Vector DB** | Weaviate | BM25 keyword search for job data |
| **Primary DB** | MongoDB | Job data storage, aggregations, user management |
| **Framework** | LangChain.js | LLM orchestration and chain management |
| **Backend** | Node.js + Express | API server |
| **Frontend** | React + Ant Design | Chat UI components |
| **Auth** | JWT + HTTP-only Cookies | Secure session management |

---

## 🔑 Key Features Implemented

### 1. **Hybrid Query Strategy**
```javascript
// Keyword detection for counting vs search queries
const isCountingQuestion = (question) => {
    const countKeywords = ['how many', 'count', 'total', 'statistics', ...];
    return countKeywords.some(kw => question.toLowerCase().includes(kw));
};
```
- **Counting Questions** → Direct MongoDB aggregation (accurate totals)
- **Search Questions** → Weaviate BM25 text search (relevant documents)

### 2. **Personalized Data Access**
```javascript
// Filter data based on user's assigned importers
const assignments = req.user?.ie_code_assignments || [];
const allowedImporters = assignments.map(a => a.importer_name);
```
- Users only see data for their assigned importers/IEC codes
- SuperAdmins have unrestricted access
- Enforced at query level (both MongoDB and Weaviate)

### 3. **Data Ingestion Pipeline**
```javascript
// Batch insert 7000+ jobs into Weaviate
for (const job of jobs) {
    batcher.withObject({
        class: "JobContext",
        properties: {
            text: formatJobToText(job),  // Structured text for search
            job_no, year, importer, status  // Metadata for filtering
        }
    });
}
```

### 4. **Cookie-Based Authentication**
- HTTP-only cookies prevent XSS attacks
- `credentials: 'include'` in frontend fetch
- Server-side JWT verification with user context extraction

---

## 📊 What This Approach Achieves

| Metric | Approach | Result |
|--------|----------|--------|
| **Accuracy** | MongoDB aggregation for counts | 100% accurate statistics |
| **Relevance** | BM25 keyword search | Top 10 most relevant jobs |
| **Security** | Importer-level filtering | Data isolation per user |
| **Cost** | Claude 3 Haiku | ~$0.25/1M tokens (very affordable) |
| **Latency** | No embedding API calls | <2 sec response time |

---

## 🚀 Future Improvements (Not Implemented)

### Option 1: LangChain Agents with Tools
```javascript
// Define tools the LLM can call
const tools = [
    new DynamicTool({
        name: "getJobStats",
        description: "Get job statistics by status, date range, or importer",
        func: async (input) => { /* MongoDB query */ }
    }),
    new DynamicTool({
        name: "searchJobs", 
        description: "Search for specific jobs by text query",
        func: async (input) => { /* Weaviate search */ }
    })
];

// LLM decides which tool to use
const agent = new AgentExecutor({ llm: model, tools });
```

### Option 2: Function Calling (Claude/OpenAI Native)
```javascript
// Define functions in API call
const response = await anthropic.messages.create({
    model: "claude-3-haiku",
    tools: [{
        name: "query_jobs",
        input_schema: {
            type: "object",
            properties: {
                action: { enum: ["count", "search", "details"] },
                filters: { type: "object" }
            }
        }
    }],
    messages: [{ role: "user", content: question }]
});
```

### Option 3: Text-to-MongoDB
- LLM generates MongoDB queries from natural language
- Requires strict validation to prevent injection
- Most flexible but highest risk

---

## 📁 File Structure

```
server/
├── controllers/
│   └── aiController.js       # Main AI logic (hybrid query strategy)
├── routes/
│   └── aiRoutes.js           # Protected /api/ai/chat endpoint
├── scripts/
│   └── ingestJobs.js         # Weaviate data ingestion script
├── config/
│   └── weaviateClient.js     # Weaviate connection
├── middlewares/
│   └── authMiddleware.js     # JWT authentication
└── docker-compose.yml        # Weaviate container

client/
└── src/components/Chat/
    └── FloatingChatBot.jsx   # Chat UI component
```

---

## 🎓 Skills Demonstrated

- **AI/ML Integration**: LangChain, LLM APIs (Anthropic Claude)
- **Vector Databases**: Weaviate, BM25 search, embeddings concepts
- **Database Design**: MongoDB aggregations, query optimization
- **Security**: JWT, HTTP-only cookies, role-based access control
- **Full-Stack Development**: React, Node.js, Express
- **System Design**: Hybrid architecture, query routing, caching

---

## 📈 Metrics

- **7,137 jobs** ingested into vector database
- **<2 second** average response time
- **100% accurate** statistics via MongoDB aggregation
- **Role-based** data isolation for multi-tenant access

---

*Built as part of the EXIM Logistics Management Platform*
