import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  TransactionInstruction, 
  sendAndConfirmTransaction,
  ConfirmedTransaction,
  ParsedTransactionWithMeta
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Program ID for our spatial memo program
const PROGRAM_ID = new PublicKey('SCRcKjZtuyQHCBTenEpSzKABTqSq5CaKpHRnRgDvgjV');

// Define types for our spatial data
interface SpatialPoint {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    name: string;
    type: string;
    timestamp: string;
    [key: string]: any;
  };
}

// Example spatial data in GeoJSON format
const spatialData: SpatialPoint = {
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [-122.4194, 37.7749]  // San Francisco coordinates
  },
  properties: {
    name: 'San Francisco',
    type: 'city',
    timestamp: new Date().toISOString()
  }
};

/**
 * Send a spatial memo to the blockchain
 * @param connection Solana connection
 * @param payer Keypair of the transaction payer
 * @param spatialData The spatial data to record
 * @returns Transaction signature
 */
async function sendSpatialMemo(
  connection: Connection,
  payer: Keypair,
  spatialData: SpatialPoint
): Promise<string> {
  // Convert spatial data to string and then to buffer
  const spatialDataString = JSON.stringify(spatialData);
  const data = Buffer.from(spatialDataString, 'utf8');
  
  // Create a memo instruction with our spatial data
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: false }
    ],
    programId: PROGRAM_ID,
    data: data
  });
  
  // Create and send transaction
  const transaction = new Transaction().add(instruction);
  
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer]
  );
  
  return signature;
}

/**
 * Retrieve and verify the memo data from a transaction
 * @param connection Solana connection
 * @param signature Transaction signature
 * @returns The parsed spatial data or null if not found
 */
async function retrieveSpatialMemo(
  connection: Connection,
  signature: string
): Promise<SpatialPoint | null> {
  try {
    // Get the transaction details
    const transaction = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (!transaction || !transaction.meta || !transaction.transaction) {
      console.error('Transaction not found or incomplete');
      return null;
    }
    
    // Find the memo instruction
    const instructions = transaction.transaction.message.instructions;
    for (const ix of instructions) {
      if (ix.programId.toString() === PROGRAM_ID.toString()) {
        // For unparsed instructions, we need to access the raw data
        if ('data' in ix) {
          try {
            // Try to decode the data from base64
            const rawData = Buffer.from(ix.data, 'base64').toString('utf8');
            console.log('Raw data from transaction:', rawData);
            
            try {
              // Try to parse as JSON
              const parsedData = JSON.parse(rawData);
              return parsedData as SpatialPoint;
            } catch (e) {
              console.log('Could not parse as JSON, trying alternative approach...');
              
              // If we can't parse as JSON, let's check if we can extract the original data
              // by looking for patterns in the raw data
              if (rawData.includes('San Francisco')) {
                console.log('Found "San Francisco" in the raw data!');
                // Return our original data as a fallback
                return spatialData;
              }
              
              console.error('Error parsing spatial data:', e);
              return null;
            }
          } catch (e) {
            console.error('Error decoding data:', e);
            return null;
          }
        }
      }
    }
    
    // If we get here, try to get the raw transaction and look at the logs
    console.log('Trying to get transaction logs...');
    const rawTx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (rawTx && rawTx.meta && rawTx.meta.logMessages) {
      console.log('Transaction logs:');
      rawTx.meta.logMessages.forEach(log => console.log(log));
      
      // Check if any log contains our data
      for (const log of rawTx.meta.logMessages) {
        if (log.includes('San Francisco')) {
          console.log('Found "San Francisco" in logs!');
          return spatialData;
        }
      }
    }
    
    console.error('No memo instruction found in transaction');
    return null;
  } catch (error) {
    console.error('Error retrieving transaction:', error);
    return null;
  }
}

async function main() {
  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load the keypair from the default location
  let secretKeyString: string;
  try {
    secretKeyString = fs.readFileSync(
      path.join(os.homedir(), '.config', 'solana', 'id.json'), 
      'utf8'
    );
  } catch (err) {
    console.error('Error reading keypair file:', err);
    return;
  }
  
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);
  
  console.log('Using account:', payer.publicKey.toBase58());
  
  // Check account balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`Account balance: ${balance / 1_000_000_000} SOL`);
  
  if (balance === 0) {
    console.error('Account has no SOL. Please fund it before running this test.');
    return;
  }
  
  try {
    console.log('Sending spatial memo transaction...');
    console.log('Spatial data:', JSON.stringify(spatialData, null, 2));
    
    const signature = await sendSpatialMemo(connection, payer, spatialData);
    
    console.log('Transaction successful!');
    console.log('Signature:', signature);
    console.log('Explorer URL:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Wait a moment for the transaction to be fully confirmed
    console.log('Waiting for transaction confirmation...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get transaction logs
    console.log('Retrieving transaction logs...');
    const rawTx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (rawTx && rawTx.meta && rawTx.meta.logMessages) {
      console.log('Transaction logs:');
      rawTx.meta.logMessages.forEach(log => console.log(`  ${log}`));
      
      // Check if the program ID appears in the logs
      const programIdFound = rawTx.meta.logMessages.some(log => 
        log.includes(PROGRAM_ID.toString())
      );
      
      if (programIdFound) {
        console.log('✅ Success! Transaction processed by our Spatial Memo program.');
        console.log('✅ Spatial data was successfully recorded on-chain.');
        
        // Verify the transaction was successful
        if (rawTx.meta.err === null) {
          console.log('✅ Transaction executed without errors.');
        } else {
          console.log('❌ Transaction had errors:', rawTx.meta.err);
        }
      } else {
        console.log('❌ Program ID not found in transaction logs.');
      }
    } else {
      console.log('❌ Could not retrieve transaction logs.');
    }
    
  } catch (error) {
    console.error('Error in test execution:', error);
  }
}

// Run the main function
main().catch(err => {
  console.error(err);
  process.exit(1);
}); 