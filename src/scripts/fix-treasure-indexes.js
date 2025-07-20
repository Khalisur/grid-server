const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const fixTreasureIndexes = async () => {
  try {
    console.log('🔧 Fixing Treasure Collection Indexes');
    console.log('=====================================');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the treasures collection
    const db = mongoose.connection.db;
    const treasuresCollection = db.collection('treasures');

    // Get current indexes
    console.log('\n📋 Current indexes:');
    const currentIndexes = await treasuresCollection.indexes();
    currentIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Drop the old propertyId index if it exists
    console.log('\n🗑️ Removing old propertyId index...');
    try {
      await treasuresCollection.dropIndex('propertyId_1');
      console.log('✅ Dropped propertyId_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️ propertyId_1 index not found (already removed)');
      } else {
        console.log('⚠️ Error dropping propertyId index:', error.message);
      }
    }

    // Create new indexes for the updated treasure model
    console.log('\n🏗️ Creating new indexes...');
    
    // Index on cells for fast treasure lookup
    try {
      await treasuresCollection.createIndex({ cells: 1 });
      console.log('✅ Created cells_1 index');
    } catch (error) {
      console.log('ℹ️ cells_1 index already exists');
    }

    // Index on active/redeemed status for fast filtering
    try {
      await treasuresCollection.createIndex({ isActive: 1, isRedeemed: 1 });
      console.log('✅ Created isActive_1_isRedeemed_1 index');
    } catch (error) {
      console.log('ℹ️ isActive_1_isRedeemed_1 index already exists');
    }

    // Index on expiration date for cleanup
    try {
      await treasuresCollection.createIndex({ expiresAt: 1 });
      console.log('✅ Created expiresAt_1 index');
    } catch (error) {
      console.log('ℹ️ expiresAt_1 index already exists');
    }

    // Show final indexes
    console.log('\n📋 Final indexes:');
    const finalIndexes = await treasuresCollection.indexes();
    finalIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Clean up any existing treasures with null propertyId (if any)
    console.log('\n🧹 Cleaning up existing data...');
    const deleteResult = await treasuresCollection.deleteMany({ 
      $or: [
        { propertyId: { $exists: true } },
        { propertyId: null }
      ]
    });
    
    if (deleteResult.deletedCount > 0) {
      console.log(`✅ Removed ${deleteResult.deletedCount} old treasure records`);
    } else {
      console.log('ℹ️ No old treasure records to clean up');
    }

    console.log('\n🎉 Treasure indexes fixed successfully!');
    console.log('You can now create treasures with the new cell-based system.');

  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run the fix
fixTreasureIndexes(); 