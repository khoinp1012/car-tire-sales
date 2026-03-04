/**
 * Seed Permission Configuration
 * 
 * This script seeds the default permission configuration into the database.
 * Run this once during initial setup.
 * 
 * Usage: npx ts-node utils/seedPermissions.ts
 */

import { databases, DATABASE_ID, ID } from '../constants/appwrite';
import { DEFAULT_PERMISSION_CONFIG } from '../config/permissions.config';
import { Logger } from './logger';

const PERMISSION_CONFIG_COLLECTION_ID = 'permission_config';

async function seedPermissionConfig() {
    try {
        Logger.log('🚀 Seeding permission configuration...');

        // Check if there's already an active configuration
        const existing = await databases.listDocuments(
            DATABASE_ID,
            PERMISSION_CONFIG_COLLECTION_ID
        );

        if (existing.documents.length > 0) {
            Logger.log('⚠️  Warning: Permission configuration already exists!');
            Logger.log(`   Found ${existing.documents.length} document(s).`);
            Logger.log('   Deactivating all existing configurations...');

            // Deactivate all existing configs
            for (const doc of existing.documents) {
                await databases.updateDocument(
                    DATABASE_ID,
                    PERMISSION_CONFIG_COLLECTION_ID,
                    doc.$id,
                    { isActive: false }
                );
            }
        }

        // Create new active configuration
        Logger.log('📝 Creating new permission configuration...');

        const doc = await databases.createDocument(
            DATABASE_ID,
            PERMISSION_CONFIG_COLLECTION_ID,
            ID.unique(),
            {
                version: DEFAULT_PERMISSION_CONFIG.version,
                isActive: true,
                roles: JSON.stringify(DEFAULT_PERMISSION_CONFIG.roles),
                collectionPermissions: JSON.stringify(DEFAULT_PERMISSION_CONFIG.collectionPermissions),
                rowPermissions: JSON.stringify(DEFAULT_PERMISSION_CONFIG.rowPermissions),
            }
        );

        Logger.log('✅ Permission configuration seeded successfully!');
        Logger.log(`   Document ID: ${doc.$id}`);
        Logger.log(`   Version: ${doc.version}`);
        Logger.log('');
        Logger.log('🎉 Setup complete! Your permission system is ready to use.');

    } catch (error: any) {
        Logger.error('❌ Error seeding permission configuration:', error);

        if (error.code === 404) {
            Logger.error('');
            Logger.error('💡 The permission_config collection does not exist.');
            Logger.error('   Please run: ./seed-permissions.sh first');
        }

        process.exit(1);
    }
}

// Run the seed function
seedPermissionConfig();
