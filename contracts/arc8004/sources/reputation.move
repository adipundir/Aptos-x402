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

    /// Registry to store all attestations
    struct ReputationRegistry has key {
        /// Admin address
        admin: address,
        /// Attestations indexed by agent_id hash
        attestations: Table<address, vector<ReputationAttestation>>,
        /// Total attestation count
        total_count: u64,
    }

    /// Aggregated reputation for an agent
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

    /// Initialize the reputation registry
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        move_to(admin, ReputationRegistry {
            admin: admin_addr,
            attestations: table::new(),
            total_count: 0,
        });
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

        // Emit event
        event::emit(FeedbackAttested {
            agent_id: attestation.agent_id,
            client_address: client_addr,
            score,
            payment_hash: attestation.payment_hash,
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
}










