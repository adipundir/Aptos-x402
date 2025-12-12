/**
 * Fix token address for agent identity
 * Updates the token_address in agent_identities table with the correct value from the mint transaction
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables FIRST
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = neon(DATABASE_URL);

async function fixTokenAddress() {
  const agentId = 'agent_1765546424580_eiu1zvei4';
  const correctTokenAddress = '0x220cdde94a7e57cfc8ce072a6bf808a78f2df31e7b970d8e6609730083e771a6';
  
  console.log(`Updating token address for agent: ${agentId}`);
  console.log(`Setting token_address to: ${correctTokenAddress}`);
  
  try {
    const result = await sql`
      UPDATE agent_identities 
      SET token_address = ${correctTokenAddress}, updated_at = NOW()
      WHERE agent_id = ${agentId}
      RETURNING agent_id, token_address
    `;
    
    if (result && result.length > 0) {
      console.log('✅ Successfully updated token address!');
      console.log('Updated record:', result[0]);
    } else {
      console.log('⚠️  No record found to update. Agent ID might not exist.');
    }
  } catch (error) {
    console.error('❌ Failed to update token address:', error);
    throw error;
  }
}

fixTokenAddress()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

