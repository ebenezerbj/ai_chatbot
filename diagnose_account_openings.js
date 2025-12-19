// Diagnostic script to check account_openings table and database connection
const { executeQuery } = require('./dist/database');

async function diagnose() {
  try {
    console.log('=== Account Openings Database Diagnostic ===\n');
    
    // Step 1: Check if table exists
    console.log('1. Checking if account_openings table exists...');
    try {
      const tableCheck = await executeQuery(
        "SHOW TABLES LIKE 'account_openings'",
        []
      );
      
      if (tableCheck.length === 0) {
        console.log('   ✗ Table does NOT exist!');
        console.log('   → Run: node create_account_openings_table.js\n');
        return;
      } else {
        console.log('   ✓ Table exists\n');
      }
    } catch (error) {
      console.log('   ✗ Error checking table:', error.message);
      return;
    }

    // Step 2: Check table structure
    console.log('2. Checking table structure...');
    try {
      const columns = await executeQuery('DESCRIBE account_openings', []);
      console.log(`   ✓ Table has ${columns.length} columns:`);
      columns.forEach(col => {
        const nullable = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.Default ? `DEFAULT ${col.Default}` : '';
        console.log(`      - ${col.Field}: ${col.Type} ${nullable} ${defaultVal}`);
      });
      console.log('');
    } catch (error) {
      console.log('   ✗ Error checking structure:', error.message);
    }

    // Step 3: Check if we can insert a test record
    console.log('3. Testing INSERT operation...');
    try {
      const testSQL = `
        INSERT INTO account_openings (
          session_id, ip_address, user_agent,
          full_name, date_of_birth, gender, marital_status,
          phone_number, email, residential_address, digital_address, postal_address,
          ghana_card_number,
          occupation, employer_name, monthly_income, source_of_funds,
          account_type, mode_of_operation, initial_deposit,
          next_of_kin_name, next_of_kin_relationship, next_of_kin_phone,
          specimen_signature_acknowledged, customer_declaration,
          terms_accepted, data_processing_consent,
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
      `;
      
      const testValues = [
        'test_session',
        '127.0.0.1',
        'Test Agent',
        'Test User',
        '1990-01-01',
        'Male',
        'Single',
        '0241234567',
        'test@example.com',
        'Test Address',
        'AK-123-4567',
        'P.O. Box 123',
        'GHA-123456789-0',
        'Teacher',
        'Test School',
        3500.00,
        'Salary',
        'Savings',
        'Individual',
        100.00,
        'Test Kin',
        'Sister',
        '0243456789',
        1,
        1,
        1,
        1
      ];
      
      const result = await executeQuery(testSQL, testValues);
      const insertId = result.insertId;
      console.log(`   ✓ Test insert successful! ID: ${insertId}\n`);
      
      // Clean up test record
      await executeQuery('DELETE FROM account_openings WHERE id = ?', [insertId]);
      console.log('   ✓ Test record cleaned up\n');
      
    } catch (error) {
      console.log('   ✗ INSERT failed!');
      console.log('   Error:', error.message);
      console.log('   SQL State:', error.sqlState);
      console.log('   Error Code:', error.code);
      console.log('');
    }

    // Step 4: Count existing records
    console.log('4. Checking existing records...');
    try {
      const countResult = await executeQuery(
        'SELECT COUNT(*) as count FROM account_openings',
        []
      );
      console.log(`   ✓ Total records: ${countResult[0].count}\n`);
    } catch (error) {
      console.log('   ✗ Error counting records:', error.message);
    }

    console.log('=== Diagnostic Complete ===');
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    process.exit(0);
  }
}

diagnose();
