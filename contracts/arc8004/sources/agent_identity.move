/// ARC-8004: Agent Identity Module
/// 
/// Provides on-chain identity management for AI agents using Aptos Digital Assets.
/// Each agent receives a unique NFT representing their verifiable identity.
module arc8004::agent_identity {
    use std::string::{Self, String};
    use std::signer;
    use std::vector;
    use std::option::{Self, Option};
    use aptos_framework::object::{Self};
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_token_objects::collection;
    use aptos_token_objects::token;

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_IDENTITY_ALREADY_EXISTS: u64 = 2;
    const E_IDENTITY_NOT_FOUND: u64 = 3;
    const E_INVALID_AGENT_ID: u64 = 4;
    const E_COLLECTION_NOT_INITIALIZED: u64 = 5;

    /// Collection name for agent identities
    const COLLECTION_NAME: vector<u8> = b"ARC-8004 Agent Identities";
    const COLLECTION_DESCRIPTION: vector<u8> = b"Verifiable on-chain identities for AI agents";
    const COLLECTION_URI: vector<u8> = b"https://arc8004.aptos.dev/collection";

    /// Agent Identity resource stored in the token object
    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct AgentIdentity has key {
        /// Unique agent identifier
        agent_id: String,
        /// Agent display name
        name: String,
        /// URI to off-chain metadata (Agent Card)
        metadata_uri: String,
        /// Agent capabilities
        capabilities: vector<String>,
        /// Creation timestamp
        created_at: u64,
        /// Verification status
        verified: bool,
        /// Verifier address (if verified)
        verified_by: Option<address>,
        /// Verification timestamp
        verified_at: Option<u64>,
    }

    /// Registry to track agent identities by agent_id
    struct IdentityRegistry has key {
        /// Admin address for verification
        admin: address,
    }

    /// Events
    #[event]
    struct IdentityCreated has drop, store {
        agent_id: String,
        owner: address,
        token_address: address,
        timestamp: u64,
    }

    #[event]
    struct IdentityVerified has drop, store {
        agent_id: String,
        verified_by: address,
        timestamp: u64,
    }

    #[event]
    struct IdentityUpdated has drop, store {
        agent_id: String,
        updated_by: address,
        timestamp: u64,
    }

    /// Initialize the identity registry and collection
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        // Create the collection for agent identity NFTs
        collection::create_unlimited_collection(
            admin,
            string::utf8(COLLECTION_DESCRIPTION),
            string::utf8(COLLECTION_NAME),
            option::none(),
            string::utf8(COLLECTION_URI),
        );

        // Create registry
        move_to(admin, IdentityRegistry {
            admin: admin_addr,
        });
    }

    /// Mint a new agent identity NFT
    public entry fun mint_identity(
        creator: &signer,
        agent_id: String,
        name: String,
        metadata_uri: String,
        capabilities_json: String,
    ) {
        let creator_addr = signer::address_of(creator);
        
        // Parse capabilities from JSON string (simplified - just store as single element)
        let capabilities = vector::empty<String>();
        vector::push_back(&mut capabilities, capabilities_json);

        // Create the token
        let token_constructor = token::create_named_token(
            creator,
            string::utf8(COLLECTION_NAME),
            string::utf8(COLLECTION_DESCRIPTION),
            agent_id,
            option::none(),
            metadata_uri,
        );

        let token_signer = object::generate_signer(&token_constructor);
        let token_addr = signer::address_of(&token_signer);
        
        let now = timestamp::now_seconds();
        
        // Copy agent_id for event before moving into struct
        let agent_id_copy = agent_id;

        // Create and store the identity resource
        let identity = AgentIdentity {
            agent_id,
            name,
            metadata_uri,
            capabilities,
            created_at: now,
            verified: false,
            verified_by: option::none(),
            verified_at: option::none(),
        };

        move_to(&token_signer, identity);

        // Emit event
        event::emit(IdentityCreated {
            agent_id: agent_id_copy,
            owner: creator_addr,
            token_address: token_addr,
            timestamp: now,
        });
    }

    /// Verify an agent identity (admin only)
    public entry fun verify_identity(
        admin: &signer,
        token_address: address,
    ) acquires IdentityRegistry, AgentIdentity {
        let admin_addr = signer::address_of(admin);
        
        // Check admin authorization
        let registry = borrow_global<IdentityRegistry>(@arc8004);
        assert!(registry.admin == admin_addr, E_NOT_AUTHORIZED);

        // Update identity
        let identity = borrow_global_mut<AgentIdentity>(token_address);
        let now = timestamp::now_seconds();
        
        identity.verified = true;
        identity.verified_by = option::some(admin_addr);
        identity.verified_at = option::some(now);

        // Emit event
        event::emit(IdentityVerified {
            agent_id: identity.agent_id,
            verified_by: admin_addr,
            timestamp: now,
        });
    }

    /// Update identity metadata
    public entry fun update_metadata(
        owner: &signer,
        token_address: address,
        new_metadata_uri: String,
    ) acquires AgentIdentity {
        let owner_addr = signer::address_of(owner);
        
        // Verify ownership
        let token_object = object::address_to_object<token::Token>(token_address);
        assert!(object::owner(token_object) == owner_addr, E_NOT_AUTHORIZED);

        // Update metadata
        let identity = borrow_global_mut<AgentIdentity>(token_address);
        identity.metadata_uri = new_metadata_uri;

        // Emit event
        event::emit(IdentityUpdated {
            agent_id: identity.agent_id,
            updated_by: owner_addr,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// View functions
    
    #[view]
    public fun get_identity(token_address: address): (String, String, String, bool, u64) acquires AgentIdentity {
        let identity = borrow_global<AgentIdentity>(token_address);
        (
            identity.agent_id,
            identity.name,
            identity.metadata_uri,
            identity.verified,
            identity.created_at,
        )
    }

    #[view]
    public fun is_verified(token_address: address): bool acquires AgentIdentity {
        let identity = borrow_global<AgentIdentity>(token_address);
        identity.verified
    }

    #[view]
    public fun get_agent_id(token_address: address): String acquires AgentIdentity {
        let identity = borrow_global<AgentIdentity>(token_address);
        identity.agent_id
    }
}

