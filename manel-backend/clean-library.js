import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanLibrary() {
  console.log('🧹 Starting Library Cleanup...');

  try {
    // 1. Get all resources
    const resources = await prisma.libraryResource.findMany();
    console.log(`Found ${resources.length} resources in the library.`);

    if (resources.length === 0) {
      console.log('Library is already clean.');
      return;
    }

    // 2. Delete them
    const deleteResult = await prisma.libraryResource.deleteMany();
    
    console.log(`✅ Successfully deleted ${deleteResult.count} resources from the database.`);
    console.log('Note: Files on Google Drive or Cloudinary were not physically deleted by this script, but they are no longer linked to the app.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanLibrary();
