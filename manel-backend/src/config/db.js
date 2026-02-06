import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ?
    ['query', 'error', 'warn'] : 
    ['error'],
});

//connect to the database

const connectDB = async (retries = 5) => {
    while (retries > 0) {
        try {
            await prisma.$connect();
            console.log('✅ Database connected successfully');
            return;
        } catch (error) {
            retries--;
            console.error(`❌ Error connecting to the database (${retries} retries left):`, error.message);
            if (retries === 0) {
                console.error('💥 Could not connect to database after several attempts.');
                process.exit(1);
            }
            // Wait 2 seconds before retrying
            await new Promise(res => setTimeout(res, 2000));
        }
    }
}
//disconnect from the database

const disconnectDB = async () => {
    try {
    await prisma.$disconnect();
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('Database disconnection failed:', error.message);
  }
}

export { prisma, connectDB, disconnectDB }; 