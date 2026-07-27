const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gym-management-saas';

async function run() {
  try {
    console.log('Connecting to', uri);
    await mongoose.connect(uri);
    console.log('Connected!');
    
    // Find all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    // Get superadmins
    const superadmins = await mongoose.connection.db.collection('superadmins').find({}).toArray();
    console.log('SuperAdmins found:', superadmins.length);
    for (const sa of superadmins) {
      console.log('SA:', {
        id: sa._id,
        name: sa.name,
        email: sa.email,
        role: sa.role,
        passwordHash: sa.passwordHash
      });
      // Check password
      const superAdminPass = process.env.SUPERADMIN_PASSWORD || 'YOUR_STRONG_SUPERADMIN_PASSWORD';
      const isMatch = await bcrypt.compare(superAdminPass, sa.passwordHash);
      console.log(`Password "${superAdminPass}" matches:`, isMatch);
    }

    // Get gym owners
    const owners = await mongoose.connection.db.collection('gymowners').find({}).toArray();
    console.log('GymOwners found:', owners.length);
    for (const o of owners) {
      console.log('GymOwner:', {
        id: o._id,
        gymName: o.gymName,
        ownerName: o.ownerName,
        email: o.email,
        isTrial: o.isTrial
      });
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
