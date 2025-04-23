# Testing Utilities for Multi-Level Layout

## Database Seed Script

The `seed-test-data.ts` script creates test data in your database for testing the multi-level layout feature, including:

- A test user
- A chat conversation
- Initial messages
- Multiple threads
- Thread messages for each thread

### Prerequisites

Make sure you have installed the necessary dependencies:

```bash
npm install uuid postgres drizzle-orm @types/uuid ts-node
```

### Environment Setup

Ensure your database connection string is set in your environment variables:

```bash
export DATABASE_URL="postgres://username:password@localhost:5432/your_database"
```

Or add it to your `.env` file:

```
DATABASE_URL="postgres://username:password@localhost:5432/your_database"
```

### Running the Script

Execute the script with:

```bash
npx ts-node scripts/seed-test-data.ts
```

The script will:

1. Create a test user with email `test@example.com` (if it doesn't exist)
2. Create a test chat with initial messages
3. Create 3 test threads with different statuses
4. Create messages in each thread
5. Output the IDs of the created entities for reference

### Using the Test Data

After running the script, you can:

1. Log in to the application as `test@example.com` (or use your authentication system to access this user)
2. Navigate to the chat conversation
3. From there, you should see the threads and be able to test the multi-level layout FIFO behavior

### Cleaning Up

To remove the test data when you're done testing, you can manually delete it from your database, or create a cleanup script.

## Troubleshooting

If you encounter any issues:

- Verify your database connection string is correct
- Check for any errors in the console output
- Ensure your schema matches what's expected in the script
- If necessary, modify the script to match your specific database schema
