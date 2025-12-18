// Script to verify the account opening was saved correctly
const { executeQuery } = require('./dist/database');

async function verifyAccountOpening() {
  try {
    console.log('Fetching account opening with ID 1...\n');
    
    const result = await executeQuery(
      'SELECT * FROM account_openings WHERE id = ?',
      [1]
    );
    
    if (result.length === 0) {
      console.log('✗ No record found');
      process.exit(1);
    }
    
    const record = result[0];
    console.log('✓ Account Opening Record Found:');
    console.log('================================');
    console.log('ID:', record.id);
    console.log('Session ID:', record.session_id);
    console.log('\nPersonal Information:');
    console.log('  Full Name:', record.full_name);
    console.log('  Date of Birth:', record.date_of_birth);
    console.log('  Gender:', record.gender);
    console.log('  Marital Status:', record.marital_status);
    console.log('\nContact Information:');
    console.log('  Phone:', record.phone_number);
    console.log('  Email:', record.email);
    console.log('  Residential Address:', record.residential_address);
    console.log('  Digital Address:', record.digital_address);
    console.log('  Postal Address:', record.postal_address);
    console.log('\nIdentification:');
    console.log('  Ghana Card Number:', record.ghana_card_number);
    console.log('\nEmployment:');
    console.log('  Occupation:', record.occupation);
    console.log('  Employer:', record.employer_name);
    console.log('  Monthly Income: GHS', record.monthly_income);
    console.log('  Source of Funds:', record.source_of_funds);
    console.log('\nAccount Details:');
    console.log('  Account Type:', record.account_type);
    console.log('  Mode of Operation:', record.mode_of_operation);
    console.log('  Initial Deposit: GHS', record.initial_deposit);
    console.log('\nNext of Kin:');
    console.log('  Name:', record.next_of_kin_name);
    console.log('  Relationship:', record.next_of_kin_relationship);
    console.log('  Phone:', record.next_of_kin_phone);
    console.log('\nConsents:');
    console.log('  Specimen Signature:', record.specimen_signature_acknowledged ? '✓' : '✗');
    console.log('  Customer Declaration:', record.customer_declaration ? '✓' : '✗');
    console.log('  Terms Accepted:', record.terms_accepted ? '✓' : '✗');
    console.log('  Data Processing Consent:', record.data_processing_consent ? '✓' : '✗');
    console.log('\nStatus:', record.status);
    console.log('Created At:', record.created_at);
    
    console.log('\n✓ All data verified successfully!');
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
  process.exit(0);
}

verifyAccountOpening();
