# AI System Requirements — Client Intake Document

This document lists everything needed from the client before building the RAG system and AI agents for Zenova.

---

## 1. Agent Personas

Zenova has 3 AI agents: **Calia**, **Noura**, and **Aeron**.

For each agent, provide:

### Basic Identity
- [ ] Full name and backstory (who is this agent?)
- [ ] What is their area of expertise?
  - Example: Calia = Nutrition & Meal Planning, Noura = Mindfulness & Mental Wellness, Aeron = Fitness & Movement
- [ ] Age, background, and personality in 2–3 paragraphs
- [ ] Profile photo / avatar reference (if any)

### Tone & Communication Style
- [ ] Describe the tone in detail (Calm / Energetic / Insightful — what does this mean in actual words?)
- [ ] Formal or casual language?
- [ ] Does the agent use emojis?
- [ ] Short responses (1–2 lines) or detailed explanations?
- [ ] Does the agent ask follow-up questions?
- [ ] Example of a good response from this agent (write 3–5 sample replies)

### Boundaries
- [ ] What topics can this agent NOT discuss?
- [ ] What happens when user asks something outside the agent's scope? (redirect to another agent / politely decline)
- [ ] Can agents give medical advice or only general wellness guidance?
- [ ] What to say when the agent doesn't know the answer?

---

## 2. Knowledge Base Content

The RAG system retrieves documents to answer user questions accurately. Provide:

### Wellness Content
- [ ] Nutrition guides / meal planning documents
- [ ] Workout plans and exercise descriptions
- [ ] Meditation and breathing technique guides
- [ ] Sleep hygiene articles
- [ ] Mental wellness / mood management content
- [ ] Any Zenova-specific programs or plans

### Format
- Accepted formats: PDF, Word Doc, Google Doc, Notion export, plain text
- Rough drafts are fine — content will be cleaned and indexed
- Minimum recommended: **20–30 documents** to start

### Questions the Knowledge Base Must Answer
List the most common questions users will ask. Examples:
- "What should I eat after a workout?"
- "How do I improve my sleep quality?"
- "Why is my mood low this week?"
- "Give me a 10-minute meditation for stress"

Provide at least **30–50 expected questions** categorized by agent.

---

## 3. Personalization — User Data Access

Confirm which user data the agents are allowed to read and use in responses:

| Data | Allow? |
|---|---|
| User's name | Yes / No |
| Age, gender | Yes / No |
| Recent meal logs (last 7 days) | Yes / No |
| Workout history | Yes / No |
| Sleep patterns | Yes / No |
| Mood trends | Yes / No |
| Meditation / yoga logs | Yes / No |
| Current streak (daily & nova) | Yes / No |
| Level & rank in gamification | Yes / No |
| Nova Coins balance | Yes / No |
| Goals set during onboarding | Yes / No |
| Health metrics (BMR, steps, weight) | Yes / No |
| Screen time logs | Yes / No |

---

## 4. Conversation Memory

- [ ] Should agents remember previous conversations with the user?
  - **No memory** — each conversation starts fresh
  - **Short-term** — remember last N messages in the same session
  - **Long-term** — remember key facts across sessions (e.g. user is vegetarian, prefers morning workouts)
- [ ] If long-term memory: what facts should be remembered?
- [ ] Should users be able to clear their memory / chat history?

---

## 5. Agent Routing

- [ ] Does the user manually pick which agent to talk to (Calia / Noura / Aeron)?
- [ ] Or does the system auto-detect and route to the right agent based on the question?
- [ ] Can agents hand off to each other mid-conversation?
  - Example: User asks Aeron a nutrition question → Aeron says "Let me connect you with Calia"

---

## 6. Response Behavior

- [ ] Should responses stream word by word (like ChatGPT) or appear all at once?
- [ ] Maximum response length?
- [ ] Should agents proactively suggest actions?
  - Example: "You haven't logged a meal today — want me to suggest something?"
- [ ] Should agents reference the user's data unprompted?
  - Example: "I see your sleep has been under 6 hours this week..."
- [ ] Should agents celebrate streaks, level-ups, quest completions?

---

## 7. Sample Q&A Pairs

For each agent, provide **10–15 sample conversations** showing:
- What the user asked
- What the ideal agent response looks like

This is the most important input — it directly shapes the system prompt and response quality.

**Format:**
```
User: I've been feeling really tired lately even after 8 hours of sleep.
Noura: That's worth paying attention to. Deep sleep quality matters more than total hours...
```

---

## 8. App Context for Agents

Agents need to understand Zenova to respond in context:

- [ ] What is Zenova's mission in 1–2 sentences?
- [ ] What are the core features users use daily?
- [ ] What is the Nova-streak system? How does it work?
- [ ] What are Nova Coins and how are they earned?
- [ ] What are the ranks (Awakener → Grand Zenova)?
- [ ] Are there any features currently NOT available that agents should NOT mention?

---

## 9. Languages

- [ ] English only, or multilingual?
- [ ] If multilingual — which languages? (Hindi, Spanish, etc.)
- [ ] Should the agent respond in the same language the user writes in?

---

## 10. Safety & Compliance

- [ ] Is there a disclaimer needed? (e.g. "I am not a medical professional")
- [ ] What happens if a user mentions self-harm, eating disorders, or mental health crises?
  - Provide a crisis response script or helpline to include
- [ ] Any regulatory requirements? (HIPAA, GDPR, etc.)
- [ ] Can the agent recommend supplements or specific products?

---

## Delivery Checklist

Send the following to get started:

| Item | Priority | Format |
|---|---|---|
| Agent persona briefs (Calia, Noura, Aeron) | 🔴 Must have | Google Doc / PDF |
| Sample Q&A pairs (10–15 per agent) | 🔴 Must have | Google Sheet / Doc |
| Knowledge base documents | 🔴 Must have | PDF / Doc / Notion |
| Data access permissions list | 🔴 Must have | Fill table above |
| Tone examples (sample replies) | 🔴 Must have | Google Doc |
| Expected user questions (30–50) | 🟡 Important | Google Sheet |
| Conversation memory preference | 🟡 Important | Written answer |
| Agent routing preference | 🟡 Important | Written answer |
| Safety / crisis response script | 🟡 Important | Written answer |
| App context brief | 🟢 Nice to have | Google Doc |
| Multilingual requirements | 🟢 Nice to have | Written answer |
