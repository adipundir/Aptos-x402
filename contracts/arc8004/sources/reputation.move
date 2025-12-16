/// ARC-8004: Reputation Module
/// 
/// Provides on-chain reputation attestations for AI agents.
/// Stores feedback and trust scores with cryptographic proofs.
module arc8004::reputation {
    use std::string::String;
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::table::{Self, Table};

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INVALID_SCORE: u64 = 2;
    const E_ATTESTATION_NOT_FOUND: u64 = 3;
    const E_AGENT_NOT_FOUND: u64 = 4;

    /// Trust level thresholds (scaled by 100)
    const TRUST_LEVEL_UNKNOWN: u8 = 0;
    const TRUST_LEVEL_NEW: u8 = 1;
    const TRUST_LEVEL_DEVELOPING: u8 = 2;
    const TRUST_LEVEL_ESTABLISHED: u8 = 3;
    const TRUST_LEVEL_TRUSTED: u8 = 4;
    const TRUST_LEVEL_EXCELLENT: u8 = 5;

    /// Reputation attestation stored on-chain
    struct ReputationAttestation has store, drop, copy {
        /// Agent that received the feedback
        agent_id: String,
        /// Client who submitted feedback
        client_address: address,
        /// Overall score (1-5)
        score: u8,
        /// Related payment hash (x402 integration)
        payment_hash: String,
        /// Timestamp of attestation
        timestamp: u64,
    }

    /// Aggregated agent score stored on-chain
    struct AgentScore has store, drop, copy {
        /// Total sum of all scores
        total_score: u64,
        /// Number of feedback submissions
        feedback_count: u64,
        /// Average score scaled by 100 (e.g., 450 = 4.50)
        average_score_scaled: u64,
        /// Computed trust level (0-5)
        trust_level: u8,
        /// Last update timestamp
        last_updated: u64,
    }

    /// Registry to store all attestations
    struct ReputationRegistry has key {
        /// Admin address
        admin: address,
        /// Attestations indexed by agent_id hash
        attestations: Table<address, vector<ReputationAttestation>>,
        /// Aggregated scores per agent (keyed by agent address hash)
        agent_scores: Table<String, AgentScore>,
        /// Total attestation count
        total_count: u64,
    }

    /// Aggregated reputation for an agent (legacy, kept for compatibility)
    struct AgentReputationSummary has store, drop, copy {
        agent_id: String,
        total_score: u64,
        feedback_count: u64,
        average_score: u64, // Scaled by 100 for precision (e.g., 450 = 4.5)
        last_updated: u64,
    }

    /// Events
    #[event]
    struct FeedbackAttested has drop, store {
        agent_id: String,
        client_address: address,
        score: u8,
        payment_hash: String,
        timestamp: u64,
    }

    #[event]
    struct AgentScoreUpdated has drop, store {
        agent_id: String,
        average_score_scaled: u64,
        trust_level: u8,
        feedback_count: u64,
        timestamp: u64,
    }

    /// Initialize the reputation registry
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        move_to(admin, ReputationRegistry {
            admin: admin_addr,
            attestations: table::new(),
            agent_scores: table::new(),
            total_count: 0,
        });
    }

    /// Calculate trust level from average score (scaled by 100)
    fun calculate_trust_level(average_score_scaled: u64, feedback_count: u64): u8 {
        if (feedback_count == 0) {
            return TRUST_LEVEL_UNKNOWN
        };
        if (feedback_count < 3) {
            return TRUST_LEVEL_NEW
        };
        
        // Average score is scaled by 100, so 450 = 4.50
        if (average_score_scaled >= 450) {
            TRUST_LEVEL_EXCELLENT
        } else if (average_score_scaled >= 400) {
            TRUST_LEVEL_TRUSTED
        } else if (average_score_scaled >= 350) {
            TRUST_LEVEL_ESTABLISHED
        } else if (average_score_scaled >= 300) {
            TRUST_LEVEL_DEVELOPING
        } else {
            TRUST_LEVEL_NEW
        }
    }

    /// Submit feedback attestation
    public entry fun attest_feedback(
        client: &signer,
        agent_id: String,
        _client_address_str: String, // Unused, we use signer address
        score: u8,
        payment_hash: String,
    ) acquires ReputationRegistry {
        // Validate score
        assert!(score >= 1 && score <= 5, E_INVALID_SCORE);

        let client_addr = signer::address_of(client);
        let now = timestamp::now_seconds();

        let attestation = ReputationAttestation {
            agent_id,
            client_address: client_addr,
            score,
            payment_hash,
            timestamp: now,
        };

        // Store attestation
        let registry = borrow_global_mut<ReputationRegistry>(@arc8004);
        
        // Use client address as key for simplicity
        if (!table::contains(&registry.attestations, client_addr)) {
            table::add(&mut registry.attestations, client_addr, vector::empty());
        };
        
        let attestation_list = table::borrow_mut(&mut registry.attestations, client_addr);
        vector::push_back(attestation_list, attestation);
        
        registry.total_count = registry.total_count + 1;

        // Update aggregated agent score
        if (!table::contains(&registry.agent_scores, agent_id)) {
            table::add(&mut registry.agent_scores, agent_id, AgentScore {
                total_score: 0,
                feedback_count: 0,
                average_score_scaled: 0,
                trust_level: TRUST_LEVEL_UNKNOWN,
                last_updated: now,
            });
        };

        let agent_score = table::borrow_mut(&mut registry.agent_scores, agent_id);
        agent_score.total_score = agent_score.total_score + (score as u64);
        agent_score.feedback_count = agent_score.feedback_count + 1;
        agent_score.average_score_scaled = (agent_score.total_score * 100) / agent_score.feedback_count;
        agent_score.trust_level = calculate_trust_level(agent_score.average_score_scaled, agent_score.feedback_count);
        agent_score.last_updated = now;

        // Emit events
        event::emit(FeedbackAttested {
            agent_id: attestation.agent_id,
            client_address: client_addr,
            score,
            payment_hash: attestation.payment_hash,
            timestamp: now,
        });

        event::emit(AgentScoreUpdated {
            agent_id: attestation.agent_id,
            average_score_scaled: agent_score.average_score_scaled,
            trust_level: agent_score.trust_level,
            feedback_count: agent_score.feedback_count,
            timestamp: now,
        });
    }

    /// Batch attest multiple feedbacks (for efficiency)
    public entry fun attest_feedback_batch(
        client: &signer,
        agent_ids: vector<String>,
        scores: vector<u8>,
        payment_hashes: vector<String>,
    ) acquires ReputationRegistry {
        let len = vector::length(&agent_ids);
        assert!(len == vector::length(&scores), E_INVALID_SCORE);
        assert!(len == vector::length(&payment_hashes), E_INVALID_SCORE);

        let i = 0;
        while (i < len) {
            let agent_id = *vector::borrow(&agent_ids, i);
            let score = *vector::borrow(&scores, i);
            let payment_hash = *vector::borrow(&payment_hashes, i);
            
            attest_feedback(
                client,
                agent_id,
                std::string::utf8(b""), // Unused
                score,
                payment_hash,
            );
            
            i = i + 1;
        };
    }

    /// View functions
    
    #[view]
    public fun get_total_attestations(): u64 acquires ReputationRegistry {
        let registry = borrow_global<ReputationRegistry>(@arc8004);
        registry.total_count
    }

    #[view]
    public fun get_client_attestations(client_address: address): vector<ReputationAttestation> acquires ReputationRegistry {
        let registry = borrow_global<ReputationRegistry>(@arc8004);
        
        if (table::contains(&registry.attestations, client_address)) {
            *table::borrow(&registry.attestations, client_address)
        } else {
            vector::empty()
        }
    }

    /// Get aggregated score for an agent
    #[view]
    public fun get_agent_score(agent_id: String): (u64, u64, u64, u8, u64) acquires ReputationRegistry {
        let registry = borrow_global<ReputationRegistry>(@arc8004);
        
        if (table::contains(&registry.agent_scores, agent_id)) {
            let score = table::borrow(&registry.agent_scores, agent_id);
            (
                score.total_score,
                score.feedback_count,
                score.average_score_scaled,
                score.trust_level,
                score.last_updated
            )
        } else {
            (0, 0, 0, TRUST_LEVEL_UNKNOWN, 0)
        }
    }

    /// Get trust level for an agent (convenience function)
    #[view]
    public fun get_agent_trust_level(agent_id: String): u8 acquires ReputationRegistry {
        let registry = borrow_global<ReputationRegistry>(@arc8004);
        
        if (table::contains(&registry.agent_scores, agent_id)) {
            let score = table::borrow(&registry.agent_scores, agent_id);
            score.trust_level
        } else {
            TRUST_LEVEL_UNKNOWN
        }
    }

    /// Check if an agent has any reputation data
    #[view]
    public fun has_reputation(agent_id: String): bool acquires ReputationRegistry {
        let registry = borrow_global<ReputationRegistry>(@arc8004);
        table::contains(&registry.agent_scores, agent_id)
    }
}
