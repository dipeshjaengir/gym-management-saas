const mongoose = require('mongoose');
const dns = require('dns');
const { URL } = require('url');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gym-management-saas';

console.log('=== MongoDB Atlas Connectivity Diagnostic Tool ===');
console.log(`Target URI: ${uri.replace(/:([^@]+)@/, ':****@')}`); // Mask password

async function runDiagnostics() {
  // 1. Parse URI
  let parsedUrl;
  try {
    if (uri.startsWith('mongodb+srv://')) {
      const host = uri.split('@')[1].split('/')[0].split('?')[0];
      console.log(`[PASS] Connection Protocol: SRV`);
      console.log(`[INFO] Cluster Host: ${host}`);
      parsedUrl = { host };
    } else {
      parsedUrl = new URL(uri);
      console.log(`[PASS] Connection Protocol: Standard`);
      console.log(`[INFO] Hostname: ${parsedUrl.hostname}`);
    }
  } catch (err) {
    console.error(`[FAIL] URI Parsing: Connection string is not valid. Error: ${err.message}`);
    return;
  }

  // 2. Test DNS Resolution
  console.log('\n--- Step 1: DNS Resolution Test ---');
  try {
    const lookupHost = parsedUrl.host || parsedUrl.hostname;
    dns.resolveTxt(`_mongodb._tcp.${lookupHost}`, (err, addresses) => {
      if (err) {
        console.log(`[WARN] SRV DNS Lookup failed. Attempting standard A-record lookup for ${lookupHost}...`);
        dns.lookup(lookupHost, (err2, address) => {
          if (err2) {
            console.error(`[FAIL] DNS Lookup failed. Cannot resolve hostname: ${lookupHost}. Error: ${err2.message}`);
          } else {
            console.log(`[PASS] Resolved hostname to IP: ${address}`);
          }
        });
      } else {
        console.log(`[PASS] Resolved SRV record. Cluster addresses found:`);
        console.log(addresses);
      }
    });
  } catch (err) {
    console.error(`[FAIL] DNS Resolver error: ${err.message}`);
  }

  // Wait briefly for async DNS callbacks
  await new Promise(r => setTimeout(r, 2000));

  // 3. Test Network Connection using Mongoose
  console.log('\n--- Step 2: Mongoose Connection Test ---');
  try {
    console.log('Connecting to database...');
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
    console.log('[PASS] Connected successfully to MongoDB!');
    await mongoose.connection.close();
  } catch (err) {
    console.error('[FAIL] Connection failed!');
    console.error(`Error Name: ${err.name}`);
    console.error(`Error Message: ${err.message}`);
    
    if (err.name === 'MongooseServerSelectionError') {
      console.log('\n💡 DIAGNOSTIC INSIGHT:');
      console.log('The MongooseServerSelectionError indicates that your app cannot reach any database servers.');
      console.log('This is 99% of the time caused by one of the following:');
      console.log('1. IP Whitelisting: MongoDB Atlas blocks access by default. You MUST go to Atlas -> Network Access, and add "0.0.0.0/0" to allow Render hosts to connect.');
      console.log('2. Network Restrictions: If you are behind a strict corporate firewall, port 27017 or SRV DNS resolution might be blocked.');
      console.log('3. Password Characters: If your password contains special characters like @, :, /, ?, they MUST be URL-encoded (e.g. replace "@" with "%40").');
    }
  }
}

runDiagnostics();
