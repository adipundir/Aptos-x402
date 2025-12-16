# ARC-8004: 5 Practical Use Cases

ARC-8004 enables verifiable agent identity, reputation, and task validation on Aptos, integrated with x402 payments. Here are five concrete ways to use it.

## 1) Agent Marketplace with Trust Filters
- **Problem:** Marketplaces need to surface trustworthy agents and hide unverified/low-trust ones.
- **Solution:** Gate listings by `verified` + `trustLevel >= GOOD`.
- **How:** Use `IdentityRegistry.resolveIdentity(agentId)` and `ReputationRegistry.getReputation(agentId)`; show badges in UI and sort by `trustLevel`.

## 2) Pay-on-Validation Workflows (Escrow-ish)
- **Problem:** Release payment only after an external validator confirms task completion.
- **Solution:** Use `ValidationRegistry.verifyTaskForPayment(taskId, agentId)` before settling x402.
- **How:** Add a pre-settlement check in your backend or facilitator: if `isValid === false`, block/rollback payment; if true, proceed to settle.

## 3) SLA-backed Service Agents
- **Problem:** API owners want uptime/reliability SLAs and proof of performance.
- **Solution:** Record feedback with categories (`reliability`, `speed`, `accuracy`) and attach payment hashes to attest usage.
- **How:** Call `submitFeedback` with category scores + `paymentHash`; display rolling averages in dashboards and enforce minimum trust for premium tiers.

## 4) Federated/Enterprise Agent Allow-Lists
- **Problem:** Enterprises only allow agents that are verified and meet internal trust thresholds.
- **Solution:** Build an allow-list service backed by ARC-8004 on-chain identities and reputation thresholds.
- **How:** Maintain a simple allow/deny table keyed by `agentId`; auto-update via periodic checks to `IdentityRegistry` and `ReputationRegistry`.

## 5) Multi-Agent Swarms with Role-Based Trust
- **Problem:** Swarms need to delegate to sub-agents but only to reliable roles (e.g., “data-fetcher”, “payer”).
- **Solution:** Encode capabilities in the Agent Card and require minimum trust per role.
- **How:** Before delegation, check `agentCard.capabilities` and `trustLevel`; reject if missing capability or under threshold.

---

## Quick Integration Patterns
- **Identity & Badge:** Resolve identity + verified flag and show a “Verified” badge; fallback to “Unverified” warning.
- **Trust Badges:** Map `trustLevel` to color/label (see `getTrustLevelColor/Label`) and show score + feedback count.
- **Feedback after Payment:** After x402 response, POST to `/api/arc8004/reputation/feedback` with `paymentHash`.
- **Validation Gate:** Before expensive actions, call `/api/arc8004/validation?taskId=...` and block if not validated.

## References
- Guide: [ARC-8004 Integration](/docs/guides/arc8004)
- Modules (testnet):  
  - Identity: `0xa4d7e1f47887dc6b84743297164fdd63deaa872329f8617be1d4c87375d39323::agent_identity`  
  - Reputation: `0xa4d7e1f47887dc6b84743297164fdd63deaa872329f8617be1d4c87375d39323::reputation`  
  - Validation: `0xa4d7e1f47887dc6b84743297164fdd63deaa872329f8617be1d4c87375d39323::validation`



















